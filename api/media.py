"""Recover pictures that the partitioners drop, and normalise them for vision.

`unstructured` extracts figures from PDFs and images, but its docx/pptx
partitioners discard embedded pictures entirely — a slide deck would arrive as
text with every diagram missing. Both formats are zip containers holding the
media verbatim, so we read it out ourselves and feed it to the same vision
summariser the PDF path uses.

Everything is re-encoded to a bounded JPEG on the way through. That is what
makes "all image types" true: HEIC, WebP, animated GIF, CMYK TIFF and 12 MP
phone photos all reach the model as one predictable format at a sane size.
"""

import base64
import hashlib
import io
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree

from PIL import Image

from .config import MAX_FIGURES_PER_DOC

# HEIC/HEIF are not in Pillow's core codec set. unstructured pins `pi-heif`;
# `pillow-heif` is the same opener under a different distribution name, so take
# whichever is installed and carry on without HEIC if neither is.
for _heif_module in ("pi_heif", "pillow_heif"):
    try:
        __import__(_heif_module).register_heif_opener()
        break
    except Exception:  # pragma: no cover - optional codec
        continue

# Below this an embedded picture is a bullet glyph, a rule or a logo, not a
# figure worth a vision call.
MIN_PIXELS = 110 * 110

# Vision models gain nothing past this, and the preview embeds these inline.
MAX_EDGE = 1400
JPEG_QUALITY = 82

_RASTER_SUFFIXES = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tif", ".tiff", ".webp", ".heic", ".heif",
}

_REL_NS = "{http://schemas.openxmlformats.org/package/2006/relationships}"
_SLIDE_RELS = re.compile(r"ppt/slides/_rels/slide(\d+)\.xml\.rels")


def normalise_image(data: bytes, min_pixels: int = MIN_PIXELS) -> tuple[str, bytes] | None:
    """Re-encode arbitrary image bytes as a bounded JPEG.

    Returns the base64 payload for the vision call and the raw JPEG bytes for
    the preview, or None if the image is unreadable or too small to be a figure.
    """
    try:
        with Image.open(io.BytesIO(data)) as img:
            img.load()  # animated GIFs and progressive JPEGs decode lazily
            if img.width * img.height < min_pixels:
                return None
            # Flatten alpha onto white; JPEG has no alpha channel and pasting
            # onto black would invert the look of most diagrams.
            if img.mode in ("RGBA", "LA", "P"):
                img = img.convert("RGBA")
                canvas = Image.new("RGB", img.size, (255, 255, 255))
                canvas.paste(img, mask=img.split()[-1])
                img = canvas
            elif img.mode != "RGB":
                img = img.convert("RGB")

            img.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)

            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    except Exception as exc:
        print(f"Skipping an image that could not be decoded: {exc}")
        return None

    raw = buffer.getvalue()
    return base64.b64encode(raw).decode("ascii"), raw


def _pptx_media_slides(archive: zipfile.ZipFile) -> dict[str, int]:
    """Map each media entry to the slide that references it.

    Without this every picture in a deck would cite slide 0, which breaks the
    one thing the citation is for.
    """
    mapping: dict[str, int] = {}
    for name in archive.namelist():
        match = _SLIDE_RELS.fullmatch(name)
        if not match:
            continue
        slide = int(match.group(1))
        try:
            root = ElementTree.fromstring(archive.read(name))
        except ElementTree.ParseError:
            continue
        for rel in root.findall(f"{_REL_NS}Relationship"):
            target = rel.get("Target", "")
            if "media/" not in target:
                continue
            entry = f"ppt/media/{Path(target).name}"
            # First slide wins: a picture reused later is still introduced here.
            mapping.setdefault(entry, slide)
    return mapping


def extract_office_images(file_path: str) -> list[dict]:
    """Pull the embedded pictures out of a .docx or .pptx."""
    ext = Path(file_path).suffix.lower()
    prefix = {"docx": "word/media/", "pptx": "ppt/media/"}.get(ext.lstrip("."))
    if prefix is None:
        return []

    try:
        archive = zipfile.ZipFile(file_path)
    except (zipfile.BadZipFile, OSError) as exc:
        print(f"Could not open {ext} as a container: {exc}")
        return []

    images: list[dict] = []
    seen: set[str] = set()
    skipped = 0

    with archive:
        slides = _pptx_media_slides(archive) if ext == ".pptx" else {}

        for name in sorted(archive.namelist()):
            if not name.startswith(prefix) or Path(name).suffix.lower() not in _RASTER_SUFFIXES:
                continue

            raw = archive.read(name)
            # A logo repeated on every slide is one figure, not fifty calls.
            digest = hashlib.sha1(raw).hexdigest()
            if digest in seen:
                continue
            seen.add(digest)

            if len(images) >= MAX_FIGURES_PER_DOC:
                skipped += 1
                continue

            result = normalise_image(raw)
            if result is None:
                continue
            payload, jpeg = result
            images.append({"b64": payload, "jpeg": jpeg, "page": slides.get(name, 0)})

    if skipped:
        print(f"{skipped} embedded images beyond the {MAX_FIGURES_PER_DOC} limit were not summarised.")
    print(f"Embedded images recovered from the container: {len(images)}")
    return images


def load_whole_image(file_path: str) -> dict | None:
    """Treat an uploaded image file as a single figure.

    No minimum size: the user chose this file deliberately, however small.
    """
    try:
        data = Path(file_path).read_bytes()
    except OSError as exc:
        print(f"Could not read {file_path}: {exc}")
        return None

    result = normalise_image(data, min_pixels=0)
    if result is None:
        return None
    payload, jpeg = result
    return {"b64": payload, "jpeg": jpeg, "page": 1}
