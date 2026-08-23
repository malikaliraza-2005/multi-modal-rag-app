"""Claim documents that were indexed before libraries existed.

Every document now belongs to an anonymous library id, so that visitors to a
deployed instance cannot see each other's uploads. Records written before that
change have no owner, which means they are hidden from everyone.

This stamps those ownerless records with a library id of your choosing — run it
once, against your own browser's id, to get your existing documents back.

    1. Open the app, press F12, and in the Console run:

           localStorage.getItem('asterism:library-id')

    2. Pass the value it prints:

           venv/Scripts/python scripts/adopt-documents.py <that-value>

Nothing else is touched: the files, the previews and the vector collections all
stay exactly where they are.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCUMENTS = ROOT / "storage" / "documents"

LIBRARY_ID = re.compile(r"^[A-Za-z0-9_-]{16,64}$")


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__)
        return 2

    library_id = argv[1].strip()
    if not LIBRARY_ID.match(library_id):
        print(
            f"'{library_id}' does not look like a library id — expected 16-64 "
            "characters of A-Z a-z 0-9 _ -\n\n"
            "Read it from the browser console with:\n"
            "    localStorage.getItem('asterism:library-id')"
        )
        return 2

    if not DOCUMENTS.exists():
        print(f"No documents directory at {DOCUMENTS}")
        return 1

    adopted, already = [], 0
    for path in sorted(DOCUMENTS.glob("*.json")):
        record = json.loads(path.read_text(encoding="utf-8"))
        if record.get("library_id"):
            already += 1
            continue
        record["library_id"] = library_id
        path.write_text(json.dumps(record, indent=2), encoding="utf-8")
        adopted.append(record.get("filename", path.stem))

    if not adopted:
        print(f"Nothing to adopt — all {already} documents already have an owner.")
        return 0

    print(f"Adopted {len(adopted)} document(s) into {library_id}:")
    for name in adopted:
        print(f"  {name}")
    if already:
        print(f"\nLeft {already} document(s) that already had an owner.")
    print("\nReload the library to see them.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
