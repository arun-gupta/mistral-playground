from pydantic_settings import BaseSettings
from typing import List, Optional
import json

class Settings(BaseSettings):
    # Model Configuration
    MODEL_PROVIDER: str = "huggingface"  # Changed from vllm to huggingface for CPU setup
    MODEL_NAME: str = "microsoft/DialoGPT-small"  # Smaller model for CPU setup
    DEVICE: str = "cpu"  # Changed from cuda to cpu for CPU setup
    
    # Vector Database
    CHROMA_PERSIST_DIRECTORY: str = "./chroma_db"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    
    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # Optional: Hugging Face API
    HUGGINGFACE_API_KEY: Optional[str] = None
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Development/Testing
    MOCK_MODE: bool = False  # Set to True to use mock responses instead of real models
    
    # Telemetry/Privacy
    DISABLE_TELEMETRY: bool = True  # Disable all telemetry collection
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Parse CORS_ORIGINS if it's a string
        if isinstance(self.CORS_ORIGINS, str):
            try:
                self.CORS_ORIGINS = json.loads(self.CORS_ORIGINS)
            except json.JSONDecodeError:
                self.CORS_ORIGINS = [self.CORS_ORIGINS]

# Create settings instance
settings = Settings() 