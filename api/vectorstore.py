import json

from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_community.vectorstores.utils import filter_complex_metadata

from . import store
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


def save_chunks(doc_id: str, all_docs: list[Document]) -> None:
    """Persist what a document was indexed from, one JSON object per line.

    This is the durable half of indexing. The Chroma collection is a derived
    artefact that can be rebuilt in seconds from these; what cannot be rebuilt
    cheaply is the work that produced them — the hi_res parse and one vision
    call per figure, the latter drawn from a free-tier budget of twenty a day.
    Keeping the chunks means a wiped index costs CPU, not quota.
    """
    path = store.chunks_path(doc_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for doc in all_docs:
            handle.write(
                json.dumps({"text": doc.page_content, "metadata": doc.metadata}) + "\n"
            )


def load_chunks(doc_id: str) -> list[Document]:
    path = store.ensure_chunks(doc_id)
    if path is None:
        return []
    with path.open(encoding="utf-8") as handle:
        return [
            Document(page_content=row["text"], metadata=row["metadata"])
            for row in (json.loads(line) for line in handle if line.strip())
        ]


def ensure_collection(
    collection_name: str, doc_id: str, persist_directory: str = PERSIST_DIRECTORY
):
    """Open a document's collection, rebuilding it first if it is not there.

    On a host with no persistent disk the index is gone after every restart
    while the document itself is not, so a query that would have returned
    nothing re-embeds the stored chunks and answers properly instead. Only the
    document being asked about is rebuilt, which keeps a cold start proportional
    to what someone actually opened rather than to the whole library.
    """
    db = create_vector_store(None, collection_name=collection_name,
                             persist_directory=persist_directory, load_existing=True)
    if db.get(limit=1)["ids"]:
        return db

    chunks = load_chunks(doc_id)
    if not chunks:
        # Nothing to rebuild from — an empty collection answers with silence,
        # which is the same thing the caller would have seen anyway.
        return db
    return create_vector_store(chunks, collection_name=collection_name,
                               persist_directory=persist_directory)


def delete_collection(collection_name: str, persist_directory: str = PERSIST_DIRECTORY) -> None:
    Chroma(
        collection_name=collection_name,
        persist_directory=persist_directory,
        embedding_function=_embeddings,
    ).delete_collection()
