from fastapi import APIRouter
from backend.app.models.responses import HealthResponse

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        service="mistral-playground",
        version="1.0.0"
    ) 