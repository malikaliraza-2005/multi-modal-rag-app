import os
from unittest import loader

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq

loaded =load_dotenv()

print("Dotenv loaded:", loaded)
print("Current directory:", os.getcwd())



llm_answer_generation= ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0
)

llm_img_summary= ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0
)