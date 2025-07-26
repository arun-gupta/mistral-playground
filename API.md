# Mistral Playground API Documentation

This document provides comprehensive documentation for the Mistral Playground API endpoints.

## 🚀 Quick Start

### Base URL
```
http://localhost:8000/api/v1
```

### Interactive Documentation
When the server is running, visit: `http://localhost:8000/docs` for interactive API documentation.

## 📋 API Overview

The API is organized into the following main sections:
- **Models**: Model management, generation, and comparison
- **RAG**: Document upload and retrieval-augmented generation
- **Health**: System health and status checks
- **Configs**: Configuration management

## 🔐 Authentication

Currently, the API does not require authentication for local development. In production, consider implementing:
- API key authentication
- JWT tokens
- Rate limiting

## 📊 Models API

### Generate Response

Generate a response from a single model.

**Endpoint:** `POST /models/generate`

**Request Body:**
```json
{
  "prompt": "Explain quantum computing in simple terms",
  "model_name": "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
  "provider": "huggingface",
  "temperature": 0.7,
  "max_tokens": 500,
  "top_p": 0.9,
  "system_prompt": "You are a helpful AI assistant."
}
```

**Response:**
```json
{
  "text": "Quantum computing is a type of computing that uses quantum mechanics...",
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 150,
    "total_tokens": 165
  },
  "latency": 2.5,
  "model_name": "TheBloke/Mistral-7B-Instruct-v0.2-GGUF"
}
```

### Compare Models

Compare responses from multiple models side-by-side.

**Endpoint:** `POST /models/compare`

**Request Body:**
```json
{
  "prompt": "What is the capital of France?",
  "models": [
    "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
    "TheBloke/Meta-Llama-3-14B-Instruct-GGUF"
  ],
  "parameters": {
    "temperature": 0.7,
    "max_tokens": 200,
    "top_p": 0.9
  }
}
```

**Response:**
```json
{
  "prompt": "What is the capital of France?",
  "responses": [
    {
      "model_name": "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
      "text": "The capital of France is Paris.",
      "usage": {
        "prompt_tokens": 8,
        "completion_tokens": 10,
        "total_tokens": 18
      },
      "latency": 1.2
    },
    {
      "model_name": "TheBloke/Meta-Llama-3-14B-Instruct-GGUF",
      "text": "Paris is the capital of France.",
      "usage": {
        "prompt_tokens": 8,
        "completion_tokens": 9,
        "total_tokens": 17
      },
      "latency": 1.8
    }
  ],
  "comparison_id": "uuid-string"
}
```

### Get Available Models

Get a list of all available models with their current status.

**Endpoint:** `GET /models/available`

**Response:**
```json
[
  {
    "name": "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
    "provider": "huggingface",
    "is_loaded": true,
    "is_downloading": false,
    "download_progress": 100.0,
    "size_on_disk": "4.2GB",
    "last_used": "2024-01-15T10:30:00Z",
    "load_time": "2024-01-15T10:25:00Z"
  }
]
```

### Get Model List

Get a simple list of all available model names.

**Endpoint:** `GET /models/list`

**Response:**
```json
[
  "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
  "TheBloke/Meta-Llama-3-14B-Instruct-GGUF",
  "google/gemma-2b-it"
]
```

### Get Model Information

Get detailed information about all available models.

**Endpoint:** `GET /models/info`

**Response:**
```json
[
  {
    "name": "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
    "description": "CPU-optimized Mistral 7B instruction model",
    "parameters": "7B",
    "context_length": "8192",
    "license": "Apache 2.0",
    "tags": ["instruction-tuned", "cpu-optimized", "gguf"],
    "recommended": true
  }
]
```

### Download Model

Download a model to local storage.

**Endpoint:** `POST /models/download`

**Request Body:**
```json
{
  "model_name": "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
  "provider": "huggingface"
}
```

**Response:**
```json
{
  "model_name": "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
  "status": "downloading",
  "progress": 0.0,
  "message": "Download started"
}
```

### Get Download Status

Check the download progress of a model.

**Endpoint:** `GET /models/download-status/{model_name}`

**Response:**
```json
{
  "model_name": "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
  "status": "downloading",
  "progress": 45.2,
  "message": "Downloading model files..."
}
```

### Test Endpoints

**Endpoint:** `GET /models/test`

**Response:**
```json
{
  "message": "API is working!",
  "status": "ok"
}
```

**Endpoint:** `GET /models/mock-status`

**Response:**
```json
{
  "mock_mode": false,
  "message": "Mock mode is disabled - using real models"
}
```

## 📚 RAG API

### Query RAG System

Query the RAG system with a question and get grounded answers.

**Endpoint:** `POST /rag/query`

**Request Body:**
```json
{
  "query": "What are the main benefits of quantum computing?",
  "collection_name": "quantum-computing-docs",
  "model_name": "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
  "provider": "huggingface",
  "temperature": 0.7,
  "max_tokens": 500,
  "top_k": 3
}
```

**Response:**
```json
{
  "query": "What are the main benefits of quantum computing?",
  "answer": "Based on the documents, quantum computing offers several key benefits...",
  "retrieved_documents": [
    {
      "text": "Quantum computing can solve complex problems...",
      "metadata": {
        "source": "quantum-intro.pdf",
        "chunk_index": 0,
        "chunk_size": 1000
      },
      "similarity_score": 0.95,
      "rank": 1
    }
  ],
  "model_response": {
    "text": "Based on the documents, quantum computing offers several key benefits...",
    "tokens_used": 150,
    "latency_ms": 2500
  }
}
```

### Upload Document

Upload and process a document for RAG.

**Endpoint:** `POST /rag/upload`

**Form Data:**
- `file`: PDF, TXT, or MD file
- `collection_name`: Name for the collection (default: "default")
- `description`: Optional description
- `tags`: JSON array of tags (optional)
- `is_public`: "true" or "false" (default: "false")
- `chunk_size`: Integer (default: 1000)
- `chunk_overlap`: Integer (default: 200)

**Response:**
```json
{
  "collection_name": "quantum-computing-docs",
  "document_name": "quantum-intro.pdf",
  "chunks_processed": 15,
  "collection_size": 15
}
```

### List Collections

Get all available RAG collections.

**Endpoint:** `GET /rag/collections`

**Response:**
```json
[
  {
    "name": "quantum-computing-docs",
    "description": "Collection of quantum computing research papers",
    "tags": ["research", "quantum", "computing"],
    "document_count": 1,
    "chunk_count": 15,
    "total_size_mb": 2.5,
    "created_at": "2024-01-15T10:00:00Z",
    "last_updated": "2024-01-15T10:00:00Z",
    "last_queried": "2024-01-15T10:30:00Z",
    "is_public": false,
    "owner": "user123"
  }
]
```

### Delete Collection

Delete a RAG collection.

**Endpoint:** `DELETE /rag/collections/{collection_name}`

**Response:**
```json
{
  "message": "Collection deleted successfully",
  "collection_name": "quantum-computing-docs"
}
```

## 🏥 Health API

### Health Check

Check if the API is running and healthy.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

## ⚙️ Configs API

### Get Configuration

Get current system configuration.

**Endpoint:** `GET /configs`

**Response:**
```json
{
  "model_provider": "huggingface",
  "default_model": "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
  "device": "cpu",
  "mock_mode": false,
  "telemetry_enabled": false
}
```

### Update Configuration

Update system configuration.

**Endpoint:** `POST /configs`

**Request Body:**
```json
{
  "model_provider": "huggingface",
  "default_model": "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
  "temperature": 0.7,
  "max_tokens": 500
}
```

**Response:**
```json
{
  "message": "Configuration updated successfully",
  "updated_fields": ["model_provider", "default_model", "temperature", "max_tokens"]
}
```

## 🔧 Error Handling

All endpoints return appropriate HTTP status codes:

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request data
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error responses include a detail message:

```json
{
  "detail": "Model 'invalid-model' not found"
}
```

## 📝 Request/Response Models

### PromptRequest
```json
{
  "prompt": "string",
  "model_name": "string",
  "provider": "string",
  "temperature": "float",
  "max_tokens": "integer",
  "top_p": "float",
  "system_prompt": "string"
}
```

### ModelResponse
```json
{
  "text": "string",
  "usage": {
    "prompt_tokens": "integer",
    "completion_tokens": "integer",
    "total_tokens": "integer"
  },
  "latency": "float",
  "model_name": "string"
}
```

### RAGRequest
```json
{
  "query": "string",
  "collection_name": "string",
  "model_name": "string",
  "provider": "string",
  "temperature": "float",
  "max_tokens": "integer",
  "top_k": "integer"
}
```

## 🚀 Usage Examples

### Python Example

```python
import requests

# Generate response
response = requests.post("http://localhost:8000/api/v1/models/generate", json={
    "prompt": "Explain quantum computing",
    "model_name": "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
    "provider": "huggingface",
    "temperature": 0.7,
    "max_tokens": 500
})

print(response.json()["text"])

# Compare models
comparison = requests.post("http://localhost:8000/api/v1/models/compare", json={
    "prompt": "What is AI?",
    "models": [
        "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
        "TheBloke/Meta-Llama-3-14B-Instruct-GGUF"
    ],
    "parameters": {
        "temperature": 0.7,
        "max_tokens": 200
    }
})

for response in comparison.json()["responses"]:
    print(f"{response['model_name']}: {response['text']}")
```

### cURL Example

```bash
# Generate response
curl -X POST "http://localhost:8000/api/v1/models/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain quantum computing",
    "model_name": "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
    "provider": "huggingface",
    "temperature": 0.7,
    "max_tokens": 500
  }'

# Upload document
curl -X POST "http://localhost:8000/api/v1/rag/upload" \
  -F "file=@document.pdf" \
  -F "collection_name=my-collection" \
  -F "description=My research documents" \
  -F "tags=[\"research\", \"ai\"]"
```

## 📊 Rate Limiting

Currently, there are no rate limits implemented. For production use, consider implementing:
- Request rate limiting per IP
- Model-specific rate limits
- User-based quotas

## 🔒 Security Considerations

- All endpoints are currently unauthenticated for development
- File uploads are limited to 50MB
- Supported file types: PDF, TXT, MD
- Input validation is performed on all endpoints
- Error messages are sanitized to prevent information leakage

## 📈 Monitoring

The API provides several monitoring endpoints:
- `/health` - Basic health check
- `/models/model-status` - Model loading status
- `/models/mock-status` - Mock mode status

Consider implementing additional monitoring for:
- Request/response times
- Error rates
- Model performance metrics
- Resource usage 