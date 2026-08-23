"""Turn an uploaded file into ordered, atomic elements.

Every format goes through `unstructured`, but each needs its own partitioner
and its own options, so the import is deferred until we know which one applies.
Importing eagerly would drag the PDF stack — onnxruntime, the layout model,
pdfminer — into the process just to read a .txt.
"""

from unstructured.chunking.title import chunk_by_title

from .filetypes import extension_of, lookup

# The pre-2007 binary formats are not readable in Python; unstructured converts
# them with LibreOffice first. Its own error names a `soffice` subprocess, which
# tells the user nothing about what to do.
_NEEDS_LIBREOFFICE = {".doc", ".ppt"}

# hi_res runs layout detection and table structure inference. It is the reason
# ingestion takes minutes, and the reason figures and tables come out usable.
_HI_RES = {
    "strategy": "hi_res",
    "infer_table_structure": True,
    "extract_image_block_types": ["Image"],
    "extract_image_block_to_payload": True,
}


def _partition_pdf(path):
    from unstructured.partition.pdf import partition_pdf

    return partition_pdf(filename=path, **_HI_RES)


def _partition_image(path):
    from unstructured.partition.image import partition_image

    # OCR is a bonus here, not the point: the whole picture is summarised by the
    # vision model regardless. If tesseract is missing or the codec is one
    # unstructured cannot open, an image with no OCR text is still answerable.
    try:
        return partition_image(filename=path, **_HI_RES)
    except Exception as exc:
        print(f"OCR pass failed for {path} ({exc}); continuing with the vision summary alone.")
        return []


def _partition_word(path, ext):
    if ext == ".docx":
        from unstructured.partition.docx import partition_docx

        return partition_docx(filename=path, infer_table_structure=True)
    if ext == ".doc":
        from unstructured.partition.doc import partition_doc

        return partition_doc(filename=path, infer_table_structure=True)
    if ext == ".rtf":
        from unstructured.partition.rtf import partition_rtf

        return partition_rtf(filename=path)
    from unstructured.partition.odt import partition_odt

    return partition_odt(filename=path, infer_table_structure=True)


def _partition_slides(path, ext):
    if ext == ".pptx":
        from unstructured.partition.pptx import partition_pptx

        return partition_pptx(filename=path, infer_table_structure=True)
    from unstructured.partition.ppt import partition_ppt

    return partition_ppt(filename=path, infer_table_structure=True)


def _partition_sheet(path, ext):
    if ext in (".xlsx", ".xls"):
        from unstructured.partition.xlsx import partition_xlsx

        return partition_xlsx(filename=path, infer_table_structure=True)
    if ext == ".tsv":
        from unstructured.partition.tsv import partition_tsv

        return partition_tsv(filename=path)
    from unstructured.partition.csv import partition_csv

    return partition_csv(filename=path)


def _partition_text(path, ext):
    if ext in (".md", ".markdown"):
        from unstructured.partition.md import partition_md

        return partition_md(filename=path)
    if ext == ".rst":
        from unstructured.partition.rst import partition_rst

        return partition_rst(filename=path)
    if ext == ".epub":
        from unstructured.partition.epub import partition_epub

        return partition_epub(filename=path)
    from unstructured.partition.text import partition_text

    return partition_text(filename=path)


def _partition_markup(path, ext):
    if ext == ".xml":
        from unstructured.partition.xml import partition_xml

        return partition_xml(filename=path)
    from unstructured.partition.html import partition_html

    return partition_html(filename=path)


def _partition_email(path, ext):
    if ext == ".msg":
        from unstructured.partition.msg import partition_msg

        return partition_msg(filename=path)
    from unstructured.partition.email import partition_email

    return partition_email(filename=path)


def partition_docs(file_path: str, filename: str | None = None):
    """Extract elements from a document of any supported type.

    `filename` carries the original name when the stored path does not — the
    dispatch is by extension, and storage names files by content hash.
    """
    name = filename or file_path
    ext = extension_of(name)
    file_type = lookup(name)
    if file_type is None:
        raise ValueError(f"Unsupported file type: {ext or name}")

    kind = file_type.kind
    try:
        if kind == "pdf":
            elements = _partition_pdf(file_path)
        elif kind == "image":
            elements = _partition_image(file_path)
        elif kind == "docx":
            elements = _partition_word(file_path, ext)
        elif kind == "pptx":
            elements = _partition_slides(file_path, ext)
        elif kind == "sheet":
            elements = _partition_sheet(file_path, ext)
        elif kind == "html":
            elements = _partition_markup(file_path, ext)
        elif kind == "email":
            elements = _partition_email(file_path, ext)
        else:
            elements = _partition_text(file_path, ext)
    except Exception as exc:
        if ext in _NEEDS_LIBREOFFICE:
            modern = ".docx" if ext == ".doc" else ".pptx"
            raise ValueError(
                f"Reading {ext} requires LibreOffice on PATH. Install it, or "
                f"re-save the file as {modern} and upload that."
            ) from exc
        raise

    print(f"Extracted {len(elements)} elements from {ext or 'the file'}.")
    return elements


def create_chunks_by_title(elements):
    """Creates chunks of text based on titles using the Unstructured library."""
    chunks = chunk_by_title(
        elements=elements,
        max_characters=1000,
        new_after_n_chars=700,
        combine_text_under_n_chars=100

    )
    print(f"Created {len(chunks)} chunks based on titles.")
    return chunks
