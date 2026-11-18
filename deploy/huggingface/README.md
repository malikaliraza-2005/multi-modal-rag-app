---
title: Asterism API
# ⁂, the mark this project is named for, is punctuation rather than an emoji —
# the Hub validates this field against \p{Extended_Pictographic} and rejects it.
emoji: 🌌
colorFrom: gray
colorTo: blue
sdk: gradio
app_file: app.py
python_version: "3.12.12"
pinned: false
short_description: Multimodal document RAG — text, figures and tables
---

# Asterism API

The backend for [Asterism](https://github.com/malikaliraza-2005/multi-modal-rag-app):
it indexes a document's text, figures and tables, and answers questions about it
with citations back to the page, slide or sheet.

This Space serves the API only. The interface is a Next.js app deployed
separately, which talks to this Space over HTTPS.

- `/docs` — interactive API reference
- `/health` — liveness check

## Why Gradio, on ZeroGPU

Spaces gated *compute*, not SDKs: both Gradio and Docker Spaces on CPU Basic
need a PRO subscription. What is still free for a personal account is up to two
Gradio Spaces on **ZeroGPU** — so that is the hardware this Space must be set
to. Choosing CPU Basic hits the paywall no matter which SDK is selected.

The Gradio runtime installs `packages.txt` with apt and `requirements.txt` with
pip, then runs `app.py` — everything the Dockerfile was doing, minus the
container. `app.py` starts the FastAPI app; Gradio only renders the page you are
reading.

ZeroGPU allocates a GPU per call to a `@spaces.GPU` function. This API has none:
it embeds on CPU, and its heavy lifting is Groq and Gemini over HTTP. So it
holds a ZeroGPU slot without ever drawing GPU time or spending the daily quota.

## Required secrets

Set these in **Settings → Variables and secrets**:

| Name              | Kind     |                                                    |
| ----------------- | -------- | -------------------------------------------------- |
| `GROQ_API_KEY`    | Secret   | answer generation and table summaries              |
| `GOOGLE_API_KEY`  | Secret   | figure captioning (vision)                         |
| `ALLOWED_ORIGINS` | Variable | the web app's origin, e.g. `https://asterism.vercel.app` |

Without `ALLOWED_ORIGINS` the browser blocks every request from the web app as
a CORS failure, while `curl` keeps working — which makes it look like a
frontend bug rather than a missing variable.

## Optional variables

| Name                  | Default  |                                           |
| --------------------- | -------- | ----------------------------------------- |
| `MAX_UPLOAD_MB`       | `10`     | largest accepted upload                   |
| `MAX_FIGURES_PER_DOC` | `40`     | vision calls one document may cost        |
| `UPLOADS_PER_HOUR`    | `10`     | documents per visitor; `0` disables       |
| `STORAGE_ROOT`        | in-Space | local cache location                      |
| `CHROMA_DIR`          | in-Space | local cache location                      |

## Storage

This Space's disk is wiped on every rebuild and every wake, so it cannot be
where documents live. Set these two and they are kept in a private dataset repo
instead — free, and included in a Hub account's 100 GB of private storage:

| Name              | Kind   |                                                  |
| ----------------- | ------ | ------------------------------------------------ |
| `HF_DATASET_REPO` | Secret | e.g. `your-name/asterism-store`; created on boot |
| `HF_TOKEN`        | Secret | an access token with **write** permission        |

Uploads, records, previews and the chunks each document was indexed from are
committed there once indexing succeeds, and pulled back on demand. The Chroma
index is deliberately not stored — it is rebuilt from the chunks on the first
query after a restart, which costs CPU rather than another day's vision quota.

Leave both unset and the Space still runs, against local disk alone — with
everything lost on restart, as before. `STORAGE_ROOT` and `CHROMA_DIR` only
move the cache; they are not what makes storage durable.

## First build

Slow — it installs poppler and tesseract with apt, then roughly 2 GB of Python
dependencies, then downloads the layout and embedding models on the first
request. Later pushes reuse the cache.
