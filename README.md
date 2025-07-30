# AI Model Playground & Explorer

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/arun-gupta/mistral-playground)

> 💡 **Tip**: Right-click the "Open in GitHub Codespaces" button and select "Open in new tab" for the best experience.

A modern, developer-friendly full-stack application for exploring and experimenting with both local and hosted AI models. Built with performance and usability in mind, this playground provides comprehensive tools to understand model capabilities, performance characteristics, and real-world applications. It offers support for popular open source AI models (Mistral, Llama, Gemma, DialoGPT) and hosted models (OpenAI, Anthropic, Google), making it a versatile platform for model exploration and comparison.

## 🎯 **Key Features**

### **Model Management & Inference**
- **Multi-Model Support**: Run both local and hosted models with optimized inference
- **Hosted Models Integration**: Seamless access to OpenAI, Anthropic, and Google models
- **Smart Model Manager**: Download, manage, and monitor local models with real-time status tracking
- **Performance Analytics**: Detailed metrics for model performance, token usage, and latency
- **Comparison Engine**: Compare responses from multiple models side-by-side with prepared test scenarios
- **CPU Compatibility**: Optimized for CPU-only environments with automatic fallbacks

### **Advanced Capabilities**
- **RAG Mode**: Upload documents and generate grounded answers using Retrieval-Augmented Generation
  - **Multi-Format Support**: PDF, TXT, and Markdown files with intelligent chunking
  - **Robust Fallback System**: Works reliably in any environment (ChromaDB → FAISS → Simple In-Memory)
  - **Codespaces Optimized**: Fully functional RAG in GitHub Codespaces without complex setup
  - **Keyword-Based Search**: Intelligent document retrieval with relevance scoring
  - **Collection Management**: Organize, search, and manage document collections
- **Parameter Tuning**: Advanced control over generation parameters (temperature, max tokens, system prompts)
- **Conversational Interface**: Natural chat experience optimized for instruction-following models
- **Document Processing**: Support for PDF, TXT, and Markdown files with intelligent chunking

### **Developer Experience**
- **Modern UI**: Clean, responsive interface built with React and TailwindCSS
- **Real-time Status**: Visual indicators for download, loading, and inference status
- **Organized Workflow**: Intuitive model organization with filtering and sorting
- **API Key Management**: Centralized configuration for hosted model API keys
- **Mock Mode**: Test the interface without heavy downloads or compute requirements
- **Environment Agnostic**: Works seamlessly in local development, Docker, and GitHub Codespaces
- **Timeout Protection**: Automatic handling of long-running operations with user feedback

## 🚀 **Quick Start**

### **Option 1: GitHub Codespaces (Recommended)**
1. **Right-click the "Open in GitHub Codespaces" button above and select "Open in new tab"** (for best experience)
2. **Wait for setup to complete** (2-3 minutes)
3. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

**💡 RAG functionality works out-of-the-box in Codespaces with automatic fallback!**

### **Option 2: Local Development**
```bash
git clone https://github.com/arun-gupta/mistral-playground
cd mistral-playground
chmod +x setup-and-start.sh
./setup-and-start.sh
```

**💡 One command does everything: setup + startup!**

## 📚 **Documentation**

- **[Setup & Installation](SETUP.md)** - Detailed setup instructions and configuration
- **[Model Support Guide](MODEL_SUPPORT.md)** - Complete model information and selection guide
- **[Troubleshooting](TROUBLESHOOTING.md)** - Common issues and solutions
- **[Architecture](ARCHITECTURE.md)** - System architecture and technical details
- **[API Documentation](API.md)** - Complete API reference

## 🚀 **Roadmap**

### **Phase 1: Enhanced Experience**
- **🎭 Multi-Modal Support**: Image + text analysis capabilities
- **🔄 Conversation Memory**: Persistent chat sessions with context management
- **📊 Performance Dashboard**: Detailed analytics and performance insights

### **Phase 2: Advanced Features**  
- **🎯 Prompt Engineering**: Pre-built templates and prompt optimization tools
- **🌐 API Integration**: External service integration and function calling
- **🎨 Creative Studio**: Story generation, code generation, and creative tasks

### **Phase 3: Enterprise Features**
- **🔧 Fine-tuning Interface**: Custom model training and optimization
- **📝 Advanced Document Processing**: Document analysis and summarization
- **🤖 Agent Framework**: Multi-agent systems and automation

## 🖥️ **Application Navigation**

The main navigation is designed for efficient model exploration:
- **Playground**: Mistral-only playground for focused experimentation
- **Models**: Manage local models and access hosted models with organized grouping
- **Comparison**: Compare responses from multiple models (local + hosted) side-by-side
- **RAG**: Mistral-only RAG for grounded Q&A from documents
- **API Keys**: Centralized configuration for hosted model API keys

## 🚦 **Model Status Workflow**

Models follow a streamlined three-state workflow:

### **Local Models**

#### **State 1: Not Downloaded** ⏳
- **Status**: Model is available but not yet downloaded
- **Action**: Click "📥 Download & Load" to download and load in one step
- **Progress**: Shows download progress with percentage

#### **State 2: Downloaded** 📦  
- **Status**: Model is downloaded to disk, ready to load into memory
- **Action**: Click "⚡ Load Model" to load into memory
- **Progress**: Shows "Loading..." with spinner

#### **State 3: Ready** ✅
- **Status**: Model is loaded in memory and ready for inference
- **Action**: Click "✅ Use Now" to navigate to Playground
- **Performance**: Immediate response generation

### **Hosted Models** ☁️
- **Status**: Always ready to use (no download/load required)
- **Action**: Click "Compare Models" to use in comparison mode
- **Performance**: Fast response times with API-based inference
- **Cost**: Displayed per 1K tokens for transparency

### **Efficient Workflow**
- **One-Click Setup**: "Download & Load" combines both operations for new local models
- **Smart Caching**: Downloaded models persist on disk for faster subsequent loads
- **Real-Time Status**: Live progress tracking for both download and loading operations
- **Hosted Models**: Instant access without downloads or setup
- **CPU Optimization**: Automatic token limits and timeout handling for CPU-only environments

## 🔍 **RAG (Retrieval-Augmented Generation)**

The RAG system provides powerful document-based question answering with intelligent fallback mechanisms for maximum reliability.

### **How RAG Works**
1. **Document Upload**: Upload PDF, TXT, or Markdown files
2. **Intelligent Chunking**: Documents are automatically split into optimal chunks
3. **Smart Retrieval**: Relevant document sections are retrieved based on your question
4. **Contextual Answers**: AI generates answers using retrieved document content

### **Robust Fallback System**
The RAG system automatically adapts to your environment:

#### **Primary: ChromaDB** 🏆
- **When**: Full vector database environment available
- **Features**: High-performance vector similarity search
- **Best for**: Production environments with persistent storage

#### **Secondary: FAISS** ⚡
- **When**: ChromaDB unavailable (e.g., SQLite conflicts)
- **Features**: Fast in-memory vector search
- **Best for**: Development and testing environments

#### **Fallback: Simple In-Memory** 🛡️
- **When**: Neither ChromaDB nor FAISS available
- **Features**: Keyword-based search with relevance scoring
- **Best for**: GitHub Codespaces, minimal environments, quick demos

### **RAG Features**
- **Multi-Format Support**: PDF, TXT, Markdown files
- **Collection Management**: Organize documents into named collections
- **Smart Search**: Keyword-based retrieval with relevance scoring
- **Context Optimization**: Automatic token limit management
- **Real-time Processing**: Immediate document upload and querying
- **Environment Agnostic**: Works in any setup without configuration

### **Perfect for Codespaces**
The RAG system is specifically optimized for GitHub Codespaces:
- **No Complex Setup**: Works out-of-the-box
- **Automatic Fallback**: Handles missing dependencies gracefully
- **Fast Performance**: Optimized for Codespaces environment
- **Reliable Operation**: Comprehensive error handling and logging

## 🎭 **Mock Mode**

**Mock Mode** allows you to use the frontend UI without running real models on the backend. This is useful for:
- UI/UX demos and presentations
- Testing the interface without heavy downloads or compute requirements
- Development when backend resources are unavailable
- Quick feature exploration without model loading delays

## 🏗️ **Architecture Overview**

```
Frontend (React + Vite) → Backend (FastAPI) → Model Inference (vLLM/Ollama)
                                    ↓
                            RAG System (Multi-Fallback)
                                    ↓
                    ChromaDB → FAISS → Simple In-Memory
                                    ↓
                            Document Processing
                                    ↓
                            Embeddings (SentenceTransformers)
```

**Tech Stack:**
- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Python 3.11+ + FastAPI + Pydantic
- **Models**: 
  - **Local**: vLLM, Hugging Face Transformers, Ollama
  - **Hosted**: OpenAI, Anthropic, Google APIs
- **RAG System**: 
  - **Primary**: ChromaDB for vector storage
  - **Secondary**: FAISS for in-memory vector search
  - **Fallback**: Simple in-memory with keyword search
- **Embeddings**: SentenceTransformers (with graceful fallback)
- **Document Processing**: PyMuPDF, intelligent chunking
- **Environment**: CPU-optimized with automatic GPU detection

For detailed architecture information, see [ARCHITECTURE.md](ARCHITECTURE.md).

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Hugging Face** for the Transformers library and model hub
- **FastAPI** for the modern Python web framework
- **React** and **Vite** for the frontend ecosystem
- **The open AI community** for their contributions to accessible AI tools 