from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class ModelResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    """Response model for single model inference"""
    text: str = Field(..., description="Generated text")
    model_name: str = Field(..., description="Model used")
    provider: str = Field(..., description="Model provider")
    tokens_used: int = Field(..., description="Total tokens used")
    input_tokens: int = Field(..., description="Input tokens")
    output_tokens: int = Field(..., description="Output tokens")
    latency_ms: float = Field(..., description="Response latency in milliseconds")
    finish_reason: str = Field(..., description="Reason for generation finish")

class ComparisonResponse(BaseModel):
    """Response model for model comparison"""
    prompt: str = Field(..., description="Original prompt")
    responses: List[ModelComparison] = Field(..., description="Responses from different models")
    comparison_id: str = Field(..., description="Unique comparison identifier")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Comparison timestamp")

class RAGResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    """Response model for RAG-based inference"""
    query: str = Field(..., description="Original query")
    answer: str = Field(..., description="Generated answer")
    retrieved_documents: List[Dict[str, Any]] = Field(..., description="Retrieved document chunks")
    model_response: ModelResponse = Field(..., description="Model response details")

class DocumentChunk(BaseModel):
    """Model for document chunks"""
    text: str = Field(..., description="Chunk text")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Chunk metadata")
    embedding: Optional[List[float]] = Field(None, description="Chunk embedding")

class CollectionInfo(BaseModel):
    """Model for collection information"""
    name: str = Field(..., description="Collection name")
    document_count: int = Field(..., description="Number of documents")
    embedding_dimension: int = Field(..., description="Embedding dimension")
    created_at: datetime = Field(..., description="Creation timestamp")

class PromptConfig(BaseModel):
    """Model for saved prompt configurations"""
    id: str = Field(..., description="Configuration ID")
    name: str = Field(..., description="Configuration name")
    description: Optional[str] = Field(None, description="Configuration description")
    prompt: str = Field(..., description="Prompt template")
    system_prompt: Optional[str] = Field(None, description="System prompt")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Default parameters")
    tags: List[str] = Field(default_factory=list, description="Tags")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")

class ModelInfo(BaseModel):
    """Model for model information"""
    name: str = Field(..., description="Model name")
    provider: str = Field(..., description="Model provider")
    context_length: int = Field(..., description="Maximum context length")
    parameters: str = Field(..., description="Model parameters (e.g., '7B', '8x7B')")
    quantization: Optional[str] = Field(None, description="Quantization type")
    license: Optional[str] = Field(None, description="Model license")
    description: Optional[str] = Field(None, description="Model description")

class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str = Field(..., description="Service status")
    service: str = Field(..., description="Service name")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Health check timestamp")
    version: str = Field(..., description="Service version")

class ErrorResponse(BaseModel):
    """Response model for errors"""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Error details")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")

class ModelStatus(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    """Response model for model status"""
    name: str = Field(..., description="Model name")
    provider: str = Field(..., description="Model provider")
    is_loaded: bool = Field(..., description="Whether model is loaded in memory")
    is_downloading: bool = Field(..., description="Whether model is currently downloading")
    download_progress: Optional[float] = Field(None, description="Download progress percentage")
    size_on_disk: Optional[str] = Field(None, description="Size of model on disk")
    last_used: Optional[str] = Field(None, description="Last time model was used")
    load_time: Optional[float] = Field(None, description="Time taken to load model")

class ModelDownloadResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    """Response model for model download operations"""
    model_name: str = Field(..., description="Name of the model")
    provider: str = Field(..., description="Model provider")
    status: str = Field(..., description="Download status")
    progress: Optional[float] = Field(None, description="Download progress percentage")
    message: str = Field(..., description="Status message")
    download_size: Optional[str] = Field(None, description="Size of download")
    estimated_time: Optional[str] = Field(None, description="Estimated time remaining")
    timestamp: str = Field(..., description="Timestamp of the response")

class ModelComparison(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    """Response model for model comparison results"""
    model_name: str = Field(..., description="Model name")
    provider: str = Field(..., description="Model provider")
    text: str = Field(..., description="Generated text")
    parameters: Dict[str, Any] = Field(..., description="Generation parameters")
    usage: Dict[str, int] = Field(..., description="Token usage")
    latency: float = Field(..., description="Response latency in seconds") 