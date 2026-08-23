import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq

# Anchor every path to the repo root so behaviour does not depend on the
# working directory uvicorn happens to be launched from.
ROOT_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = ROOT_DIR / "storage" / "documents"
PREVIEW_DIR = ROOT_DIR / "storage" / "previews"
PERSIST_DIRECTORY = str(ROOT_DIR / "db" / "chroma_db")

load_dotenv(ROOT_DIR / ".env")

# Groq retires models fairly aggressively — llama-3.3-70b-versatile, which this
# project previously used, now 404s. Keep the id overridable so a future
# retirement is an env change rather than a code change.
ANSWER_MODEL = os.getenv("ANSWER_MODEL", "openai/gpt-oss-120b")
VISION_MODEL = os.getenv("VISION_MODEL", "gemini-2.5-flash")

# ---------------------------------------------------------------------------
# Public-deployment guardrails.
#
# On a deployed instance every vision call is billed to the operator's key, not
# the visitor's, and there is no account to attach a quota to. These bound what
# a single upload — or a single enthusiastic visitor — can cost. Raise them for
# a private instance where the only user is you.
# ---------------------------------------------------------------------------

MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "10"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

# Figures summarised per document, across every format. Beyond this they are
# logged and skipped rather than silently billed for.
MAX_FIGURES_PER_DOC = int(os.getenv("MAX_FIGURES_PER_DOC", "40"))

# Documents one visitor may index per hour. 0 disables the limit.
UPLOADS_PER_HOUR = int(os.getenv("UPLOADS_PER_HOUR", "10"))

llm_answer_generation = ChatGroq(
    model=ANSWER_MODEL,
    temperature=0
)

llm_img_summary = ChatGoogleGenerativeAI(
    model=VISION_MODEL,
    temperature=0
)
