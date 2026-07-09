from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_community.vectorstores.utils import filter_complex_metadata

_embeddings = HuggingFaceEmbeddings( model_name="sentence-transformers/all-MiniLM-L6-v2", model_kwargs={"device": "cpu"} )

def _filter_complex_metadata(docs):
    """Keep only primitive metadata values (str, int, float, bool, None) that Chroma accepts."""
    allowed_types = (str, int, float, bool, type(None))
    for doc in docs:
        doc.metadata = {
            k: v for k, v in doc.metadata.items()
            if isinstance(v, allowed_types)
        }
    return docs

def build_text_docs(chunks):
    text_docs = []
    for chunk in chunks:
        text_docs.append(Document(
            page_content=chunk.text,
            metadata={
                "category": chunk.category
            }
        ))
    return text_docs


def build_image_docs(image_summaries):
    image_docs = []
    for image in image_summaries:
        image_docs.append(
            Document(
                page_content=image["summary"],
                metadata={
                    "category": image["category"]
                }
            )
        )
    return image_docs


def build_table_docs(table_summaries):
    table_docs = []
    for table in table_summaries:
        table_docs.append(
            Document(
                page_content=table["summary"],
                metadata={
                    "category": table["category"]
                }
            )
        )
    return table_docs


def create_vector_store(all_docs, persist_directory: str = "./db/chroma_db", load_existing: bool = False):
    if load_existing:
        vector_store = Chroma(
            persist_directory=persist_directory,
            embedding_function=_embeddings,
            collection_metadata={"hnsw:space": "cosine"},
        )
        print(f"Loaded existing vector store from {persist_directory}.")
        return vector_store

    all_docs = filter_complex_metadata(all_docs)

    vector_store = Chroma.from_documents(
        documents=all_docs,
        embedding=_embeddings,
        persist_directory=persist_directory,
        collection_metadata={"hnsw:space": "cosine"}
    )
    print(f"Vector store created with {len(all_docs)} documents.")
    return vector_store