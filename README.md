# [Mistral Playground & Model Explorer](https://github.com/arun-gupta/mistral-playground){:target="_blank"}

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/arun-gupta/mistral-playground){:target="_blank"}

A modern, developer-friendly full-stack application specifically designed for exploring and experimenting with **Mistral AI's powerful open models**. This playground is optimized for **Mistral-7B** and **Mixtral-8x7B** models, providing comprehensive tools to understand their capabilities, performance characteristics, and real-world applications.

## 🎯 **Mistral-Focused Features**

### **Core Mistral Model Support**
- **Mistral-7B Models**: Full support for all Mistral-7B variants (Instruct, Base, GGUF quantized)
- **Mixtral-8x7B Models**: High-performance mixture-of-experts models with optimized inference
- **Mistral Model Comparison**: Side-by-side testing of different Mistral model versions and quantizations
- **Mistral-Specific Optimizations**: Tailored parameter tuning for Mistral's architecture and training

### **Mistral Playground Features**
- **Single Model Playground**: Interact with any Mistral model in a conversational interface optimized for Mistral's instruction-following capabilities
- **Mistral Model Manager**: Proactively download, manage, and monitor all available Mistral and Mixtral models with real-time status tracking
- **Mistral Comparison Engine**: Compare responses from multiple Mistral models side-by-side with performance metrics and prepared test scenarios
- **Mistral RAG Mode**: Upload documents and generate grounded answers using Mistral models with Retrieval-Augmented Generation
- **Mistral Parameter Tuning**: Advanced control over Mistral-specific parameters (temperature, max tokens, system prompts, top_p)
- **Mistral Performance Analytics**: Detailed metrics for Mistral model performance, token usage, and latency analysis

### **Mistral-Specific UI Features**
- **Mistral Model Prioritization**: Mistral and Mixtral models are prominently featured and prioritized in the interface
- **Mistral Status Indicators**: Visual badges showing download, loading, and inference status for Mistral models
- **Mistral Model Organization**: Grouped by Mistral family with filtering and sorting optimized for Mistral workflows
- **Mistral Performance Metrics**: Real-time monitoring of Mistral model performance and resource usage

## 🚀 **Quick Start**

### **Option 1: GitHub Codespaces (Recommended)**
1. **Click the "Open in GitHub Codespaces" button above**
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

## 🚀 **Mistral Model Roadmap**

### **Phase 1: Enhanced Mistral Experience**
- **🎭 Mistral Multi-Modal**: Image + text analysis using Mistral's multimodal capabilities
- **🔄 Mistral Conversation Memory**: Persistent chat sessions optimized for Mistral's context window
- **📊 Mistral Performance Dashboard**: Detailed analytics specific to Mistral model performance

### **Phase 2: Advanced Mistral Features**  
- **🎯 Mistral Prompt Engineering**: Pre-built templates optimized for Mistral's instruction-following capabilities
- **🌐 Mistral API Integration**: External service integration using Mistral's function calling abilities
- **🎨 Mistral Creative Studio**: Story generation, code generation, and creative tasks optimized for Mistral models

### **Phase 3: Enterprise Mistral Features**
- **🔧 Mistral Fine-tuning Interface**: Custom Mistral model training and optimization
- **📝 Advanced Mistral Document Processing**: Document analysis and summarization using Mistral's capabilities
- **🤖 Mistral Agent Framework**: Multi-agent systems built on Mistral models

## 🖥️ **Mistral Application Navigation**

The main navigation is optimized for Mistral workflows:
- **Playground**: Single Mistral model interaction and testing (Mistral/Mixtral models prioritized)
- **Models**: Manage, download, and monitor all Mistral models with organized grouping and real-time status
- **Comparison**: Compare responses from multiple Mistral models side-by-side with prepared test combinations
- **RAG**: Retrieval-Augmented Generation using Mistral models for grounded Q&A
- **Configs**: Manage Mistral-specific prompt and system configurations

## 🚦 **Mistral Model Status Workflow**

Mistral models follow a streamlined three-state workflow:

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

## 🎭 **Mistral Mock Mode**

**Mock Mode** allows you to use the Mistral-focused frontend UI without running real Mistral models on the backend. This is useful for:
- UI/UX demos and presentations of Mistral capabilities
- Testing the Mistral interface without heavy downloads or compute requirements
- Development when Mistral backend resources are unavailable
- Quick Mistral feature exploration without model loading delays

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

- **Mistral AI** for their excellent open models
- **Hugging Face** for the Transformers library
- **FastAPI** for the modern Python web framework
- **React** and **Vite** for the frontend ecosystem 