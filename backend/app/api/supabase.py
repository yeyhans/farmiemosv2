from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.supabase_service import supabase

router = APIRouter()

# Modelo para la tabla test_table
class TestTable(BaseModel):
    id: Optional[int] = None  # Opcional para creación
    name: str
    description: str
    value: float

@router.post("/supabase/create", response_model=TestTable)
async def create_entry(entry: TestTable):
    try:
        response = supabase.table("test_table").insert(entry.dict()).execute()
        if response.get("status_code") == 200:
            return response.get("data")[0]
        raise HTTPException(status_code=400, detail="Error al insertar registro.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/supabase/read", response_model=List[TestTable])
async def read_entries():
    try:
        response = supabase.table("test_table").select("*").execute()
        if response.get("status_code") == 200:
            return response.get("data")
        raise HTTPException(status_code=400, detail="Error al leer registros.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/supabase/read/{entry_id}", response_model=TestTable)
async def read_entry(entry_id: int):
    try:
        response = supabase.table("test_table").select("*").eq("id", entry_id).execute()
        if response.get("status_code") == 200 and response.get("data"):
            return response.get("data")[0]
        raise HTTPException(status_code=404, detail="Registro no encontrado.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/supabase/update/{entry_id}", response_model=TestTable)
async def update_entry(entry_id: int, entry: TestTable):
    try:
        response = supabase.table("test_table").update(entry.dict()).eq("id", entry_id).execute()
        if response.get("status_code") == 200 and response.get("data"):
            return response.get("data")[0]
        raise HTTPException(status_code=400, detail="Error al actualizar registro.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/supabase/delete/{entry_id}")
async def delete_entry(entry_id: int):
    try:
        response = supabase.table("test_table").delete().eq("id", entry_id).execute()
        if response.get("status_code") == 200:
            return {"message": "Registro eliminado exitosamente"}
        raise HTTPException(status_code=400, detail="Error al eliminar registro.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
