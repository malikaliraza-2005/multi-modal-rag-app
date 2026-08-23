"""What the app will ingest, and how each format describes itself.

One table, consulted by every layer: the upload guard, the partitioner
dispatch, the file route's Content-Type, and the label a citation carries. A
new format is added here first — everything else keys off `kind`.
"""

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class FileType:
    kind: str
    """Which ingest path handles it — see `loaders.partition_docs`."""

    media_type: str
    """What `/documents/{id}/file` serves the original bytes as."""

    locator: str
    """What one unit of this format is called. Citations say "slide 4" for a
    deck and "page 4" for a report, and the two are not interchangeable."""


_PDF = FileType("pdf", "application/pdf", "page")
_IMAGE_LOCATOR = "image"

EXTENSIONS: dict[str, FileType] = {
    ".pdf": _PDF,
    # Word processing
    ".docx": FileType("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "page"),
    ".doc": FileType("docx", "application/msword", "page"),
    ".odt": FileType("docx", "application/vnd.oasis.opendocument.text", "page"),
    ".rtf": FileType("docx", "application/rtf", "page"),
    # Presentations
    ".pptx": FileType("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "slide"),
    ".ppt": FileType("pptx", "application/vnd.ms-powerpoint", "slide"),
    # Spreadsheets
    ".xlsx": FileType("sheet", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "sheet"),
    ".xls": FileType("sheet", "application/vnd.ms-excel", "sheet"),
    ".csv": FileType("sheet", "text/csv", "sheet"),
    ".tsv": FileType("sheet", "text/tab-separated-values", "sheet"),
    # Images
    ".png": FileType("image", "image/png", _IMAGE_LOCATOR),
    ".jpg": FileType("image", "image/jpeg", _IMAGE_LOCATOR),
    ".jpeg": FileType("image", "image/jpeg", _IMAGE_LOCATOR),
    ".webp": FileType("image", "image/webp", _IMAGE_LOCATOR),
    ".gif": FileType("image", "image/gif", _IMAGE_LOCATOR),
    ".bmp": FileType("image", "image/bmp", _IMAGE_LOCATOR),
    ".tif": FileType("image", "image/tiff", _IMAGE_LOCATOR),
    ".tiff": FileType("image", "image/tiff", _IMAGE_LOCATOR),
    ".heic": FileType("image", "image/heic", _IMAGE_LOCATOR),
    ".heif": FileType("image", "image/heif", _IMAGE_LOCATOR),
    # Plain text and markup
    ".txt": FileType("text", "text/plain", "section"),
    ".md": FileType("text", "text/markdown", "section"),
    ".markdown": FileType("text", "text/markdown", "section"),
    ".rst": FileType("text", "text/x-rst", "section"),
    ".html": FileType("html", "text/html", "section"),
    ".htm": FileType("html", "text/html", "section"),
    ".xml": FileType("html", "application/xml", "section"),
    ".epub": FileType("text", "application/epub+zip", "section"),
    # Mail
    ".eml": FileType("email", "message/rfc822", "message"),
    ".msg": FileType("email", "application/vnd.ms-outlook", "message"),
}

SUPPORTED_EXTENSIONS: tuple[str, ...] = tuple(sorted(EXTENSIONS))

# Which formats the browser can display on its own. Everything else gets the
# structural preview built at ingest time.
NATIVELY_VIEWABLE = {"pdf", "image"}


def extension_of(filename: str) -> str:
    return Path(filename).suffix.lower()


def lookup(filename: str) -> FileType | None:
    return EXTENSIONS.get(extension_of(filename))


def supported_list() -> str:
    """A human-readable allowlist for the upload error message."""
    return ", ".join(ext.lstrip(".").upper() for ext in SUPPORTED_EXTENSIONS)
