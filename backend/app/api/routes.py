from fastapi import APIRouter
from .endpoints import models, rag, configs, health

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(health.router, tags=["health"])
api_router.include_router(models.router, prefix="/models", tags=["models"])
api_router.include_router(rag.router, prefix="/rag", tags=["rag"])
api_router.include_router(configs.router, prefix="/configs", tags=["configs"]) 