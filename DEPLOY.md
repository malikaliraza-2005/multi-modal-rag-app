# Deploying Asterism

Two pieces, deployed separately, because they want very different things from a
host.

| | Where | Why |
| --- | --- | --- |
| `web/` | **Vercel** | A Next.js app. This is what Vercel is for. Free. |
| `api/` | **Hugging Face Spaces**, on ZeroGPU | 2.3 GB of Python dependencies, two system binaries, and a model that wants ~2 GB of RAM. Nothing else free will hold it. |

The API cannot go anywhere serverless. Vercel Functions and AWS Lambda cap a
deployment at 250 MB unzipped; torch alone is 535 MB. Nor can it go on the free
container hosts — Render and Koyeb both stop at 512 MB of RAM against a
footprint four times that.

Neither can it rely on a disk. No free tier offers one, so uploads and the index
live in a Hub dataset repo instead; see [Storage](#storage).

**Deploy the API first.** The web app needs its URL, and the API needs the web
app's origin — so the order is: API → web → back to the API to fill in
`ALLOWED_ORIGINS` → turn on the keep-alive so the Space never sleeps.

---

## 1. The API, on Hugging Face Spaces

### Create the Space

At [huggingface.co/new-space](https://huggingface.co/new-space):

- **Name** — `asterism-api`
- **License** — whatever suits you
- **SDK** — **Gradio**, then the **Blank** template
- **Hardware** — **ZeroGPU**
- **Visibility** — Public

> **Pick ZeroGPU, not CPU Basic.** What Spaces put behind a subscription is
> *compute*, not any particular SDK: Gradio and Docker Spaces both need PRO on
> CPU Basic. The tier still free to a personal account is up to **two Gradio
> Spaces on ZeroGPU**, so the hardware setting is what decides whether this
> deploy is free. Choosing CPU Basic paywalls the Space whichever SDK you pick.
>
> ZeroGPU hands a GPU to functions decorated with `@spaces.GPU`. This API has
> none — it embeds on CPU, and Groq and Gemini do the heavy lifting over HTTP —
> so it holds a ZeroGPU slot without ever drawing GPU time or spending the
> daily quota. `api/requirements.txt` includes `spaces` and `app.py` imports it,
> which is how a Space declares itself ZeroGPU-compatible.
>
> Hosting a ZeroGPU Space needs an account **in good standing**: verified email,
> and older than 30 days.
>
> `app.py` starts the FastAPI app; Gradio only renders a status page at `/ui`.
> The repo's `Dockerfile` still works and is kept for any host that takes a
> container — it is simply not what Spaces uses.

### Push the code

A Space is its own git repo, and it wants a layout this project does not use:
`requirements.txt` and `packages.txt` at the root, an `app.py` entry point, and
a README carrying YAML frontmatter that would render as a stray table on
GitHub. A script assembles that:

```bash
sh deploy/huggingface/push.sh https://huggingface.co/spaces/<you>/asterism-api
```

Git will ask for your HF username and, as the password, an access token with
**write** permission from
[huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).

The first build takes a while — apt packages, then roughly 2 GB of Python
dependencies. Watch the **Logs** tab. The layout and embedding models download
on the first request after that, so the very first upload is slower still.

### Set the secrets

**Settings → Variables and secrets:**

| Name | Kind | Value |
| --- | --- | --- |
| `GROQ_API_KEY` | Secret | from [console.groq.com](https://console.groq.com) |
| `GOOGLE_API_KEY` | Secret | from [aistudio.google.com](https://aistudio.google.com/apikey) |
| `HF_DATASET_REPO` | Secret | `<you>/asterism-store` — see [Storage](#storage) |
| `HF_TOKEN` | Secret | a **write** token, same page as the one you push with |
| `ALLOWED_ORIGINS` | Variable | fill in after step 2 |

### Check it

Your Space's direct URL is `https://<you>-asterism-api.hf.space`.

```bash
curl https://<you>-asterism-api.hf.space/health
curl https://<you>-asterism-api.hf.space/filetypes
```

`/docs` in a browser gives the interactive API reference, and the Space's root
redirects there. `/ui` is the Gradio status page.

---

## 2. The web app, on Vercel

Import the GitHub repo at [vercel.com/new](https://vercel.com/new), then — and
this is the step people miss — set:

- **Root Directory** → `web`

Vercel will otherwise look for a Next.js app at the repo root and fail.

Add one environment variable:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_API_BASE` | `https://<you>-asterism-api.hf.space` |

Deploy. Note the URL it gives you, e.g. `https://asterism.vercel.app`.

> `NEXT_PUBLIC_*` variables are compiled into the client bundle, so changing
> this later needs a redeploy, not just a settings save.

---

## 3. Close the loop

Back in the Space's settings, set `ALLOWED_ORIGINS` to the Vercel URL:

```
ALLOWED_ORIGINS=https://asterism.vercel.app
```

Restart the Space. Skip this and every request from the browser fails CORS
while `curl` keeps working — which reads like a frontend bug and is not one.

---

## 4. Stop it sleeping

A free Space sleeps after roughly 48 hours without traffic, and the next
visitor pays for the cold start. Any request resets that timer, so
[`.github/workflows/keep-awake.yml`](.github/workflows/keep-awake.yml) hits
`/health` four times a day and keeps it up.

One thing to set — **Settings → Secrets and variables → Actions → Variables**:

| Name | Value |
| --- | --- |
| `API_BASE` | `https://<you>-asterism-api.hf.space` |

A repository **variable**, not a secret; a Space URL is public anyway.

Then run it once by hand to check it: **Actions → Keep the API awake → Run
workflow**. It is also a free uptime monitor — if the API is genuinely down,
the job fails and GitHub emails you. Cold starts are not mistaken for outages,
because it retries five times over about ten minutes first.

Two things to know:

- **Scheduled runs are delayed under load**, sometimes by a lot. Pinging every
  six hours against a 48-hour timeout leaves room for that; do not tighten the
  schedule to compensate for something that is not a problem.
- **GitHub disables scheduled workflows after 60 days of repository
  inactivity**, and emails you first. Any commit resets it.

If you would rather not use Actions, [cron-job.org](https://cron-job.org) and
UptimeRobot both do the same thing for free against the same `/health` URL.

## Storage

A free Space's disk is wiped on every rebuild and on every wake, so it cannot be
where documents live — without something else, visitors' libraries disappear and
it reads as a bug rather than a tier. Persistent storage in Settings fixes it for
$5/mo, but a **private dataset repo** does the same job for nothing: a Hub
account includes 100 GB of private repository storage, and the Spaces docs name
the Datasets Hub as a supported place to keep Space state.

Set `HF_DATASET_REPO` (e.g. `<you>/asterism-store`) and `HF_TOKEN` in the Space's
secrets. The repo is created on first boot, private — nothing to set up by hand.

What that gets you: once a document finishes indexing, its file, record, preview,
figures and the chunks it was indexed from are written to the repo in a single
commit, and pulled back on demand. The Chroma index is deliberately *not* stored
— it is a mutable sqlite file, and committing it on every write would grow the
repo's history without bound. It is rebuilt instead from the stored chunks on the
first query after a restart, which costs a few seconds of CPU rather than another
day's vision quota.

Leave the two secrets unset and the Space still runs, exactly as before, against
local disk alone — with everything lost on restart. `STORAGE_ROOT` and
`CHROMA_DIR` only relocate the local cache; they are not what makes it durable.

## What free costs you

**The Gemini free tier allows 20 vision calls per day, in total.** One
figure-heavy deck exhausts it for everyone until midnight UTC. Figure
captioning then fails while text and tables keep working, and the app reports
how many figures went undescribed. A public instance realistically wants a paid
Google key.

---

## Tuning the guardrails

The defaults assume strangers are spending your API quota. All are Space
variables:

| Variable | Default | |
| --- | --- | --- |
| `MAX_UPLOAD_MB` | `10` | largest accepted upload |
| `MAX_FIGURES_PER_DOC` | `40` | vision calls one document may cost |
| `UPLOADS_PER_HOUR` | `10` | documents per visitor; `0` disables |
| `ANSWER_MODEL` | `openai/gpt-oss-120b` | Groq retires ids periodically |
| `VISION_MODEL` | `gemini-2.5-flash` | |

---

## Redeploying

```bash
# API
sh deploy/huggingface/push.sh https://huggingface.co/spaces/<you>/asterism-api "What changed"

# Web — Vercel rebuilds on push to main automatically
git push
```

---

## When it goes wrong

**Browser requests fail, `curl` works.** `ALLOWED_ORIGINS` does not match the
web app's origin. It must include the scheme and no trailing slash.

**Vercel build fails, "no Next.js app found".** Root Directory is not `web`.

**Space build fails on a missing system library.** Add the package to
`packages.txt` and push again — that is the file Spaces feeds to apt. A
`libGL.so` or `libgthread` error means exactly this.

**The build is slow.** Expected. Spaces installs the default torch wheel, which
carries CUDA payload this never executes — around 2 GB that a container build
could have avoided. It still fits and still runs; it just takes a while, and
only on builds where the dependency cache misses.

**Uploads 429.** `UPLOADS_PER_HOUR` is doing its job. Raise it, or wait.

**Everything indexes but figures are missing.** Almost always the Gemini daily
quota. The Space logs will show `RESOURCE_EXHAUSTED`.

**A document indexes, then vanishes after a while.** The Space restarted and
`HF_DATASET_REPO` / `HF_TOKEN` are not set, so nothing was written anywhere
durable. See [Storage](#storage). If they *are* set, check the logs for
`Remote store:` — a bad token or a repo the token cannot write to degrades to
local-only deliberately rather than failing the upload, and says so.

**The Space will not start on ZeroGPU.** Hosting one needs a verified email and
an account older than 30 days, and a personal account is capped at two. CPU
Basic is not the fallback — it is the paid tier.

**The first visitor of the day waits a long time.** The keep-alive is not
running. Check that `API_BASE` is set as a repository variable, and that
Actions → Keep the API awake shows recent green runs.
