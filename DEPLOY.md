# Deploying Asterism

Two pieces, deployed separately, because they want very different things from a
host.

| | Where | Why |
| --- | --- | --- |
| `web/` | **Vercel** | A Next.js app. This is what Vercel is for. Free. |
| `api/` | **Hugging Face Spaces** | 2.3 GB of Python dependencies, two system binaries, and a model that wants ~2 GB of RAM. Free tier gives 16 GB. |

The API cannot go anywhere serverless. Vercel Functions and AWS Lambda cap a
deployment at 250 MB unzipped; torch alone is 535 MB, and none of them offer the
writable disk that uploads and the Chroma index need.

**Deploy the API first.** The web app needs its URL, and the API needs the web
app's origin — so the order is: API → web → back to the API to fill in
`ALLOWED_ORIGINS`.

---

## 1. The API, on Hugging Face Spaces

### Create the Space

At [huggingface.co/new-space](https://huggingface.co/new-space):

- **Name** — `asterism-api`
- **License** — whatever suits you
- **SDK** — **Docker**, then the **Blank** template
- **Hardware** — CPU basic (free)
- **Visibility** — Public

### Push the code

A Space is its own git repo, and it needs a README with YAML frontmatter that
would render as a stray table on GitHub. So the two repos stay separate, and a
script syncs the files the image needs:

```bash
sh deploy/huggingface/push.sh https://huggingface.co/spaces/<you>/asterism-api
```

Git will ask for your HF username and, as the password, an access token with
**write** permission from
[huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).

The first build takes a while — it installs the dependencies and bakes both
models into the image so that the first real request is not paying for a
400 MB download. Watch the **Logs** tab.

### Set the secrets

**Settings → Variables and secrets:**

| Name | Kind | Value |
| --- | --- | --- |
| `GROQ_API_KEY` | Secret | from [console.groq.com](https://console.groq.com) |
| `GOOGLE_API_KEY` | Secret | from [aistudio.google.com](https://aistudio.google.com/apikey) |
| `ALLOWED_ORIGINS` | Variable | fill in after step 2 |

### Check it

Your Space's direct URL is `https://<you>-asterism-api.hf.space`.

```bash
curl https://<you>-asterism-api.hf.space/health
curl https://<you>-asterism-api.hf.space/filetypes
```

`/docs` in a browser gives the interactive API reference.

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

## What free costs you

**The Space sleeps after ~48 hours idle.** The next visitor waits through a
cold start. Unavoidable on the free tier.

**Storage is not persistent.** Without a volume, the disk is wiped on every
rebuild and on wake — so visitors' libraries disappear. Fine for a demo,
surprising for anyone who came back expecting their documents. To fix it, add
persistent storage in Settings ($5/mo for 20 GB) and set:

```
STORAGE_ROOT=/data/storage
CHROMA_DIR=/data/db/chroma_db
```

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

**Space build runs out of space or time.** The CPU-only torch index in the
Dockerfile is what keeps this under control — if you edited that line, put it
back.

**Uploads 429.** `UPLOADS_PER_HOUR` is doing its job. Raise it, or wait.

**Everything indexes but figures are missing.** Almost always the Gemini daily
quota. The Space logs will show `RESOURCE_EXHAUSTED`.

**A document indexes, then vanishes after a while.** The Space restarted and
storage was not persistent. See above.
