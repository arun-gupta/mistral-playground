from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import List
import os
import tempfile
import json

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
    collection_name: str = Form("default"),
    description: str = Form(None),
    tags: str = Form(None),
    is_public: str = Form("false"),
    chunk_size: int = Form(1000),
    chunk_overlap: int = Form(200)
):
    """Upload and process a document for RAG"""
    temp_file_path = None  # Initialize variable
    try:

        
        # Validate and sanitize collection name
        import re
        # Remove or replace invalid characters
        sanitized_collection_name = re.sub(r'[^a-zA-Z0-9_-]', '_', collection_name)
        # Ensure it starts and ends with alphanumeric
        sanitized_collection_name = re.sub(r'^[^a-zA-Z0-9]+', '', sanitized_collection_name)
        sanitized_collection_name = re.sub(r'[^a-zA-Z0-9]+$', '', sanitized_collection_name)
        # Ensure it's between 3-63 characters
        if len(sanitized_collection_name) < 3:
            sanitized_collection_name = f"col_{sanitized_collection_name}"
        if len(sanitized_collection_name) > 63:
            sanitized_collection_name = sanitized_collection_name[:63]
        
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
            
            # Check file size (limit to 50MB)
            if len(content) > 50 * 1024 * 1024:
                raise HTTPException(
                    status_code=400, 
                    detail="File too large. Maximum size is 50MB."
                )
            
            # Check if file is empty
            if len(content) == 0:
                raise HTTPException(
                    status_code=400, 
                    detail="File is empty. Please upload a file with content."
                )
            
            temp_file.write(content)
            temp_file_path = temp_file.name
            

        
        try:
            # Parse metadata
            parsed_tags = []
            if tags:
                try:
                    parsed_tags = json.loads(tags)
                except json.JSONDecodeError:
                    parsed_tags = []
            
            is_public_bool = is_public.lower() == "true"
            
            # Process document with metadata
            try:
                result = await rag_service.process_document(
                    temp_file_path,
                    sanitized_collection_name,
                    chunk_size,
                    chunk_overlap,
                    description=description,
                    tags=parsed_tags,
                    is_public=is_public_bool
                )
                return result
            except Exception as process_error:
                # Provide more detailed error information
                error_msg = f"Document processing failed: {str(process_error)}"
                if "cannot open broken document" in str(process_error):
                    error_msg = "The uploaded file appears to be corrupted or is not a valid PDF. Please check the file and try again."
                elif "Unsupported file format" in str(process_error):
                    error_msg = "The file format is not supported. Please upload a PDF, TXT, or MD file."
                raise HTTPException(status_code=400, detail=error_msg)
        finally:
            # Clean up temporary file
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                    print(f"🧹 Cleaned up temporary file: {temp_file_path}")
                except Exception as cleanup_error:
                    print(f"⚠️ Failed to clean up temporary file: {cleanup_error}")
            
    except Exception as e:
        print(f"❌ Upload endpoint error: {e}")
        import traceback
        traceback.print_exc()
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

@router.put("/collections/{collection_name}")
async def update_collection(
    collection_name: str,
    description: str = None,
    tags: List[str] = None,
    is_public: bool = None
):
    """Update collection metadata"""
    try:
        result = rag_service.update_collection_metadata(
            collection_name, description, tags, is_public
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/collections/search")
async def search_collections(
    query: str = "",
    tags: List[str] = None,
    owner: str = None,
    is_public: bool = None
):
    """Search and filter collections"""
    try:
        return rag_service.search_collections(query, tags, owner, is_public)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/collections/{collection_name}/merge")
async def merge_collections(
    collection_name: str,
    source_collections: List[str]
):
    """Merge multiple collections into one"""
    try:
        result = rag_service.merge_collections(collection_name, source_collections)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/collections/bulk-delete")
async def bulk_delete_collections(collection_names: List[str]):
    """Delete multiple collections"""
    try:
        result = rag_service.bulk_delete_collections(collection_names)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/collections/{collection_name}/export")
async def export_collection(collection_name: str):
    """Export collection data"""
    try:
        return rag_service.export_collection(collection_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 