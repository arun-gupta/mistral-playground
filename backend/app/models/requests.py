from pydantic import BaseModel, Field, validator, ConfigDict
from typing import Optional, List, Dict, Any
from enum import Enum

class ModelProvider(str, Enum):
    VLLM = "vllm"
    HUGGINGFACE = "huggingface"
    OLLAMA = "ollama"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"

class PromptRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    prompt: str = Field(..., description="The input prompt")
    system_prompt: Optional[str] = Field(None, description="Optional system prompt")
    model_name: Optional[str] = Field(None, description="Model name to use")
    provider: ModelProvider = Field(ModelProvider.HUGGINGFACE, description="Model provider")
    temperature: float = Field(0.7, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: int = Field(50, ge=1, le=8192, description="Maximum number of tokens to generate")
    top_p: float = Field(0.9, ge=0.0, le=1.0, description="Top-p sampling parameter")

    @validator('max_tokens')
    def validate_max_tokens(cls, v):
        if v < 1:
            raise ValueError('max_tokens must be at least 1')
        if v > 8192:
            raise ValueError('max_tokens cannot exceed 8192')
        return v

    @validator('temperature')
    def validate_temperature(cls, v):
        if v < 0.0 or v > 2.0:
            raise ValueError('temperature must be between 0.0 and 2.0')
        return v

    @validator('top_p')
    def validate_top_p(cls, v):
        if v < 0.0 or v > 1.0:
            raise ValueError('top_p must be between 0.0 and 1.0')
        return v

class ComparisonRequest(BaseModel):
    """Request model for comparing multiple models"""
    prompt: str = Field(..., description="The input prompt")
    system_prompt: Optional[str] = Field(None, description="System prompt")
    models: List[str] = Field(..., description="List of model names to compare")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Generation parameters")

class RAGRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    """Request model for RAG-based inference"""
    query: str = Field(..., description="The query for RAG")
    collection_name: str = Field(..., description="ChromaDB collection name")
    model_name: Optional[str] = Field(None, description="Model name to use for generation")
    provider: Optional[str] = Field("huggingface", description="Model provider")
    top_k: int = Field(5, ge=1, le=20, description="Number of documents to retrieve")
    temperature: float = Field(0.7, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: int = Field(1024, ge=1, le=8192, description="Maximum tokens to generate")

class DocumentUploadRequest(BaseModel):
    """Request model for document upload"""
    collection_name: str = Field(..., description="ChromaDB collection name")
    chunk_size: int = Field(1000, ge=100, le=5000, description="Text chunk size")
    chunk_overlap: int = Field(200, ge=0, le=1000, description="Chunk overlap")

class PromptConfigSaveRequest(BaseModel):
    """Request model for saving prompt configurations"""
    name: str = Field(..., description="Configuration name")
    description: Optional[str] = Field(None, description="Configuration description")
    prompt: str = Field(..., description="The prompt template")
    system_prompt: Optional[str] = Field(None, description="System prompt")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Default parameters")
    tags: List[str] = Field(default_factory=list, description="Tags for organization")

class ModelDownloadRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    """Request model for downloading models"""
    model_name: str = Field(..., description="Name of the model to download")
    provider: str = Field("huggingface", description="Model provider")
    force_redownload: bool = Field(False, description="Force re-download even if already present") 