import openai
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configuración de OpenAI
openai.api_key = os.getenv("OPENAI_API_KEY", "")

# Función para interactuar con la API de OpenAI
async def get_openai_response(prompt: str):
    response = openai.ChatCompletion.create(
        model="gpt-4",  # O el modelo adecuado
        messages=[{"role": "user", "content": prompt}]
    )
    return response["choices"][0]["message"]["content"]
