                                                              📄 Multimodal RAG Document Assistant

A Streamlit application that lets you upload a PDF and ask questions about it — grounded in the document's **text, tables, and images**, not just raw text. Built with a full multimodal Retrieval-Augmented Generation (RAG) pipeline using LangChain, ChromaDB, Groq, and Google Gemini.

 How It Works : 

1. **Upload** — user uploads a PDF through the Streamlit interface
2. **Partition** — `unstructured` parses the PDF using a high-resolution strategy, extracting text, tables, and images as distinct elements, with table structure inference enabled
3. **Chunk** — text elements are grouped into semantically coherent chunks using title-based chunking
4. **Extract** — image and table elements are separated out from the rest of the parsed content
5. **Summarize**:
   - Images are summarized by **Gemini 2.5 Flash**, describing diagrams, charts, figures, or illustrations based only on visible content
   - Tables are summarized by **Groq (Llama 3.3 70B)** from their HTML representation, highlighting key rows, columns, and trends
6. **Embed & Store** — text chunks, image summaries, and table summaries are all converted into LangChain `Document` objects, embedded using a HuggingFace sentence-transformer, and persisted in a Chroma vector store (cosine similarity)
7. **Retrieve & Answer** — on each question, the top-5 most relevant chunks are retrieved and passed as context to Groq (Llama 3.3 70B), which answers using the document content — falling back to general knowledge (explicitly labeled as such) only when the document doesn't cover the question

 Features :

- 📄 Multimodal PDF parsing — text, tables, and images all become searchable
- 🖼 Image understanding via Gemini vision summarization
- 📊 Table understanding via structured HTML-to-summary conversion
- 🔍 Semantic search over all content types using a single unified vector store
- 💬 Conversational chat interface with persistent session history
- 🧠 Context-grounded answers with transparent fallback to general knowledge
- 🎨 Custom-styled Streamlit UI (gradient theme, dashed upload zone, chat bubbles)

 Tech Stack :

| Layer            |                                               Tools                                                               |
| UI               |                                              Streamlit                                                            |
| Orchestration    |                                        LangChain, LangGraph                                                       |
| Document Parsing |                 Unstructured (`hi_res` strategy), pdf2image, pypdf, pikepdf, pi-heif                              |
| OCR              |                               Tesseract (`unstructured-pytesseract`)                                              |
| Embeddings       |                      HuggingFace `sentence-transformers/all-MiniLM-L6-v2` (CPU)                                   |
| Vector Store     |                                     ChromaDB (cosine similarity)                                                  |
| LLMs             | Groq `llama-3.3-70b-versatile` (answer generation & table summaries); Google `gemini-2.5-flash` (image summaries) |

 Project Structure :


├── app.py              # Streamlit UI — upload, chat interface, session state
├── main.py             # Pipeline orchestration (process_document, load_vector_store)
├── config.py            # LLM client setup (llm_answer_generation, llm_img_summary)
├── loaders.py           # PDF partitioning and title-based chunking
├── extractor.py          # Pulls image and table elements from parsed content
├── summariser.py         # Image and table summarization via LLMs
├── vectorstore.py        # Document building, embedding, and Chroma persistence
├── rag.py               # Retrieval + prompt construction + answer generation
├── requirements.txt      # Python dependencies
├── packages.txt          # System-level (apt) dependencies
└── README.md

 Setup:

 1. Clone the repository :

```bash
git clone https://github.com/<your-username>/multi-modal-rag-app.git
cd multi-modal-rag-app
```

 2. Create a virtual environment (recommended) :

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
```

 3. Install Python dependencies :

```bash
pip install -r requirements.txt
```

 4. Install system dependencies :

Required for PDF parsing, table extraction, and OCR:

```bash
sudo apt-get install tesseract-ocr poppler-utils libmagic-dev libgl1
```

(Already listed in `packages.txt` for automatic installation on Streamlit Community Cloud.)

 5. Set environment variables :

Create a `.env` file in the project root:

```
GROQ_API_KEY=your_groq_api_key
GOOGLE_API_KEY=your_google_api_key
```

`config.py` loads these via `python-dotenv` to initialize `llm_answer_generation` (Groq) and `llm_img_summary` (Gemini).

 Running Locally :

```bash
streamlit run app.py
```

The app will be available at `http://localhost:8501`.

You can also run the pipeline outside Streamlit for quick testing:

```bash
python main.py
```

This processes `documents/sample.pdf` and opens a simple CLI question loop.

 Deployment (Streamlit Community Cloud) :

- `requirements.txt` and `packages.txt` at the repo root are picked up automatically
- API keys are configured via **Settings → Secrets** in the Streamlit Cloud dashboard (not committed to the repo):

```toml
GROQ_API_KEY = "your-groq-key"
GOOGLE_API_KEY = "your-google-key"
```

 Usage Notes :

- The app processes **one PDF at a time** — uploading a new file replaces the current vector store and clears chat history
- Answers are grounded in the uploaded document; if the question falls outside the document's content, the assistant will say so before offering general knowledge
- Use **🗑️ Clear Chat** to reset the conversation, or **🔄 Clear Document** to remove the current document and start fresh

 Environment Variables :

GROQ_API_KEY : API key for Groq LLM inference (answer generation, table summaries) |
GOOGLE_API_KEY : API key for Google Gemini (image summaries) |

 License:

 MIT

## Acknowledgements

Built with [LangChain](https://www.langchain.com/), [LangGraph](https://www.langchain.com/langgraph), [ChromaDB](https://www.trychroma.com/), [Unstructured](https://unstructured.io/), [Groq](https://groq.com/), [Google Gemini](https://ai.google.dev/), and [Streamlit](https://streamlit.io/).
