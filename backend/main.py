import warnings

# Suppress warnings early
warnings.filterwarnings("ignore", message="Failed to send telemetry event")
warnings.filterwarnings("ignore", message="urllib3 v2 only supports OpenSSL 1.1.1+")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
from dotenv import load_dotenv

from .app.core.config import settings
from .app.api.routes import api_router

# Monkey patch telemetry to prevent errors
import sys
import os
from types import ModuleType

# Redirect stderr to suppress telemetry warnings
class SuppressTelemetry:
    def __enter__(self):
        self.original_stderr = sys.stderr
        sys.stderr = open(os.devnull, 'w')
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        sys.stderr.close()
        sys.stderr = self.original_stderr

# Suppress telemetry during imports
with SuppressTelemetry():
    try:
        import chromadb
        # Patch ChromaDB telemetry
        if hasattr(chromadb, 'telemetry'):
            chromadb.telemetry.capture = lambda *args, **kwargs: None
    except ImportError:
        pass
    
    try:
        import posthog
        posthog.capture = lambda *args, **kwargs: None
    except ImportError:
        pass

# Load environment variables
load_dotenv()

# Disable telemetry for all dependencies
os.environ["DISABLE_TELEMETRY"] = "1"
os.environ["ANONYMIZED_TELEMETRY"] = "false"
os.environ["POSTHOG_DISABLED"] = "1"
os.environ["HUGGINGFACE_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["CHROMA_TELEMETRY"] = "false"
os.environ["CHROMA_DISABLE_TELEMETRY"] = "true"
os.environ["CHROMA_ANONYMIZED_TELEMETRY"] = "false"
os.environ["CHROMA_SERVER_TELEMETRY"] = "false"
os.environ["CHROMA_CLIENT_TELEMETRY"] = "false"
os.environ["CHROMA_DISABLE_ANONYMIZED_TELEMETRY"] = "true"
os.environ["CHROMA_DISABLE_SERVER_TELEMETRY"] = "true"
os.environ["CHROMA_DISABLE_CLIENT_TELEMETRY"] = "true"
os.environ["CHROMA_DISABLE_TELEMETRY_EVENTS"] = "true"
os.environ["CHROMA_DISABLE_ALL_TELEMETRY"] = "true"
os.environ["CHROMA_TELEMETRY_ENABLED"] = "false"
os.environ["CHROMA_ENABLE_TELEMETRY"] = "false"
os.environ["CHROMA_COLLECT_TELEMETRY"] = "false"
os.environ["CHROMA_SEND_TELEMETRY"] = "false"

# Create FastAPI app
app = FastAPI(
    title="Mistral Playground & Model Explorer",
    description="A comprehensive tool for exploring and experimenting with Mistral's open models",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "mistral-playground"}

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Mistral Playground & Model Explorer API",
        "version": "1.0.0",
        "docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True,
        log_level=settings.LOG_LEVEL.lower()
    ) 