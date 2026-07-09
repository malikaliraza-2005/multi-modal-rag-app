from unstructured.partition.pdf import partition_pdf
from unstructured.chunking.title import chunk_by_title

def partition_docs(file_path):
    """ Extracts text from a PDF file and partitions it into atomic elements using the Unstructured library."""
    elements=partition_pdf(
        filename=file_path,
        strategy="hi_res",
        infer_table_structure=True,
        extract_image_block_types=["Image"],
        extract_image_block_to_payload=True

    )
    print(f"Extracted {len(elements)} elements from the PDF.")
    return elements

def create_chunks_by_title(elements):
    """ Creates chunks of text based on titles using the Unstructured library."""
    chunks = chunk_by_title(
        elements=elements,
        max_characters=1000,
        new_after_n_chars=700,
        combine_text_under_n_chars=100

    )
    print(f"Created {len(chunks)} chunks based on titles.")
    return chunks