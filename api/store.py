"""Content-addressed document registry.

The filesystem is the source of truth — no database. A document's id is the hash
of its bytes, which makes ingestion idempotent: re-uploading the same file finds
an existing record instead of paying for another vision-model pass.

Layout under `storage/`:

    documents/<id><ext>    the original upload, served back to the viewer
    documents/<id>.json    its record
    previews/<id>.json     structural preview, for formats browsers cannot open
    previews/<id>/*.jpg    that preview's figures
"""

import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

from .config import PREVIEW_DIR, STORAGE_DIR

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


def stage_source(doc_id: str, data: bytes, ext: str) -> Path:
    """Write the upload to storage before indexing, so the viewer can load it."""
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    path = source_path(doc_id, ext)
    path.write_bytes(data)
    return path


def save_preview(doc_id: str, preview: dict) -> None:
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    _preview_path(doc_id).write_text(json.dumps(preview), encoding="utf-8")


def get_preview(doc_id: str) -> dict | None:
    path = _preview_path(doc_id)
    if not path.exists():
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
    return record


def get_record(doc_id: str) -> dict | None:
    path = _record_path(doc_id)
    if not path.exists():
        return None
    return {**_LEGACY_DEFAULTS, **json.loads(path.read_text(encoding="utf-8"))}


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
    shutil.rmtree(preview_media_dir(doc_id), ignore_errors=True)


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
    return removed
