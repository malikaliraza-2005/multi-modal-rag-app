"""Pull the non-text modalities out of a partitioned document.

Both extractors return plain dicts rather than `unstructured` elements, because
figures also arrive from `media.py` — which has no elements to hand back. One
shape downstream means the summariser and the vector store do not care where a
figure came from.
"""


def _page_number(element) -> int:
    """0 means unknown; not every format numbers its content."""
    return getattr(element.metadata, "page_number", None) or 0


def get_images(elements) -> list[dict]:
    """Figures unstructured lifted out of a PDF or an OCR'd image."""
    images = []
    for element in elements:
        if element.category != "Image":
            continue
        payload = getattr(element.metadata, "image_base64", None)
        if not payload:
            continue
        images.append({"b64": payload, "page": _page_number(element)})
    print(f"Images found: {len(images)}")
    return images


def get_tables(elements) -> list[dict]:
    tables = []
    for element in elements:
        if element.category != "Table":
            continue
        # Formats without table structure inference (CSV, plain text) still emit
        # Table elements; fall back to their flat text so they stay searchable.
        html = getattr(element.metadata, "text_as_html", None)
        body = html or (element.text or "").strip()
        if not body:
            continue
        tables.append({"html": html, "text": body, "page": _page_number(element)})
    print(f"Tables found: {len(tables)}")
    return tables
