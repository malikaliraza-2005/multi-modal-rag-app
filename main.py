import os
from config import llm_answer_generation, llm_img_summary
from loaders import partition_docs, create_chunks_by_title
from extractor import get_images, get_tables
from summariser import summarise_images, summarise_tables
from vectorstore import (
    build_text_docs,
    build_image_docs,
    build_table_docs,
    create_vector_store,
)
from rag import run_query
PERSIST_DIRECTORY = "./db/chroma_db"


def process_document(file_path):
    """
    Process a PDF and create/update the Chroma vector store.
    """

    print("Processing document...")

    elements = partition_docs(file_path)

    print(f"Creating chunks from {len(elements)} elements...")
    chunks = create_chunks_by_title(elements)

    print("Extracting images and tables...")
    images = get_images(elements)
    tables = get_tables(elements)

    print("Summarizing images...")
    image_summaries = summarise_images(images, llm_img_summary)

    print("Summarizing tables...")
    table_summaries = summarise_tables(tables, llm_answer_generation)

    print("Building documents...")
    text_docs = build_text_docs(chunks)
    image_docs = build_image_docs(image_summaries)
    table_docs = build_table_docs(table_summaries)

    all_docs = text_docs + image_docs + table_docs

    print(f"Creating vector store with {len(all_docs)} documents...")

    db = create_vector_store(
        all_docs,
        persist_directory=PERSIST_DIRECTORY
    )

    return db


def load_vector_store():
    """
    Load an existing Chroma vector store.
    """

    db = create_vector_store(
        all_docs=None,
        persist_directory=PERSIST_DIRECTORY,
        load_existing=True,
    )

    return db


if __name__ == "__main__":

    # Only for testing without Streamlit
    file_path = "documents/sample.pdf"

    db = process_document(file_path)

    while True:
        question = input("Ask a question (or type 'exit'): ")

        if question.lower() == "exit":
            break

        answer = run_query(db, question)
        print("\nAnswer:\n")
        print(answer)
        print("-" * 60)