import os
import re
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException, Query, UploadFile, File
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from . import filetypes, limits, store
from .config import MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, UPLOADS_PER_HOUR
from .pipeline import process_document, load_vector_store
from .rag import run_query
from .vectorstore import delete_collection

# Preview figures are written by us, one directory per document — but the name
# still arrives from the URL, so it is matched rather than trusted.
_FIGURE_NAME = re.compile(r"^fig-\d{3}\.jpg$")

# The anonymous library id the browser generates and keeps in localStorage.
# Opaque to the server: it only ever compares it, never interprets it.
_LIBRARY_ID = re.compile(r"^[A-Za-z0-9_-]{16,64}$")

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
).split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Touching the embeddings singleton here loads sentence-transformers at
    # startup instead of making the first query pay for it.
    from .vectorstore import _embeddings

    store.purge_orphans()
    await run_in_threadpool(_embeddings.embed_query, "warmup")
    yield


app = FastAPI(title="Asterism RAG API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


def require_library(
    x_library_id: str | None = Header(default=None),
    library: str | None = Query(default=None),
) -> str:
    """Identify the caller's library, without identifying the caller.

    There are no accounts, so this is the only thing separating one visitor's
    documents from another's. It is unguessable and browser-local, which is
    enough to stop strangers reading each other's uploads — but it is a
    partition, not an authenticator, and anyone holding the value holds the
    library.

    The header is the normal path. The query parameter exists because the
    viewer loads the original file and its figures through `<img src>` and
    pdf.js, neither of which can attach a header — so those URLs carry the id
    instead. It never appears in a page URL, so sharing a link to a document
    does not hand over the library.
    """
    candidate = x_library_id or library
    if not candidate or not _LIBRARY_ID.match(candidate):
        raise HTTPException(
            status_code=400,
            detail="Missing or malformed library id",
        )
    return candidate


def _require_record(doc_id: str, library_id: str) -> dict:
    record = store.get_record(doc_id)
    # 404 rather than 403 for someone else's document: a distinct status would
    # confirm that a given id exists, which is a probe worth not answering.
    if record is None or not store.owns(record, library_id):
        raise HTTPException(status_code=404, detail="Document not found")
    return record


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/filetypes")
def list_filetypes():
    """So the upload control's `accept` filter cannot drift from the guard above."""
    return {
        "extensions": list(filetypes.SUPPORTED_EXTENSIONS),
        "media_types": sorted({ft.media_type for ft in filetypes.EXTENSIONS.values()}),
        "max_bytes": MAX_UPLOAD_BYTES,
        "uploads_per_hour": UPLOADS_PER_HOUR,
    }


@app.get("/documents")
def list_documents(library: str = Depends(require_library)):
    return store.list_records(library)


@app.get("/documents/{doc_id}")
def get_document(doc_id: str, library: str = Depends(require_library)):
    return _require_record(doc_id, library)


@app.get("/documents/{doc_id}/file")
def get_document_file(doc_id: str, library: str = Depends(require_library)):
    record = _require_record(doc_id, library)
    path = store.source_path(doc_id, record["ext"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="File missing from storage")
    return FileResponse(path, media_type=record["media_type"], filename=record["filename"])


@app.get("/documents/{doc_id}/preview")
def get_document_preview(doc_id: str, library: str = Depends(require_library)):
    """The structural stand-in shown for formats the browser cannot render."""
    _require_record(doc_id, library)
    preview = store.get_preview(doc_id)
    if preview is None:
        raise HTTPException(status_code=404, detail="This document has no preview")
    return preview


@app.get("/documents/{doc_id}/preview/media/{name}")
def get_preview_figure(
    doc_id: str, name: str, library: str = Depends(require_library)
):
    _require_record(doc_id, library)
    if not _FIGURE_NAME.match(name):
        raise HTTPException(status_code=404, detail="No such figure")
    path = store.preview_media_dir(doc_id) / name
    if not path.exists():
        raise HTTPException(status_code=404, detail="No such figure")
    return FileResponse(path, media_type="image/jpeg")


@app.post("/documents", status_code=201)
async def create_document(
    file: UploadFile = File(...), library: str = Depends(require_library)
):
    filename = file.filename or ""
    file_type = filetypes.lookup(filename)
    if file_type is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported: {filetypes.supported_list()}.",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="File is empty")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413, detail=f"File exceeds the {MAX_UPLOAD_MB} MB limit"
        )

    doc_id = store.compute_doc_id(library, data)

    # Your own re-upload costs nothing and is not rationed.
    existing = store.get_record(doc_id)
    if existing is not None and store.owns(existing, library):
        return existing

    retry_after = limits.check_upload(library)
    if retry_after is not None:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Upload limit reached ({UPLOADS_PER_HOUR} documents per hour). "
                f"Try again in {retry_after // 60 + 1} minutes."
            ),
            headers={"Retry-After": str(retry_after)},
        )

    ext = filetypes.extension_of(filename)
    store.stage_source(doc_id, data, ext)

    try:
        stats = await run_in_threadpool(
            process_document,
            str(store.source_path(doc_id, ext)),
            doc_id,
            store.collection_name(doc_id),
            filename,
        )
    except Exception as exc:
        # Leave no half-indexed document behind, and do not charge the visitor
        # a slot for an upload that produced nothing.
        store.delete_files(doc_id)
        limits.release(library)
        raise HTTPException(status_code=500, detail=f"Failed to index document: {exc}") from exc

    return store.save_record(doc_id, library, filename, ext, len(data), stats)


@app.post("/documents/{doc_id}/query")
async def query_document(
    doc_id: str, body: QueryRequest, library: str = Depends(require_library)
):
    _require_record(doc_id, library)

    def _run():
        db = load_vector_store(store.collection_name(doc_id))
        return run_query(db, body.question)

    try:
        return await run_in_threadpool(_run)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Query failed: {exc}") from exc


@app.delete("/documents/{doc_id}", status_code=204)
async def delete_document(doc_id: str, library: str = Depends(require_library)):
    _require_record(doc_id, library)
    await run_in_threadpool(delete_collection, store.collection_name(doc_id))
    store.delete_files(doc_id)
    return None
