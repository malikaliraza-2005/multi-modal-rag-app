from .config import llm_answer_generation

# Unstructured's chunk categories are an implementation detail; the UI only
# needs to know which of the three modalities a source came from.
_CATEGORY_LABELS = {"Image": "figure", "Table": "table"}


def run_query(db, question: str, k: int = 5) -> dict:
    """Answer a question against one document's collection.

    Returns the answer plus the retrieved sources, so the UI can show where the
    answer came from and link back to the page.
    """
    results = db.similarity_search_with_relevance_scores(question, k=k)

    context = "\n\n".join(doc.page_content for doc, _ in results)

    prompt = f"""You are a helpful assistant answering questions about a document.

The document may be a report, a slide deck, a spreadsheet, a picture or a page of text. Its figures and tables appear in the context below as written descriptions produced when the document was indexed.

Rules:
- If the user's message is a greeting or small talk (e.g. "hello", "hi", "thanks"), respond naturally and briefly. Do not reference the context below for these.
- Treat a description of a figure as your evidence about that figure. Answer from it directly. Never reply that you cannot see or view images — describing them is not your job here, reading their descriptions is.
- Otherwise, answer the user's question using the context below as your primary source.
- If the context does not contain relevant information for the question, say so clearly, then you may add general knowledge to help — but label it explicitly as being outside the document (e.g. "This isn't covered in the document, but generally speaking...").
- Never mention irrelevant or unrelated context content just because it was retrieved.

Context:
{context}

Question:
{question}
"""

    response = llm_answer_generation.invoke(prompt)

    sources = [
        {
            "page": doc.metadata.get("page", 0),
            "category": _CATEGORY_LABELS.get(doc.metadata.get("category"), "text"),
            "snippet": doc.page_content[:400],
            "score": round(float(score), 3),
        }
        for doc, score in results
    ]

    return {"answer": response.content, "sources": sources}
