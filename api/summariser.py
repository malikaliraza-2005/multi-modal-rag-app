from langchain_core.messages import HumanMessage

# media.py normalises every figure to JPEG before it reaches the model, whatever
# the source file was.
_IMAGE_MIME = "image/jpeg"


def summarise_images(images, llm):
    """Summarizes each image using a language model.

    Returns the summaries and, separately, the figures the model would not
    describe — a rate limit or a safety refusal costs a figure its place in the
    index, but the picture itself is still worth showing in the preview.
    """
    summaries = []
    failures = []

    for i, image in enumerate(images):
        try:
            message = HumanMessage(
                content=[
                    {
                        "type": "text",
                        "text": """
                        Summarize this image in 3-5 sentences.

                        If it is:
                        - A diagram: explain the workflow or architecture.
                        - A chart: explain the trends.
                        - A figure: explain the important information.
                        - A screenshot or photograph of text: transcribe the text you can read.
                        - An illustration or photo: describe the key content.

                        Do not add information that is not visible in the image.
                        """
                    },
                    {
                        "type": "image",
                        "source_type": "base64",
                        "mime_type": _IMAGE_MIME,
                        "data": image["b64"],
                    },
                ]
            )
            response = llm.invoke([message])
            print(f"\nImage {i+1} Summary:")
            print(response.content)
            summaries.append({
                "summary": response.content,
                "category": "Image",
                "page": image.get("page", 0),
                "jpeg": image.get("jpeg"),
            })
        except Exception as e:
            print(f"Error summarizing image {i+1}: {e}")
            failures.append({**image, "error": str(e)})

    return summaries, failures

def summarise_tables(tables, llm):
    """Summarizes each table from its HTML representation."""
    summaries = []

    for i, table in enumerate(tables):
        try:
            prompt = f"""
You are an expert at understanding tables.

Summarize the following table in 3-5 sentences.

Instructions:
- Mention what the table is about.
- Explain the important rows and columns.
- Highlight important values, comparisons, or trends.
- Do not add information that is not present in the table.

Table:

{table["text"]}
"""

            response = llm.invoke(prompt)

            summaries.append({
                "summary": response.content,
                "category": "Table",
                "page": table.get("page", 0),
            })

            print(f"\nTable {i+1} Summary:")
            print(response.content)

        except Exception as e:
            print(f"Error summarizing table {i}: {e}")

    return summaries
