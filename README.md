# Asterism — multimodal document RAG

Ask questions of a document and get answers grounded in its **text, figures and
tables**. Figures are captioned by a vision model and tables are described from
their HTML, so all three modalities are searchable in one embedding space.

Answers cite where they came from, and clicking a citation jumps the viewer to
that page, slide or sheet.

> An *asterism* is ⁂, the typographic mark that divides sections of a text —
> and, in astronomy, a shape picked out of scattered stars. Three points, one
> per modality. There is no account system and nothing to pay for: it runs on
> your machine against your own API keys.

```
├── api/    FastAPI service — parsing, summarisation, embedding, retrieval
└── web/    Next.js — landing page, library, and the document workspace
```

| Route      |                                                     |
| ---------- | --------------------------------------------------- |
| `/`        | landing page — what it does, no sign-in anywhere     |
| `/library` | the app: upload, and the list of indexed documents   |
| `/d/{id}`  | workspace — viewer beside the conversation           |

## Supported formats

| Kind         | Extensions                                                    | Cites   |
| ------------ | ------------------------------------------------------------- | ------- |
| PDF          | `pdf`                                                          | page    |
| Word         | `docx` `doc` `odt` `rtf`                                       | page    |
| Presentation | `pptx` `ppt`                                                   | slide   |
| Spreadsheet  | `xlsx` `xls` `csv` `tsv`                                       | sheet   |
| Image        | `png` `jpg` `jpeg` `webp` `gif` `bmp` `tif` `tiff` `heic` `heif` | image   |
| Text, markup | `txt` `md` `rst` `html` `htm` `xml` `epub`                     | section |
| Mail         | `eml` `msg`                                                    | message |

`doc` and `ppt` — the pre-2007 binary formats — are converted by LibreOffice, so
they need `soffice` on `PATH`. Everything else is read in-process.
`api/filetypes.py` is the single registry; adding a format starts there.

## How it works

```
file ─ unstructured ─┬─ text chunks ──────────────┐
                     ├─ figures → Gemini caption ─┤─→ MiniLM-384 ─→ Chroma
                     └─ tables  → LLM summary ────┘    (one collection
                                                        per document)
question ─→ cosine top-5 ─→ context + prompt ─→ Groq ─→ answer + citations
```

Each format gets its own partitioner (`api/loaders.py`), but they converge on
one shape, so summarisation, embedding and retrieval are format-blind.

Two places need extra work beyond what `unstructured` gives:

- **Office pictures.** The `docx`/`pptx` partitioners drop embedded images
  entirely. `api/media.py` reads them straight out of the zip container instead,
  deduplicates repeats (a logo on every slide is one figure, not fifty vision
  calls), and maps each one to the slide that references it.
- **Viewing.** A browser renders a PDF and an image but has no idea what a
  `.docx` is. Rather than shipping a converter, `api/preview.py` keeps the
  structure parsed at ingest time — same reading order, same numbering the
  citations use — and the viewer renders that.

Every figure, whatever its source format, is normalised to a bounded JPEG before
the vision call. That is what makes HEIC, WebP, animated GIF and 12 MP phone
photos all work.

Each document is indexed into **its own Chroma collection**, keyed by a hash of
the file's bytes. Two consequences:

- Retrieval can never surface content from a different document.
- Re-uploading the same file is a no-op that returns the existing index instead
  of paying for another vision pass. (To genuinely re-index, delete it first.)

## Prerequisites

- Python 3.11+ and Node.js 20.9+
- **poppler** on `PATH` — `unstructured`'s `hi_res` strategy shells out to it
  for page rasterisation. On Windows, install
  [poppler-windows](https://github.com/oschwartz10612/poppler-windows/releases)
  and add its `bin/` to `PATH`; on macOS `brew install poppler`.
- **tesseract** on `PATH` for OCR over PDFs and images. Without it an uploaded
  image still works — it is described by the vision model — but no text is
  transcribed from it.
- API keys for [Groq](https://console.groq.com) and
  [Google AI Studio](https://aistudio.google.com/apikey).

## Setup

```bash
cp .env.example .env      # then fill in GROQ_API_KEY and GOOGLE_API_KEY

python -m venv venv
venv/Scripts/pip install -r api/requirements.txt   # venv/bin/pip on macOS/Linux

npm install               # root, for the combined dev script
npm install --prefix web
```

## Run

```bash
npm run dev               # API on :8000, web on :3000
```

Or separately:

```bash
venv/Scripts/python -m uvicorn api.server:app --reload --port 8000
npm --prefix web run dev
```

Open http://localhost:3000.

> The first query after boot is fast, but the **first upload is slow** — for
> PDFs and images `hi_res` runs a layout-detection model over every page, and
> every format then makes one vision call per figure. A 9-page paper takes
> ~90 s; a long PDF or a picture-heavy deck can take several minutes. Office
> and text formats skip layout detection, so they are limited by their figure
> count alone.
>
> Embedded figures are capped at 40 per Office document; beyond that they are
> logged and skipped rather than silently billed for.

## API

| Method   | Route                                  |                                             |
| -------- | -------------------------------------- | ------------------------------------------- |
| `GET`    | `/filetypes`                           | the upload allowlist and size cap           |
| `POST`   | `/documents`                           | multipart upload; indexes if new            |
| `GET`    | `/documents`                           | list indexed documents                      |
| `GET`    | `/documents/{id}`                      | one document's record                       |
| `GET`    | `/documents/{id}/file`                 | the original upload, for the viewer         |
| `GET`    | `/documents/{id}/preview`              | structural preview, for non-native formats  |
| `GET`    | `/documents/{id}/preview/media/{name}` | one figure from that preview                |
| `POST`   | `/documents/{id}/query`                | `{question}` → `{answer, sources[]}`        |
| `DELETE` | `/documents/{id}`                      | drop the collection and the stored files    |

Interactive docs at http://localhost:8000/docs.

## Deploying it publicly

Step-by-step instructions are in **[DEPLOY.md](DEPLOY.md)** — the web app goes
to Vercel, the API to a Hugging Face Space, because 2.3 GB of dependencies and a
writable disk rule out anything serverless.

There is no sign-in, and on a deployed instance every vision call is billed to
**your** keys, not the visitor's. Two things follow.

**Visitors get their own library.** The browser mints a random id on first use
and keeps it in `localStorage`; the API scopes every document route to it. One
visitor cannot list, open, query or delete another's documents, and a document
id is salted with the library, so it cannot be guessed from the file's contents.

It is a partition, not an authenticator — whoever holds the id holds the
library, and clearing site data loses it. That is the honest cost of asking for
nothing. If you need real accounts, this is the seam to put them on.

**Limits bound what one visitor can spend.** All three are env-overridable, and
the defaults suit a public instance; raise them when it is only you.

| Variable              | Default |                                        |
| --------------------- | ------- | -------------------------------------- |
| `MAX_UPLOAD_MB`       | `10`    | largest accepted upload                |
| `MAX_FIGURES_PER_DOC` | `40`    | vision calls one document may cost     |
| `UPLOADS_PER_HOUR`    | `10`    | documents per visitor; `0` disables it  |

The rate limiter is in-process and in-memory: a cost guardrail, not a security
control. Behind more than one worker, each gets its own bucket.

> Mind the **Gemini free tier: 20 vision calls per day, total**. One
> figure-heavy deck exhausts it. A public instance wants a paid key.

### Documents indexed before libraries existed

They have no owner, so they are hidden from every library. Claim them with your
own browser's id — read it from the console with
`localStorage.getItem('asterism:library-id')` — and run:

```bash
venv/Scripts/python scripts/adopt-documents.py <library-id>
```

## Data on disk

| Path                  |                                                     |
| --------------------- | --------------------------------------------------- |
| `storage/documents/`  | the uploads themselves + one JSON record each        |
| `storage/previews/`   | structural previews + their extracted figures        |
| `db/chroma_db/`       | Chroma, one `doc_<hash>` collection per document     |

All are gitignored. Deleting a document through the UI removes its collection
and every file it owns; deleting `storage/` and `db/` resets everything.

## Design notes

`web/src/app/globals.css` holds the entire token layer — colour ramp, radii,
type scale, spacing. Components read from it and never introduce raw hex values
or one-off sizes. A few deliberate constraints:

- **Colour carries meaning, not emphasis.** Primary buttons are neutral ink;
  the single accent hue is reserved for focus, citations and selection.
- **Elevation is borders.** Shadow appears only on genuinely floating layers —
  menus and the viewer toolbar.
- **Answers are prose, not chat bubbles.** Only the question gets a filled
  block, which makes the conversation pane read as a document.

## Known gaps

- **No streaming.** Answers arrive in one response after a visible pause; the
  UI holds a skeleton in the answer's position meanwhile. Upgrading means
  `.stream()` in `api/rag.py`, an SSE route, and appending tokens in
  `chat-pane.tsx`.
- **No conversation memory.** Each question is answered independently, so
  follow-ups that rely on pronouns ("what about it?") will not resolve.
- **Citations link to a page, not to the figure.** Original image data and
  table HTML are dropped at index time, so the source panel shows the retrieved
  text and a page link rather than rendering the figure itself.
- **Word documents cite one page.** `unstructured` reports no page numbers for
  `docx`, because a `.docx` has none until something renders it. Such documents
  are treated as a single unit, so their citations all point at "page 1".
- **The preview is structure, not layout.** For Office and text formats the
  viewer shows reading order, tables and figures — not columns, fonts or
  positioning. It is there to check an answer's source, not to replace Word.
