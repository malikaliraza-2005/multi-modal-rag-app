"""Content-addressed document registry.

The filesystem is the source of truth — no database. A document's id is the hash
of its bytes, which makes ingestion idempotent: re-uploading the same file finds
an existing record instead of paying for another vision-model pass.

Layout under `storage/`:

    documents/<id><ext>    the original upload, served back to the viewer
    documents/<id>.json    its record
    previews/<id>.json     structural preview, for formats browsers cannot open
    previews/<id>/*.jpg    that preview's figures
    chunks/<id>.jsonl      what it was indexed from, to rebuild the collection

When `api/remote_store.py` is configured that filesystem is a cache in front of
a Hub dataset repo, which is what actually survives a Space restart. The same
paths are used on both sides, so the only difference is that a read which misses
locally goes and fetches. Writes stay local-first and are mirrored in one commit
once the document is known to be good — see `save_record`.
"""

import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

from . import remote_store
from .config import CHUNK_DIR, PREVIEW_DIR, STORAGE_DIR

# Records written before the app accepted anything but PDFs carry none of the
# format fields. Fill them in on read so old and new records look alike.
_LEGACY_DEFAULTS = {
    "ext": ".pdf",
    "kind": "pdf",
    "locator": "page",
    "media_type": "application/pdf",
    "has_preview": False,
    "image_failed_count": 0,
}


def compute_doc_id(library_id: str, data: bytes) -> str:
    """Content hash, salted by the library it belongs to.

    Two visitors uploading the same file get two documents. That costs a second
    indexing pass, and it is the right trade: a bare content hash would hand one
    visitor another's already-indexed copy, and would let anyone test whether a
    given file had been uploaded by guessing its id.

    Re-uploading your own file is still a no-op, which is the property worth
    keeping.
    """
    return hashlib.sha256(library_id.encode("utf-8") + b"\0" + data).hexdigest()[:16]


def collection_name(doc_id: str) -> str:
    return f"doc_{doc_id}"


def source_path(doc_id: str, ext: str) -> Path:
    return STORAGE_DIR / f"{doc_id}{ext}"


def _record_path(doc_id: str) -> Path:
    return STORAGE_DIR / f"{doc_id}.json"


def _preview_path(doc_id: str) -> Path:
    return PREVIEW_DIR / f"{doc_id}.json"


def preview_media_dir(doc_id: str) -> Path:
    return PREVIEW_DIR / doc_id


def chunks_path(doc_id: str) -> Path:
    return CHUNK_DIR / f"{doc_id}.jsonl"


# Where each of those lives in the dataset repo. The repo mirrors the local
# layout, so this is only ever "the path, relative, with forward slashes".
def _remote(path: Path) -> str:
    for root, prefix in ((STORAGE_DIR, "documents"), (PREVIEW_DIR, "previews"), (CHUNK_DIR, "chunks")):
        try:
            return f"{prefix}/{path.relative_to(root).as_posix()}"
        except ValueError:
            continue
    raise ValueError(f"{path} is not under a known storage root")


def _ensure_local(path: Path) -> bool:
    """Whether `path` is readable, fetching it from the repo if it is not.

    Every blob is pulled the first time it is asked for rather than at startup,
    because a woken Space would otherwise download every document anyone had
    ever uploaded before it could answer a single request.
    """
    if path.exists():
        return True
    return remote_store.pull(_remote(path), path)


def stage_source(doc_id: str, data: bytes, ext: str) -> Path:
    """Write the upload to storage before indexing, so the viewer can load it."""
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    path = source_path(doc_id, ext)
    path.write_bytes(data)
    return path


def ensure_source(doc_id: str, ext: str) -> Path | None:
    """The original upload, fetched back from the repo if this instance has
    never served it. None if it is genuinely gone."""
    path = source_path(doc_id, ext)
    return path if _ensure_local(path) else None


def preview_figure(doc_id: str, name: str) -> Path | None:
    """One figure from a document's preview. `name` is matched against a strict
    pattern by the caller before it reaches here."""
    path = preview_media_dir(doc_id) / name
    return path if _ensure_local(path) else None


def ensure_chunks(doc_id: str) -> Path | None:
    """The chunks a document was indexed from, for rebuilding its collection."""
    path = chunks_path(doc_id)
    return path if _ensure_local(path) else None


def save_preview(doc_id: str, preview: dict) -> None:
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    _preview_path(doc_id).write_text(json.dumps(preview), encoding="utf-8")


def get_preview(doc_id: str) -> dict | None:
    path = _preview_path(doc_id)
    if not _ensure_local(path):
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def save_record(
    doc_id: str, library_id: str, filename: str, ext: str, size: int, stats: dict
) -> dict:
    record = {
        "doc_id": doc_id,
        "library_id": library_id,
        "filename": filename,
        "ext": ext,
        "size": size,
        "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        **stats,
    }
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    _record_path(doc_id).write_text(json.dumps(record, indent=2), encoding="utf-8")
    _publish(doc_id, ext, filename)
    return record


def _publish(doc_id: str, ext: str, filename: str) -> None:
    """Mirror a finished document to the dataset repo, as a single commit.

    This runs from `save_record` rather than from each individual write because
    the record is the point at which a document is known to be complete —
    indexing has succeeded and every file it produced is on disk. An ingest that
    dies halfway therefore leaves local scratch and nothing in the repo, which
    is the same invariant `purge_orphans` already relies on.
    """
    if not remote_store.enabled():
        return

    files = [
        (source_path(doc_id, ext), _remote(source_path(doc_id, ext))),
        (_record_path(doc_id), _remote(_record_path(doc_id))),
        (_preview_path(doc_id), _remote(_preview_path(doc_id))),
        (chunks_path(doc_id), _remote(chunks_path(doc_id))),
    ]
    files += [
        (figure, _remote(figure))
        for figure in sorted(preview_media_dir(doc_id).glob("*.jpg"))
    ]
    remote_store.push(files, f"Add {filename}")


def get_record(doc_id: str) -> dict | None:
    path = _record_path(doc_id)
    if not _ensure_local(path):
        return None
    return {**_LEGACY_DEFAULTS, **json.loads(path.read_text(encoding="utf-8"))}


def hydrate() -> bool:
    """Pull the record index at startup so `list_records` is correct.

    Returns whether the local view can be trusted to be complete — `False` means
    the repo could not be reached, and the caller should leave the cache alone
    rather than tidy it against a listing it knows is partial.
    """
    return remote_store.hydrate_records(STORAGE_DIR)


def list_records(library_id: str) -> list[dict]:
    """Only this library's documents.

    A record written before libraries existed has no owner, so it matches no
    one and stays hidden. Its files are left on disk untouched.
    """
    if not STORAGE_DIR.exists():
        return []
    records = [
        {**_LEGACY_DEFAULTS, **json.loads(p.read_text(encoding="utf-8"))}
        for p in STORAGE_DIR.glob("*.json")
    ]
    mine = [r for r in records if r.get("library_id") == library_id]
    return sorted(mine, key=lambda r: r["created_at"], reverse=True)


def owns(record: dict, library_id: str) -> bool:
    return record.get("library_id") == library_id


def delete_files(doc_id: str) -> None:
    # The extension is not knowable once the record is gone, so sweep by stem.
    for path in STORAGE_DIR.glob(f"{doc_id}.*"):
        path.unlink(missing_ok=True)
    _preview_path(doc_id).unlink(missing_ok=True)
    chunks_path(doc_id).unlink(missing_ok=True)
    shutil.rmtree(preview_media_dir(doc_id), ignore_errors=True)
    remote_store.remove_document(doc_id)


def purge_orphans() -> int:
    """Drop uploads staged for an ingest that never produced a record.

    Indexing takes minutes, so it will sometimes be interrupted by a restart.
    A staged file without a record is invisible to the app but still on disk.
    """
    if not STORAGE_DIR.exists():
        return 0
    removed = 0
    for path in STORAGE_DIR.iterdir():
        if not path.is_file() or path.suffix.lower() == ".json":
            continue
        if not _record_path(path.stem).exists():
            path.unlink(missing_ok=True)
            removed += 1
    if PREVIEW_DIR.exists():
        for path in PREVIEW_DIR.iterdir():
            stem = path.stem if path.is_file() else path.name
            if _record_path(stem).exists():
                continue
            if path.is_dir():
                shutil.rmtree(path, ignore_errors=True)
            else:
                path.unlink(missing_ok=True)
    if CHUNK_DIR.exists():
        for path in CHUNK_DIR.glob("*.jsonl"):
            if not _record_path(path.stem).exists():
                path.unlink(missing_ok=True)
    return removed
