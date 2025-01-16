from fastapi import FastAPI, Request, HTTPException, Cookie, APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from supabase import create_client, Client
from app.services import openai_service
from dotenv import load_dotenv
import os

load_dotenv()

router = APIRouter()
# Set up Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@router.post("/openai/chat/")
async def chat_with_openai(prompt: str):
    response = await openai_service.get_openai_response(prompt)
    return {"response": response}
