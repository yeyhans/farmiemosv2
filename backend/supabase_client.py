from supabase import create_client
import os

# Configuración de Supabase
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_API_KEY")

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise Exception("No se pudo obtener la URL o clave de Supabase desde las variables de entorno.")
    return create_client(url, key)
