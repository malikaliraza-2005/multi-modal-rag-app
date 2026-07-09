from langchain_core.messages import HumanMessage
from config import llm_img_summary, llm_answer_generation

def summarise_images(images, llm):
    """Summarizes each image using a language model."""
    summaries = []

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
                        - An illustration: describe the key content.

                        Do not add information that is not visible in the image.
                        """
                    },
                    {
                        "type": "image",
                        "source_type": "base64",
                        "mime_type": "image/jpeg",
                        "data": image.metadata.image_base64,
                    },
                ]
            )
            response = llm_img_summary.invoke([message])
            print(f"\nImage {i+1} Summary:")
            print(response.content)
            summaries.append({
                "summary": response.content,
                "original_image": image.metadata.image_base64
                ,"category": "Image",
                "metadata": image.metadata

            })
        except Exception as e:
            print(f"Error summarizing image {i+1}: {e}")

    return summaries

def summarise_tables(tables, llm):
    """Summarizes each table using Gemini."""
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

{table.metadata.text_as_html}
"""

            response = llm_answer_generation.invoke(prompt)

            summaries.append({
                "summary": response.content,
                "original_table": table.metadata.text_as_html,
                "category": "Table",
                "metadata": table.metadata
            })

            print(f"\nTable {i+1} Summary:")
            print(response.content)

        except Exception as e:
            print(f"Error summarizing table {i}: {e}")

    return summaries