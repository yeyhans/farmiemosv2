from fastapi import FastAPI
from app.api import openai  # Asegúrate de que 'app' está siendo importado correctamente
from app.api.supabase import router as supabase_router

# Inicializar la aplicación FastAPI
app = FastAPI()

# Incluir las rutas desde el router de OpenAI
app.include_router(openai.router)  # Asegúrate de que 'openai.router' esté definido
app.include_router(supabase_router)
