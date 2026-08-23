# The Asterism API. Built for Hugging Face Spaces, but nothing here is
# Spaces-specific beyond the default port — it runs anywhere that takes a
# container with a couple of gigabytes of RAM.
#
# Two decisions do most of the work on image size and cold-start time:
#   * CPU-only torch, which drops roughly 1.5 GB of CUDA wheels this will
#     never execute.
#   * Models baked in at build time. A cold Space would otherwise download
#     several hundred megabytes on the first request and time it out.

FROM python:3.11-slim

# What unstructured shells out to: poppler rasterises PDF pages, tesseract does
# OCR, libmagic sniffs types, libgl/libglib are OpenCV's runtime.
RUN apt-get update && apt-get install -y --no-install-recommends \
        poppler-utils \
        tesseract-ocr \
        libmagic1 \
        libgl1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Spaces runs containers as uid 1000, and a root-owned $HOME means no writable
# model cache. Create the user before anything is installed.
RUN useradd --create-home --uid 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
WORKDIR $HOME/app

COPY --chown=user:user api/requirements.txt api/requirements.txt

# Torch first, from the CPU index. Installing it ahead of the requirements file
# leaves the resolver with the dependency already satisfied, rather than
# pulling the default CUDA wheels.
RUN pip install --no-cache-dir --user \
        --index-url https://download.pytorch.org/whl/cpu \
        torch torchvision \
    && pip install --no-cache-dir --user -r api/requirements.txt

ENV HF_HOME=$HOME/.cache/huggingface

# Warm both models into the image. The embedding model has a stable id; the
# layout model is whichever one unstructured currently wants, so it is fetched
# by doing the smallest possible hi_res parse rather than by hardcoding a name
# that moves between releases. Non-fatal: a download hiccup at build time
# should cost a slow first request, not the whole image.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

RUN python -c "\
from PIL import Image; \
Image.new('RGB', (900, 640), 'white').save('/tmp/warm.png'); \
from unstructured.partition.image import partition_image; \
partition_image(filename='/tmp/warm.png', strategy='hi_res', infer_table_structure=True); \
print('layout model cached')" \
    || echo "layout model will be downloaded on the first request instead"

COPY --chown=user:user api api
COPY --chown=user:user scripts scripts

# Defaults suit a Space with no persistent storage: writable, and wiped on
# rebuild. Point STORAGE_ROOT and CHROMA_DIR at /data once a volume exists.
ENV STORAGE_ROOT=$HOME/app/storage \
    CHROMA_DIR=$HOME/app/db/chroma_db \
    PORT=7860

EXPOSE 7860

# One worker deliberately. Each would load its own copy of torch and the layout
# model, and the upload rate limiter keeps its counters in process memory.
CMD ["sh", "-c", "uvicorn api.server:app --host 0.0.0.0 --port ${PORT:-7860} --workers 1"]
