# AI Model Playground & Explorer

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/arun-gupta/mistral-playground)

> 💡 **Tip**: Right-click the "Open in GitHub Codespaces" button and select "Open in new tab" for the best experience.

A modern, developer-friendly full-stack application for exploring and experimenting with open AI models, with a primary focus on Mistral AI's powerful models. Built with performance and usability in mind, this playground provides comprehensive tools to understand model capabilities, performance characteristics, and real-world applications. It offers comprehensive support for popular open source AI models including Llama, Gemma, and DialoGPT, making it a versatile platform for model exploration and comparison.

## 🎯 **Key Features**

### **Model Management & Inference**
- **Multi-Model Support**: Run various open models locally with optimized inference
- **Smart Model Manager**: Download, manage, and monitor models with real-time status tracking
- **Performance Analytics**: Detailed metrics for model performance, token usage, and latency
- **Comparison Engine**: Compare responses from multiple models side-by-side with prepared test scenarios

### **Advanced Capabilities**
- **RAG Mode**: Upload documents and generate grounded answers using Retrieval-Augmented Generation
- **Parameter Tuning**: Advanced control over generation parameters (temperature, max tokens, system prompts)
- **Conversational Interface**: Natural chat experience optimized for instruction-following models
- **Document Processing**: Support for PDF, TXT, and Markdown files with intelligent chunking

### **Developer Experience**
- **Modern UI**: Clean, responsive interface built with React and TailwindCSS
- **Real-time Status**: Visual indicators for download, loading, and inference status
- **Organized Workflow**: Intuitive model organization with filtering and sorting
- **Mock Mode**: Test the interface without heavy downloads or compute requirements

## 🚀 **Quick Start**

### **Option 1: GitHub Codespaces (Recommended)**
1. **Right-click the "Open in GitHub Codespaces" button above and select "Open in new tab"** (for best experience)
2. **Wait for setup to complete** (2-3 minutes)
3. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

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
- **Playground**: Single model interaction and testing with optimized interface
- **Models**: Manage, download, and monitor all available models with organized grouping
- **Comparison**: Compare responses from multiple models side-by-side with prepared test combinations
- **RAG**: Retrieval-Augmented Generation for grounded Q&A from documents
- **Configs**: Manage prompt and system configurations

## 🚦 **Model Status Workflow**

Models follow a streamlined three-state workflow:

### **State 1: Not Downloaded** ⏳
- **Status**: Model is available but not yet downloaded
- **Action**: Click "📥 Download & Load" to download and load in one step
- **Progress**: Shows download progress with percentage

### **State 2: Downloaded** 📦  
- **Status**: Model is downloaded to disk, ready to load into memory
- **Action**: Click "⚡ Load Model" to load into memory
- **Progress**: Shows "Loading..." with spinner

### **State 3: Ready** ✅
- **Status**: Model is loaded in memory and ready for inference
- **Action**: Click "✅ Use Now" to navigate to Playground
- **Performance**: Immediate response generation

### **Efficient Workflow**
- **One-Click Setup**: "Download & Load" combines both operations for new models
- **Smart Caching**: Downloaded models persist on disk for faster subsequent loads
- **Real-Time Status**: Live progress tracking for both download and loading operations

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
                            Vector DB (ChromaDB)
                                    ↓
                            Document Processing
                                    ↓
                            Embeddings (SentenceTransformers)
```

**Tech Stack:**
- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Python 3.11+ + FastAPI + Pydantic
- **Models**: vLLM for local inference, Hugging Face Transformers, Ollama
- **Vector DB**: ChromaDB for RAG functionality
- **Embeddings**: SentenceTransformers

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