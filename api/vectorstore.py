from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_community.vectorstores.utils import filter_complex_metadata

from .config import PERSIST_DIRECTORY

_embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"},
)


def _page_of(metadata) -> int:
    """Unstructured exposes page_number on element metadata; 0 means unknown."""
    return getattr(metadata, "page_number", None) or 0


def build_text_docs(chunks, doc_id: str):
    text_docs = []
    for chunk in chunks:
        text_docs.append(Document(
            page_content=chunk.text,
            metadata={
                "category": chunk.category,
                "doc_id": doc_id,
                "page": _page_of(chunk.metadata),
            }
        ))
    return text_docs


def build_image_docs(image_summaries, doc_id: str):
    image_docs = []
    for image in image_summaries:
        image_docs.append(
            Document(
                page_content=image["summary"],
                metadata={
                    "category": image["category"],
                    "doc_id": doc_id,
                    "page": image.get("page", 0),
                }
            )
        )
    return image_docs


def build_table_docs(table_summaries, doc_id: str):
    table_docs = []
    for table in table_summaries:
        table_docs.append(
            Document(
                page_content=table["summary"],
                metadata={
                    "category": table["category"],
                    "doc_id": doc_id,
                    "page": table.get("page", 0),
                }
            )
        )
    return table_docs


def create_vector_store(
    all_docs,
    collection_name: str,
    persist_directory: str = PERSIST_DIRECTORY,
    load_existing: bool = False,
):
    """Create or open a Chroma collection.

    Each document gets its own collection so retrieval can never surface content
    from a previously indexed PDF.
    """
    if load_existing:
        return Chroma(
            collection_name=collection_name,
            persist_directory=persist_directory,
            embedding_function=_embeddings,
            collection_metadata={"hnsw:space": "cosine"},
        )

    all_docs = filter_complex_metadata(all_docs)

    return Chroma.from_documents(
        documents=all_docs,
        collection_name=collection_name,
        embedding=_embeddings,
        persist_directory=persist_directory,
        collection_metadata={"hnsw:space": "cosine"},
    )


def delete_collection(collection_name: str, persist_directory: str = PERSIST_DIRECTORY) -> None:
    Chroma(
        collection_name=collection_name,
        persist_directory=persist_directory,
        embedding_function=_embeddings,
    ).delete_collection()
