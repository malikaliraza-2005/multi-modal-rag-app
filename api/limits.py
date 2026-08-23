"""Per-visitor upload throttling for a public instance.

Indexing is the expensive operation: it burns the operator's vision quota and
fills the operator's disk. With no accounts there is nothing to bill or ban, so
the only lever is a rate limit keyed to the anonymous library id.

In-memory and per-process on purpose. It is a cost guardrail, not a security
control — a determined visitor clears their library id and gets a fresh bucket.
Anything stronger needs a real identity, which is exactly what this app is built
not to require.
"""

import time
from collections import deque
from threading import Lock

from .config import UPLOADS_PER_HOUR

WINDOW_SECONDS = 3600

_buckets: dict[str, deque[float]] = {}
_lock = Lock()


def check_upload(key: str) -> int | None:
    """Record an upload attempt.

    Returns None when allowed, or the whole seconds until a slot frees when the
    caller is over the limit.
    """
    if UPLOADS_PER_HOUR <= 0:
        return None

    now = time.monotonic()
    cutoff = now - WINDOW_SECONDS

    with _lock:
        bucket = _buckets.setdefault(key, deque())
        while bucket and bucket[0] < cutoff:
            bucket.popleft()

        if len(bucket) >= UPLOADS_PER_HOUR:
            return max(1, int(bucket[0] + WINDOW_SECONDS - now) + 1)

        bucket.append(now)

        # Buckets are keyed by a value the visitor chooses, so they would grow
        # without bound. Drop the ones that have aged out entirely.
        if len(_buckets) > 512:
            for stale in [k for k, v in _buckets.items() if not v]:
                del _buckets[stale]

    return None


def release(key: str) -> None:
    """Give back a slot when the upload it was taken for did not index.

    A failed ingest costs the operator nothing worth rationing, and charging a
    visitor for a document that errored out is just confusing.
    """
    with _lock:
        bucket = _buckets.get(key)
        if bucket:
            bucket.pop()
