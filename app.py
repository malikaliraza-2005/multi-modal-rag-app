import streamlit as st
from main import process_document
from rag import run_query

# ------------------ PAGE CONFIG ------------------
st.set_page_config(
    page_title="Multimodal RAG Assistant",
    page_icon="📄",
    layout="wide"

)


# ------------------ CUSTOM CSS ------------------
st.markdown("""
<style>

/* Background */
.stApp{
    background: linear-gradient(135deg,#0F172A,#1E293B,#334155);
    color:white;
}

/* Hero Banner */
.hero{
    padding:30px;
    border-radius:20px;
    background:linear-gradient(135deg,#2563EB,#7C3AED);
    color:white;
    text-align:center;
    margin-bottom:20px;
}

/* Sidebar */
[data-testid="stSidebar"]{
    background:#111827;
}

/* File uploader */
[data-testid="stFileUploader"]{
    border:2px dashed #60A5FA;
    border-radius:15px;
    padding:10px;
}

/* Buttons */
.stButton>button{
    border-radius:10px;
    background:#2563EB;
    color:white;
}

/* Success boxes */
[data-testid="stAlert"]{
    border-radius:12px;
}

</style>
""", unsafe_allow_html=True)

# ------------------ SESSION STATE ------------------
if "db" not in st.session_state:
    st.session_state.db = None

if "history" not in st.session_state:
    st.session_state.history = []

if "current_file" not in st.session_state:
    st.session_state.current_file = None

# ------------------ HERO ------------------
st.markdown("""
<div class="hero">
<h1>📄 Multimodal RAG Document Assistant</h1>
<p>
Upload a PDF and explore its text, images, and tables using
AI-powered Retrieval-Augmented Generation.
</p>
</div>
""", unsafe_allow_html=True)

# ------------------ SIDEBAR ------------------
with st.sidebar:

    st.title("📚 About")

    st.markdown("""
### Workflow

1. 📄 Upload a PDF

2. ⚙️ Document is processed automatically

3. 💬 Ask unlimited questions

---

### Supported Content

- 📄 Text
- 🖼 Images
- 📊 Tables

---

### Tech Stack

- Streamlit
- LangChain
- ChromaDB
- Hugging Face
- Groq
- Unstructured
""")

    st.divider()

    if st.button("🗑️ Clear Chat"):
        st.session_state.history = []
        st.rerun()

    if st.button("🔄 Clear Document"):
        st.session_state.db = None
        st.session_state.history = []
        st.session_state.current_file = None
        st.rerun()

# ------------------ FILE UPLOAD ------------------
uploaded_file = st.file_uploader(
    "Upload a PDF",
    type=["pdf"]
)

if uploaded_file is not None:

    # Process only when a NEW file is uploaded
    if st.session_state.current_file != uploaded_file.name:

        with open("uploaded_file.pdf", "wb") as f:
            f.write(uploaded_file.getbuffer())

        st.success(f"✅ {uploaded_file.name}")
        st.caption(f"Size: {uploaded_file.size/1024:.2f} KB")

        with st.spinner(f"Processing {uploaded_file.name}..."):

            st.session_state.db = process_document("uploaded_file.pdf")

        st.session_state.current_file = uploaded_file.name

        # Clear previous chat history
        st.session_state.history = []

        st.success("Document processed successfully! 🎉")

#Note:
st.info(
    "📌 This application processes one PDF at a time and provides answers grounded exclusively in the uploaded document. "
    "For the best experience, upload a single PDF and ask questions related to its content."
)

#  CHAT HISTORY 
for chat in st.session_state.history:

    with st.chat_message("user"):
        st.write(chat["question"])

    with st.chat_message("assistant"):
        st.write(chat["answer"])

# ------------------ CHAT 
question = st.chat_input("Ask anything about the document...")

if question:

    if st.session_state.db is None:

        st.warning("Please upload a PDF first.")

    else:

        with st.chat_message("user"):
            st.write(question)

        with st.spinner("Thinking..."):

            answer = run_query(st.session_state.db, question)

        with st.chat_message("assistant"):
            st.write(answer)

        st.session_state.history.append(
            {
                "question": question,
                "answer": answer
            }
        )

# ------------------ FOOTER ------------------
st.divider()

st.caption(
    "Built with ❤️ using Streamlit • LangChain • ChromaDB • Hugging Face • Groq"
)