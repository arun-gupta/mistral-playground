from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
import os
import tempfile

from app.models.requests import RAGRequest
from app.models.responses import RAGResponse, CollectionInfo
from app.services.rag_service import rag_service

router = APIRouter()

@router.post("/query", response_model=RAGResponse)
async def query_rag(request: RAGRequest):
    """Query RAG system with document retrieval and generation"""
    try:
        response = await rag_service.query_rag(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    collection_name: str = "default",
    chunk_size: int = 1000,
    chunk_overlap: int = 200
):
    """Upload and process a document for RAG"""
    try:
        # Validate file type
        allowed_extensions = ['.pdf', '.txt', '.md']
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type. Allowed: {allowed_extensions}"
            )
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Process document
            result = await rag_service.process_document(
                temp_file_path,
                collection_name,
                chunk_size,
                chunk_overlap
            )
            return result
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/collections", response_model=List[CollectionInfo])
async def list_collections():
    """List all RAG collections"""
    try:
        return rag_service.list_collections()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/collections/{collection_name}")
async def delete_collection(collection_name: str):
    """Delete a RAG collection"""
    try:
        success = rag_service.delete_collection(collection_name)
        if success:
            return {"message": f"Collection '{collection_name}' deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail=f"Collection '{collection_name}' not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/collections/{collection_name}/stats")
async def get_collection_stats(collection_name: str):
    """Get statistics for a collection"""
    try:
        return rag_service.get_collection_stats(collection_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 