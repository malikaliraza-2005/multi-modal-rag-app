---
title: Asterism API
emoji: ⁂
colorFrom: gray
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
short_description: Multimodal document RAG — text, figures and tables
---

# Asterism API

The backend for [Asterism](https://github.com/malikaliraza-2005/multi-modal-rag-app):
it indexes a document's text, figures and tables, and answers questions about it
with citations back to the page, slide or sheet.

This Space serves the API only. The interface is a Next.js app deployed
separately, which talks to this Space over HTTPS.

Interactive API docs: append `/docs` to this Space's direct URL.

## Required secrets

Set these in **Settings → Variables and secrets**:

| Name              | Kind   |                                                    |
| ----------------- | ------ | -------------------------------------------------- |
| `GROQ_API_KEY`    | Secret | answer generation and table summaries              |
| `GOOGLE_API_KEY`  | Secret | figure captioning (vision)                         |
| `ALLOWED_ORIGINS` | Variable | the web app's origin, e.g. `https://asterism.vercel.app` |

Without `ALLOWED_ORIGINS` the browser will block every request from the web app
as a CORS failure, while `curl` keeps working — which makes it look like a
frontend bug rather than a missing variable.

## Optional variables

| Name                  | Default |                                       |
| --------------------- | ------- | ------------------------------------- |
| `MAX_UPLOAD_MB`       | `10`    | largest accepted upload               |
| `MAX_FIGURES_PER_DOC` | `40`    | vision calls one document may cost    |
| `UPLOADS_PER_HOUR`    | `10`    | documents per visitor; `0` disables   |
| `STORAGE_ROOT`        | in-image | set to `/data/storage` with a volume |
| `CHROMA_DIR`          | in-image | set to `/data/db/chroma_db` with a volume |

## Storage

Without persistent storage this Space's disk is wiped on every rebuild and on
wake from sleep, so uploaded documents and their indexes do not survive. Add
persistent storage in Settings, then set `STORAGE_ROOT` and `CHROMA_DIR` to
paths under `/data` to keep them.
