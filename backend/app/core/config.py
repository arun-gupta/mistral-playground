from pydantic_settings import BaseSettings
from typing import List, Optional
import json
import os

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
    
    # Hosted Model API Keys
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Logging
    LOG_LEVEL: str = "INFO"
    

    
    # Telemetry/Privacy
    DISABLE_TELEMETRY: bool = True  # Disable all telemetry collection
    
    class Config:
        env_file = ".env"  # Will look in current directory and parent directories
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields from environment
    
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

# Debug: Print settings after creation
print(f"🔍 DEBUG: Settings created - HUGGINGFACE_API_KEY exists: {settings.HUGGINGFACE_API_KEY is not None}")
print(f"🔍 DEBUG: Settings created - HUGGINGFACE_API_KEY value: {settings.HUGGINGFACE_API_KEY[:10] if settings.HUGGINGFACE_API_KEY else 'None'}...")
print(f"🔍 DEBUG: Settings created - HUGGINGFACE_API_KEY is truthy: {bool(settings.HUGGINGFACE_API_KEY)}")
print(f"🔍 DEBUG: Current working directory: {os.getcwd()}")

# Check multiple possible .env file locations
possible_env_paths = [
    ".env",
    "../.env", 
    "../../.env",
    os.path.join(os.path.dirname(__file__), "../../.env"),
    os.path.join(os.path.dirname(__file__), "../../../.env")
]

for env_path in possible_env_paths:
    exists = os.path.exists(env_path)
    print(f"🔍 DEBUG: .env file at '{env_path}': {'EXISTS' if exists else 'NOT FOUND'}")
    if exists:
        print(f"🔍 DEBUG: Using .env file at: {os.path.abspath(env_path)}")
        break 