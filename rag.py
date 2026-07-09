from config import llm_answer_generation, llm_img_summary

def run_query(db, question):
    retriever = db.as_retriever(
        search_kwargs={"k": 5}
    )

    retrieved_docs = retriever.invoke(question)
    print(len(retrieved_docs))
    for i, doc in enumerate(retrieved_docs):
        print(f"\nDocument {i+1}")
        print(doc.page_content)
        print(doc.metadata)
    context = "\n\n".join(
        doc.page_content for doc in retrieved_docs
    )

    prompt = f"""You are a helpful assistant answering questions about a document.

Rules:
- If the user's message is a greeting or small talk (e.g. "hello", "hi", "thanks"), respond naturally and briefly. Do not reference the context below for these.
- Otherwise, answer the user's question using the context below as your primary source.
- If the context does not contain relevant information for the question, say so clearly, then you may add general knowledge to help — but label it explicitly as being outside the document (e.g. "This isn't covered in the document, but generally speaking...").
- Never mention irrelevant or unrelated context content just because it was retrieved.
{context}

Question:
{question}
"""

    response = llm_answer_generation.invoke(prompt)
    print(response.content)
    return response.content