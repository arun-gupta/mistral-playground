# Architecture Documentation

## 🏗️ **System Architecture**

```
Frontend (React + Vite) → Backend (FastAPI) → Model Inference (vLLM/Ollama)
                                    ↓
                            Vector DB (ChromaDB)
                                    ↓
                            Document Processing
                                    ↓
                            Embeddings (SentenceTransformers)
```

## 🎯 **Component Overview**

### **Frontend Layer**
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: TailwindCSS with shadcn/ui components
- **State Management**: React hooks (useState, useEffect)
- **HTTP Client**: Fetch API with AbortController for request cancellation

### **Backend Layer**
- **Framework**: FastAPI with Python 3.11+
- **Validation**: Pydantic models for request/response validation
- **Documentation**: Automatic OpenAPI/Swagger documentation
- **CORS**: Configured for cross-origin requests
- **Logging**: Structured logging with configurable levels
- **Services**:
  - **ModelService**: Handles model inference across different providers
  - **DownloadService**: Manages model downloads with progress tracking and persistent storage
  - **RAGService**: Handles document processing and retrieval-augmented generation

### **Model Inference Layer**
- **Primary**: Hugging Face Transformers for CPU inference
- **GPU Acceleration**: vLLM for high-performance GPU inference
- **Alternative**: Ollama for easy local model management
- **Quantized Models**: ctransformers for GGUF model support

### **Vector Database**
- **Primary Engine**: ChromaDB for document storage and retrieval
- **Fallback Engine**: FAISS for environments with ChromaDB compatibility issues (e.g., Codespaces)
- **Embeddings**: SentenceTransformers for text embedding
- **Persistence**: Local file-based storage with configurable directory
- **Automatic Fallback**: System automatically switches to FAISS when ChromaDB fails to initialize

### **Document Processing**
- **Formats**: PDF, TXT, MD support
- **Processing**: PyMuPDF for PDF parsing
- **Chunking**: Configurable chunk size and overlap
- **Metadata**: Support for document metadata and tags

## 🔧 **Tech Stack Details**

### **Frontend Technologies**
- **React 18**: Modern React with concurrent features
- **TypeScript**: Type-safe JavaScript development
- **Vite**: Fast build tool and development server
- **TailwindCSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality React components
- **React Router**: Client-side routing
- **React Markdown**: Markdown rendering with syntax highlighting

### **Backend Technologies**
- **FastAPI**: Modern Python web framework
- **Pydantic**: Data validation and settings management
- **Uvicorn**: ASGI server for FastAPI
- **Python-dotenv**: Environment variable management
- **Tenacity**: Retry logic for robust API calls
- **Aiofiles**: Asynchronous file operations

### **AI/ML Technologies**
- **Transformers**: Hugging Face's library for state-of-the-art NLP
- **Torch**: PyTorch for deep learning operations
- **Accelerate**: Hugging Face's library for distributed training
- **ctransformers**: CPU-optimized inference for GGUF models
- **vLLM**: High-performance inference server (GPU)
- **SentenceTransformers**: Text embedding models

### **Database & Storage**
- **ChromaDB**: Vector database for similarity search
- **SQLite**: Lightweight database for metadata (if needed)
- **File System**: Local storage for models and documents

### **Development & Deployment**
- **Docker**: Containerization for consistent environments
- **Docker Compose**: Multi-service orchestration
- **GitHub Codespaces**: Cloud development environment
- **Git**: Version control and collaboration

## 📁 **Project Structure**

```
mistral-playground/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/               # API routes and endpoints
│   │   │   ├── endpoints/     # Individual endpoint modules
│   │   │   └── routes.py      # Route aggregation
│   │   ├── core/              # Core configuration
│   │   ├── models/            # Pydantic models
│   │   └── services/          # Business logic services
│   │       ├── model_service.py      # Model inference service
│   │       ├── download_service.py   # Model download management
│   │       └── rag_service.py        # RAG functionality
│   ├── main.py                # FastAPI application entry point
│   └── requirements*.txt      # Python dependencies
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/        # Reusable React components
│   │   ├── pages/             # Page components
│   │   ├── lib/               # Utility functions
│   │   └── types/             # TypeScript type definitions
│   ├── package.json           # Node.js dependencies
│   └── vite.config.ts         # Vite configuration
├── .devcontainer/              # GitHub Codespaces configuration
├── scripts/                    # Utility scripts
├── docs/                       # Documentation
└── README.md                   # Main project documentation
```

## 🔄 **Data Flow**

### **Model Inference Flow**
1. **User Input**: User enters prompt in frontend
2. **API Request**: Frontend sends POST request to `/api/v1/models/generate`
3. **Request Validation**: Backend validates request with Pydantic models
4. **Model Selection**: Backend selects appropriate model based on request
5. **Inference**: Model generates response using selected inference engine
6. **Response Processing**: Backend formats response with metadata
7. **API Response**: Frontend receives and displays response

### **RAG Flow**
1. **Document Upload**: User uploads document via frontend
2. **Document Processing**: Backend processes and chunks document
3. **Embedding Generation**: Text chunks are converted to embeddings
4. **Vector Storage**: Embeddings stored in ChromaDB (or FAISS fallback)
5. **Query Processing**: User query converted to embedding
6. **Similarity Search**: Vector database finds relevant document chunks
7. **Response Generation**: Model generates response using retrieved context

**Vector Database Selection**:
- **Primary**: ChromaDB with full metadata support
- **Fallback**: FAISS with basic similarity search
- **Automatic**: System chooses based on environment compatibility

### **Model Management Flow**
1. **Model Discovery**: Backend fetches available models from providers
2. **Status Tracking**: Real-time tracking of model download/load status via DownloadService
3. **User Selection**: User selects models to download/load with three-state workflow:
   - **Not Downloaded**: "Download & Load" button for one-step setup
   - **Downloaded**: "Load Model" button to load into memory
   - **Ready**: "Use Now" button to navigate to Playground
4. **Background Processing**: 
   - DownloadService handles model downloads with progress tracking
   - ModelService manages model loading into memory
   - Persistent storage tracks download completion
5. **Status Updates**: Frontend receives real-time status updates for both download and loading operations

### **Download Service Architecture**
1. **Persistent Storage**: Models tracked in `./models/` directory with completion markers
2. **Progress Tracking**: Real-time download progress with estimated time calculation
3. **Async Operations**: Non-blocking downloads that don't freeze the server
4. **State Management**: Tracks active downloads, completed downloads, and failed downloads
5. **Error Handling**: Graceful error handling with user-friendly messages
6. **Concurrent Downloads**: Supports multiple simultaneous downloads with resource management

## 🔒 **Security Architecture**

### **Authentication & Authorization**
- **JWT Tokens**: Secure token-based authentication
- **Secret Key Management**: Environment-based secret configuration
- **CORS Configuration**: Controlled cross-origin access
- **Input Validation**: Comprehensive request validation

### **Data Security**
- **Environment Variables**: Sensitive configuration externalized
- **File Upload Validation**: Strict file type and size validation
- **Model Isolation**: Models run in isolated environments
- **Error Handling**: Secure error messages without information leakage

## 📊 **Performance Considerations**

### **Frontend Performance**
- **Code Splitting**: Lazy loading of components and routes
- **Bundle Optimization**: Vite's optimized builds
- **Caching**: Browser caching for static assets
- **Request Cancellation**: AbortController for pending requests

### **Backend Performance**
- **Async Processing**: Non-blocking I/O operations
- **Model Caching**: In-memory model caching
- **Connection Pooling**: Efficient database connections
- **Response Streaming**: Streaming for large responses

### **Model Inference Performance**
- **GPU Acceleration**: vLLM for high-performance inference
- **Model Quantization**: GGUF models for CPU optimization
- **Batch Processing**: Efficient batch inference
- **Memory Management**: Optimized memory usage

## 🔧 **Configuration Management**

### **Environment Configuration**
- **Development**: Local `.env` files for development
- **Production**: Environment variables for production
- **Codespaces**: Automatic configuration for cloud development
- **Docker**: Container-specific configuration

### **Model Configuration**
- **Provider Selection**: Configurable model providers
- **Device Selection**: CPU/GPU device configuration
- **Model Parameters**: Configurable inference parameters
- **Fallback Logic**: Automatic fallback to compatible models

## 🚀 **Deployment Options**

### **Local Development**
- **Direct Execution**: Running services directly on local machine
- **Docker Compose**: Containerized local development
- **Virtual Environments**: Isolated Python environments

### **Cloud Deployment**
- **GitHub Codespaces**: Cloud development environment
- **Docker Containers**: Containerized deployment
- **Cloud Platforms**: Deployable to various cloud providers

### **Production Considerations**
- **Load Balancing**: Multiple backend instances
- **Database Scaling**: Distributed vector database
- **Model Serving**: Dedicated model serving infrastructure
- **Monitoring**: Application and model performance monitoring

## 📈 **Scalability Architecture**

### **Horizontal Scaling**
- **Stateless Backend**: Backend services can be scaled horizontally
- **Load Balancing**: Multiple backend instances behind load balancer
- **Database Scaling**: Distributed ChromaDB for large-scale deployments

### **Vertical Scaling**
- **GPU Resources**: Additional GPU resources for model inference
- **Memory Optimization**: Efficient memory usage for large models
- **Storage Scaling**: Scalable storage for models and documents

### **Model Serving Optimization**
- **Model Caching**: Intelligent model caching strategies
- **Request Queuing**: Queue-based request processing
- **Resource Management**: Dynamic resource allocation 

## 🔄 **Fallback Strategies**

### **Vector Database Fallback**
The system implements intelligent fallback strategies to ensure reliability across different environments:

#### **Primary: ChromaDB**
- **Use Case**: Production environments, local development with full dependencies
- **Features**: Full-featured vector database with metadata support
- **Persistence**: Built-in persistent storage
- **Query Capabilities**: Advanced filtering and metadata queries

#### **Fallback: FAISS**
- **Use Case**: Codespaces, environments with SQLite version conflicts, minimal dependency setups
- **Features**: Lightweight, fast similarity search
- **Persistence**: Custom pickle-based storage
- **Compatibility**: Works reliably in restricted environments

#### **Automatic Detection**
- **Initialization**: System attempts ChromaDB first
- **Failure Handling**: Graceful fallback to FAISS if ChromaDB fails
- **User Notification**: Clear messaging about which vector database is being used
- **Feature Parity**: Both systems provide the same core RAG functionality

### **Model Inference Fallback**
- **Primary**: vLLM for GPU acceleration
- **Fallback**: Hugging Face Transformers for CPU inference
- **Alternative**: Ollama for easy local model management
- **Quantized**: ctransformers for GGUF models

### **Document Processing Fallback**
- **Primary**: PyMuPDF for PDF processing
- **Fallback**: Basic text extraction for unsupported formats
- **Error Handling**: Graceful degradation with user feedback 