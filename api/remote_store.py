"""Durable storage on a Hugging Face dataset repo.

A free Space has no persistent disk: its filesystem is wiped on every rebuild
and on every wake, taking uploaded documents and their indexes with it. A free
Hub account, meanwhile, includes 100 GB of private repository storage, and the
Spaces documentation names the Datasets Hub as a supported way to keep state.
So the repo becomes the truth and the local disk becomes a cache.

Two rules keep this honest on git-backed storage:

1. **Everything written here is written once.** Repo history counts against the
   quota, so a file rewritten on every request would grow it without bound.
   Uploads, records, previews and chunk files are written at ingest and only
   ever deleted, which fits.

2. **The Chroma index is never uploaded.** It is a mutable sqlite file, which is
   precisely what rule 1 forbids. `api/vectorstore.py` persists the *chunks*
   instead — the expensive output of ingestion — and re-embeds them on demand.

Configuration is two environment variables, `HF_DATASET_REPO` and `HF_TOKEN`.
With either missing every function here is a no-op and the app runs exactly as
it always has, against local disk alone. That is what keeps `npm run dev`
working without a Hub account, and it is the seam the tests use.
"""

import os
import time
from pathlib import Path

REPO_ID = os.getenv("HF_DATASET_REPO", "").strip()
_TOKEN = os.getenv("HF_TOKEN", "").strip()

# Commits are retried because two visitors finishing an upload at the same
# moment race for the same parent revision and one of them loses. The API is
# fast enough that a couple of short backoffs clear it.
_COMMIT_ATTEMPTS = 4
_COMMIT_BACKOFF = 1.5


def enabled() -> bool:
    return bool(REPO_ID and _TOKEN)


def _api():
    from huggingface_hub import HfApi

    return HfApi(token=_TOKEN)


def ensure_repo() -> None:
    """Create the dataset repo if it is not there yet. Private by default —
    these are visitors' uploads, not a published dataset.

    Runs at startup, so it must not raise: a mistyped token would otherwise take
    the whole API down at boot rather than costing it only its durability. The
    reads and writes below all degrade on their own, so a warning here is enough
    to explain the local-only behaviour that follows.
    """
    if not enabled():
        return
    try:
        _api().create_repo(REPO_ID, repo_type="dataset", private=True, exist_ok=True)
    except Exception as exc:
        print(
            f"Remote store: {REPO_ID} is unreachable ({exc}). "
            "Serving from local disk — uploads will not survive a restart."
        )


def push(files: list[tuple[Path, str]], message: str) -> None:
    """Upload local files as one commit.

    Batched deliberately: a document is a source file, a record, a preview, its
    figures and a chunk file, and committing those separately would turn one
    ingest into six revisions of history.
    """
    if not enabled() or not files:
        return

    from huggingface_hub import CommitOperationAdd

    operations = [
        CommitOperationAdd(path_in_repo=remote, path_or_fileobj=str(local))
        for local, remote in files
        if local.exists()
    ]
    if not operations:
        return
    _commit(operations, message)


def remove_document(doc_id: str) -> None:
    """Delete everything belonging to a document, in one commit.

    Works from a listing rather than from the record, because the record is the
    thing that knows the file extension and it may already be gone — deletion
    also runs on the failure path of an ingest that never produced one.
    """
    if not enabled():
        return

    from huggingface_hub import CommitOperationDelete

    try:
        paths = _api().list_repo_files(REPO_ID, repo_type="dataset")
    except Exception as exc:
        print(f"Remote store: could not list files to delete {doc_id} ({exc}).")
        return

    doomed = [p for p in paths if doc_id in Path(p).name or f"/{doc_id}/" in f"/{p}"]
    if not doomed:
        return
    _commit(
        [CommitOperationDelete(path_in_repo=p) for p in doomed],
        f"Delete {doc_id}",
    )


def _worth_retrying(exc: Exception) -> bool:
    """Whether trying the same commit again could plausibly work.

    A lost race (412) or a busy Hub (429, 5xx) clears on its own. A bad token or
    a missing repo never will, and retrying those would only add ten seconds of
    backoff to an upload that has already succeeded everywhere that matters.
    """
    status = getattr(getattr(exc, "response", None), "status_code", None)
    return status is None or status in (409, 412, 429) or status >= 500


def _commit(operations, message: str) -> None:
    last = None
    for attempt in range(_COMMIT_ATTEMPTS):
        try:
            _api().create_commit(
                repo_id=REPO_ID,
                repo_type="dataset",
                operations=operations,
                commit_message=message,
            )
            return
        except Exception as exc:  # concurrent commits, or the Hub being slow
            last = exc
            if attempt == _COMMIT_ATTEMPTS - 1 or not _worth_retrying(exc):
                break
            time.sleep(_COMMIT_BACKOFF * (attempt + 1))
    # A failed upload must not fail the request: the document is already indexed
    # and on local disk, and it is only the durability that was lost.
    print(f"Remote store: could not commit '{message}' ({last}).")


def pull(remote_path: str, local_path: Path) -> bool:
    """Fetch one file into the local cache. False if the repo does not have it.

    A miss is ordinary rather than exceptional — it is what `get_record` sees
    for a document id that was never uploaded, and what any read sees while the
    store is switched off.
    """
    if not enabled():
        return False
    if local_path.exists():
        return True

    from huggingface_hub import hf_hub_download
    from huggingface_hub.errors import EntryNotFoundError, RepositoryNotFoundError

    try:
        cached = hf_hub_download(
            repo_id=REPO_ID,
            repo_type="dataset",
            filename=remote_path,
            token=_TOKEN,
        )
    except (EntryNotFoundError, RepositoryNotFoundError):
        return False
    except Exception as exc:
        print(f"Remote store: could not fetch {remote_path} ({exc}).")
        return False

    # Copied out of the Hub cache rather than symlinked: everything downstream
    # treats these as ordinary files under STORAGE_ROOT, and the cache is free
    # to evict its own copy.
    local_path.parent.mkdir(parents=True, exist_ok=True)
    local_path.write_bytes(Path(cached).read_bytes())
    return True


def hydrate_records(into: Path) -> bool:
    """Pull every document record at startup.

    Records are the index of what exists: `list_records` answers from a local
    glob, so without this a woken Space would report an empty library and the
    documents would look lost even though they are not. They are a few hundred
    bytes each, so fetching all of them is cheap; the files they describe are
    left to be pulled on demand.

    Returns whether the local cache can be trusted to be complete.
    """
    if not enabled():
        return True

    from huggingface_hub import snapshot_download

    try:
        snapshot = snapshot_download(
            repo_id=REPO_ID,
            repo_type="dataset",
            token=_TOKEN,
            allow_patterns=["documents/*.json"],
        )
    except Exception as exc:
        print(f"Remote store: could not hydrate records ({exc}).")
        return False

    into.mkdir(parents=True, exist_ok=True)
    for record in (Path(snapshot) / "documents").glob("*.json"):
        (into / record.name).write_bytes(record.read_bytes())
    return True
