"""Entry point for the Hugging Face Space.

Spaces charges for *compute*, not for SDKs: Gradio and Docker Spaces alike need
a PRO subscription on CPU Basic. The one tier still free to a personal account
is a Gradio Space on **ZeroGPU**, which is what this deploys to — the hardware
setting matters more than the SDK choice, and picking CPU Basic paywalls the
Space whichever SDK it uses.

The Gradio runtime installs `packages.txt` with apt and `requirements.txt` with
pip, then runs this file — everything the Dockerfile was doing, minus the
container.

The FastAPI app is the payload. Gradio contributes only a page worth looking at
when someone opens the Space, and satisfies the SDK's expectation that its own
library is what got mounted. If it is unavailable the API still serves; the
status page is not worth failing a deploy over.
"""

import os
import socket
import threading

# Before gradio is imported. On Spaces, Gradio defaults to server-side
# rendering, which starts a Node server on $PORT in front of whatever it
# launches. The ZeroGPU trigger below would then take the public port, the
# check further down would find $PORT "already served", and the API would
# never start — every route answering with an empty Gradio page instead. This
# Space renders nothing worth server-rendering, so it is off everywhere.
os.environ["GRADIO_SSR_MODE"] = "false"

import uvicorn

# ZeroGPU hands a GPU to functions decorated with `@spaces.GPU`, and refuses to
# start a Space where it can find none — "No @spaces.GPU function detected
# during startup". This API genuinely has no use for one: it embeds on CPU, and
# the models it calls are Groq's and Google's, over HTTP. So it declares the
# one function ZeroGPU insists on and never calls it, which satisfies the check
# without ever requesting a GPU or spending the daily quota.
#
# Guarded because the package exists on Spaces and nowhere else, and this file
# is also how the API is run locally.
try:
    import spaces

    @spaces.GPU(duration=1)
    def _zerogpu_probe():
        """Never called. Present so ZeroGPU will start the Space."""
        return None

except ImportError:
    spaces = None

from api.server import app as api

PORT = int(os.getenv("PORT", "7860"))

_DESCRIPTION = """
# ⁂ Asterism API

The backend for **Asterism** — it indexes a document's text, figures and
tables, then answers questions about it with citations back to the page, slide
or sheet.

This Space serves the API. The interface is a separate Next.js app that talks
to it over HTTPS.

* **[/docs](/docs)** — interactive API reference
* **[/health](/health)** — liveness check
* **[/filetypes](/filetypes)** — the upload allowlist and current limits

Source: [github.com/malikaliraza-2005/multi-modal-rag-app](https://github.com/malikaliraza-2005/multi-modal-rag-app)
"""

try:
    import gradio as gr

    with gr.Blocks(title="Asterism API", analytics_enabled=False) as status_page:
        gr.Markdown(_DESCRIPTION)

    # Deliberately not mounted at "/". A mount there would sit in front of the
    # whole API, and whether the routes registered earlier still win is a
    # detail of Starlette's matching that is not worth betting a deploy on.
    # "/" already redirects to the docs, so this costs nothing.
    app = gr.mount_gradio_app(api, status_page, path="/ui")
except Exception as exc:  # pragma: no cover - the API matters, the page does not
    print(f"Gradio status page unavailable ({exc}); serving the API alone.")
    app = api
    gr = None


def _report_to_zerogpu() -> None:
    """Tell ZeroGPU this Space is alive, which nothing else here will do.

    ZeroGPU does not look for decorated functions by scanning the module. It
    monkey-patches `gr.Blocks.launch` (see `spaces/zero/gradio.py`) and sends its
    startup report from inside that patch, then restores the original. An app
    that never calls `.launch()` therefore never reports, and the Space is
    stopped with "No @spaces.GPU function detected during startup" — however
    many functions are decorated.

    This app never calls it: the API is the payload and the Spaces runtime
    serves the FastAPI object directly, so the only thing missing is the report
    itself. Launching a throwaway Blocks on a port nobody uses fires the patched
    launch once, which is all ZeroGPU is waiting for. The real API keeps serving
    on $PORT, untouched.

    A throwaway rather than the status page above, because that one is already
    mounted into FastAPI and launching a second server for it would be asking
    for trouble. Ports other than $PORT are unreachable from outside a Space.
    """
    if gr is None or spaces is None or not os.getenv("SPACE_ID"):
        return
    try:
        # Entered as a context manager even though nothing goes inside it:
        # `Blocks.__exit__` is what sets the `exited` flag `launch` reads, and a
        # bare `gr.Blocks()` fails there with "no attribute 'exited'".
        with gr.Blocks(analytics_enabled=False) as trigger:
            pass
        trigger.launch(
            server_name="127.0.0.1",
            server_port=PORT + 1,
            prevent_thread_lock=True,
            share=False,
            quiet=True,
            # Belt and braces with GRADIO_SSR_MODE above: SSR here is what
            # put a Node server on $PORT and kept the API from ever serving.
            ssr_mode=False,
        )
    except Exception as exc:
        # Worth a loud line: the Space is about to be stopped by the platform
        # and the reason will not otherwise appear in these logs.
        print(f"ZeroGPU startup report failed ({exc}); the Space may not stay up.")


_report_to_zerogpu()


def _port_is_free(port: int) -> bool:
    """Whether anything is already listening on `port`.

    Asked by connecting rather than by trying to bind. A bind probe answers a
    subtly different question depending on the platform — with SO_REUSEADDR set
    Windows hands over a port that is already in use, and without it a port in
    TIME_WAIT reads as taken — whereas a refused connection means the same thing
    everywhere.
    """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        probe.settimeout(0.5)
        return probe.connect_ex(("127.0.0.1", port)) != 0


if __name__ == "__main__":
    # Who serves $PORT depends on the host, and getting it wrong fails in two
    # opposite ways — both of which this Space has already produced:
    #
    #   * Serving when the platform is already bound to $PORT dies with
    #     "address already in use". Uvicorn runs lifespan *before* it binds, so
    #     that arrives after a full, healthy-looking startup.
    #   * Not serving when nothing else will leaves the script with nothing to
    #     block on. It returns, and the container exits 0 having served nothing.
    #
    # So ask the port rather than guess from the environment. There is no race
    # worth worrying about: whoever holds $PORT here holds it for the life of
    # the container.
    if _port_is_free(PORT):
        # One worker: each would load its own copy of torch and the layout
        # model, and the upload rate limiter keeps its counters in process
        # memory.
        uvicorn.run(app, host="0.0.0.0", port=PORT, workers=1)
    else:
        # Flushed because this is the only line explaining why the process is
        # sitting there doing nothing, and a buffered log is no use in a Space.
        print(f"Port {PORT} is already served; staying alive for it.", flush=True)
        threading.Event().wait()
