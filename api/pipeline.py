from . import store
from .config import MAX_FIGURES_PER_DOC, llm_answer_generation, llm_img_summary
from .extractor import get_images, get_tables
from .filetypes import NATIVELY_VIEWABLE, lookup
from .loaders import partition_docs, create_chunks_by_title
from .media import extract_office_images, load_whole_image
from .preview import build_preview
from .summariser import summarise_images, summarise_tables
from .vectorstore import (
    build_text_docs,
    build_image_docs,
    build_table_docs,
    create_vector_store,
)


def _collect_images(file_path: str, kind: str, elements) -> list[dict]:
    """Gather every figure in the document, whatever the format hides it in."""
    if kind == "image":
        # The upload *is* the figure. Sub-blocks the OCR pass may have cropped
        # out of it would only duplicate a vision call on the same picture.
        whole = load_whole_image(file_path)
        return [whole] if whole else []

    images = get_images(elements)
    if kind in ("docx", "pptx"):
        images += extract_office_images(file_path)

    # One vision call per figure, billed to whoever is running this. A 200-page
    # scanned report would otherwise spend the day's quota by itself.
    if len(images) > MAX_FIGURES_PER_DOC:
        print(
            f"{len(images) - MAX_FIGURES_PER_DOC} figures beyond the "
            f"{MAX_FIGURES_PER_DOC} limit were not summarised."
        )
        images = images[:MAX_FIGURES_PER_DOC]
    return images


def _is_paginated(elements) -> bool:
    """Whether the format numbers its own content.

    A .docx or an .eml has no pages until something renders it, so unstructured
    numbers nothing. Those documents are one unit, and saying so is what makes
    their citations clickable instead of a permanent "unknown".
    """
    return any(getattr(e.metadata, "page_number", None) for e in elements)


def _page_count(elements, images, kind: str) -> int:
    if kind == "image":
        return 1
    numbers = [getattr(e.metadata, "page_number", 0) or 0 for e in elements]
    numbers += [image.get("page", 0) or 0 for image in images]
    count = max(numbers) if numbers else 0
    # A document we could read at all is at least one unit long.
    return count or (1 if elements or images else 0)


def process_document(file_path: str, doc_id: str, collection_name: str, filename: str) -> dict:
    """Parse a document, summarise its figures and tables, and index all three
    modalities into this document's own Chroma collection.

    Returns counts for the document record; the vector store itself is reopened
    per query rather than held in memory.
    """
    file_type = lookup(filename)
    if file_type is None:
        raise ValueError(f"Unsupported file type: {filename}")
    kind = file_type.kind

    elements = partition_docs(file_path, filename)
    chunks = create_chunks_by_title(elements)

    images = _collect_images(file_path, kind, elements)
    tables = get_tables(elements)

    image_summaries, failed_images = summarise_images(images, llm_img_summary)
    table_summaries = summarise_tables(tables, llm_answer_generation)

    all_docs = (
        build_text_docs(chunks, doc_id)
        + build_image_docs(image_summaries, doc_id)
        + build_table_docs(table_summaries, doc_id)
    )

    if not _is_paginated(elements):
        # Everything belongs to the document's single unit. Leaving these at 0
        # would render every citation as an unclickable "unknown".
        for doc in all_docs:
            doc.metadata["page"] = doc.metadata.get("page") or 1

    if not all_docs:
        # Chroma cannot build a collection from nothing, and a document with no
        # retrievable content would answer every question with silence.
        if failed_images:
            raise ValueError(
                "The only content here is imagery, and the vision model could "
                f"not describe it: {failed_images[0]['error']}"
            )
        raise ValueError(
            "No readable content was found in this file — it may be empty, "
            "password-protected, or a scan the OCR pass could not read."
        )

    create_vector_store(all_docs, collection_name=collection_name)

    # PDFs and images render natively in the browser; everything else needs the
    # structural preview to have anything to show beside the answer.
    has_preview = kind not in NATIVELY_VIEWABLE
    if has_preview:
        preview = build_preview(
            elements,
            # A figure with no summary still belongs on the page — the reader
            # can see what the retriever could not.
            image_summaries + [{**f, "summary": ""} for f in failed_images],
            file_type.locator,
            store.preview_media_dir(doc_id),
        )
        store.save_preview(doc_id, preview)

    return {
        "kind": kind,
        "locator": file_type.locator,
        "media_type": file_type.media_type,
        "has_preview": has_preview,
        "pages": _page_count(elements, images, kind),
        "chunk_count": len(chunks),
        "image_count": len(image_summaries),
        # Figures the vision model refused or rate-limited. Recorded rather than
        # swallowed: the user should know part of their document is unsearchable.
        "image_failed_count": len(failed_images),
        "table_count": len(table_summaries),
        "vector_count": len(all_docs),
    }


def load_vector_store(collection_name: str):
    return create_vector_store(
        all_docs=None,
        collection_name=collection_name,
        load_existing=True,
    )
