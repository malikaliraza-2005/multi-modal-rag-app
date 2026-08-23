"""A renderable stand-in for formats the browser cannot display.

The workspace shows the source beside the answer. A PDF renders natively and an
uploaded image is just an `<img>`, but nothing in a browser opens a .docx or a
.pptx. Converting them would mean shipping LibreOffice; instead we reuse the
structure ingestion already produced — same reading order, same page or slide
numbers the citations point at — and render that.

Figures are written out as JPEG files next to the preview rather than inlined,
so a picture-heavy deck does not turn the preview into a 40 MB JSON fetch.
"""

from pathlib import Path

# Long elements are for retrieval, not reading. Truncate what goes on screen.
MAX_BLOCK_CHARS = 6000

_HEADING_CATEGORIES = {"Title", "Header", "Headline", "Subtitle", "SectionHeader"}
_SKIP_CATEGORIES = {"Image", "PageBreak", "Footer", "PageNumber", "Formula"}


def _block_for(element) -> dict | None:
    category = element.category
    if category in _SKIP_CATEGORIES:
        return None

    if category == "Table":
        html = getattr(element.metadata, "text_as_html", None)
        if html:
            return {"type": "table", "html": html}

    text = (element.text or "").strip()
    if not text:
        return None
    if len(text) > MAX_BLOCK_CHARS:
        text = text[:MAX_BLOCK_CHARS].rstrip() + "…"

    if category in _HEADING_CATEGORIES:
        return {"type": "heading", "text": text}
    if category == "ListItem":
        return {"type": "list_item", "text": text}
    return {"type": "text", "text": text}


def build_preview(elements, image_summaries, locator: str, media_dir: Path) -> dict:
    """Assemble the viewer's copy of the document and write its figures to disk."""
    pages: dict[int, list[dict]] = {}

    for element in elements:
        page = getattr(element.metadata, "page_number", None) or 1
        block = _block_for(element)
        if block is not None:
            pages.setdefault(page, []).append(block)

    first_page = min(pages) if pages else 1

    written = 0
    for index, image in enumerate(image_summaries):
        jpeg = image.get("jpeg")
        if not jpeg:
            continue
        name = f"fig-{index:03d}.jpg"
        media_dir.mkdir(parents=True, exist_ok=True)
        (media_dir / name).write_bytes(jpeg)
        written += 1

        # Position within a page is not recoverable from the container, so
        # figures land at the end of the page that references them.
        page = image.get("page") or first_page
        pages.setdefault(page, []).append(
            {"type": "image", "src": name, "caption": image.get("summary", "")}
        )

    print(f"Preview built: {len(pages)} {locator}s, {written} figures.")

    return {
        "locator": locator,
        "pages": [
            {"number": number, "blocks": pages[number]} for number in sorted(pages)
        ],
    }
