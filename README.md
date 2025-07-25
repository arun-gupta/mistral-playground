# [Mistral Playground & Model Explorer](https://github.com/arun-gupta/mistral-playground)

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/arun-gupta/mistral-playground)

A modern, developer-friendly full-stack application for exploring and experimenting with Mistral's powerful open models (Mistral-7B, Mixtral) to understand their capabilities and performance. The platform also enables comprehensive comparison with other leading open-source language models including Meta's Llama 2/3, Google's Gemma, and Microsoft's DialoGPT.

## 🎯 Key Features

### Main Playground Features
- **Single Model Playground**: Interact with any loaded model in a conversational playground (Mistral/Mixtral models prioritized)
- **Models Tab**: Proactively download, manage, and monitor the status of all available models with organized grouping and filtering
- **Comparison Tab**: Compare responses from multiple models side-by-side with performance metrics and prepared test combinations
- **RAG Mode**: Upload documents (PDF, TXT, MD) and generate grounded answers using Retrieval-Augmented Generation
- **Mock Mode**: Enable a mock backend for UI testing and demos without running real models
- **Advanced Parameter Tuning**: Edit temperature, max tokens, system prompt, top_p, and other generation parameters
- **Performance Metrics**: Show token usage and latency per request
- **Model Management**: Download, load, and manage different models with real-time status tracking
- **Rich Output Rendering**: Markdown rendering of outputs with syntax highlighting
- **API-Driven Model Lists**: Dynamic model fetching ensures all pages stay in sync

### User Interface Features
- **Dedicated Tabs**: Playground, Models, Comparison, RAG, Configs for clear workflow
- **Model Status Indicators**: Visual badges for Not Downloaded, Downloading, On Disk, Loaded
- **Tooltips and Legends**: Helpful tooltips (e.g., Mock Mode) and legends for model status
- **Intuitive Navigation**: Logical tab order for seamless workflow
- **Model Organization**: Grouped by family (Mistral, Llama, Gemma) with filtering and sorting
- **Visual Feedback**: Upload progress indicators, processing status, and success/error states
- **Collection Management**: Metadata support (description, tags, visibility) for RAG collections

### 🚀 Future Roadmap

#### Phase 1: Enhanced User Experience
- **🎭 Multi-Modal Capabilities**: Image + text analysis, OCR, visual question answering
- **🔄 Conversation Memory & Context**: Persistent chat sessions, context window management, conversation export
- **📊 Model Performance Analytics**: Detailed metrics dashboard, response time comparisons, token usage analysis, cost estimation

#### Phase 2: Advanced AI Features  
- **🎯 Advanced Prompt Engineering**: Pre-built templates (Chain-of-Thought, Few-shot), A/B testing, prompt performance metrics
- **🌐 API Integration Hub**: External service integration, function calling demonstrations, real-time data processing
- **🎨 Creative Generation Studio**: Story generation, poetry creation, code generation with language selection, art prompt generation

#### Phase 3: Enterprise Features
- **🔧 Fine-tuning Interface**: Custom model training, training progress monitoring, model comparison
- **📝 Advanced Document Processing**: Multi-format support, document summarization, table extraction, citation generation
- **🤖 Agent Framework**: Multi-agent systems, task delegation, workflow automation

## 🖥️ Application Navigation

The main navigation bar includes:
- **Playground**: Single model interaction and testing (Mistral/Mixtral models only)
- **Models**: Manage, download, and monitor all models with organized grouping and real-time status
- **Comparison**: Compare responses from multiple models side-by-side with prepared test combinations
- **RAG**: Retrieval-Augmented Generation with document upload, collection management, and grounded Q&A
- **Configs**: Manage prompt and system configurations

## 🚦 Model Status Workflow

Models can be in one of four states:
- **⏳ Not Downloaded**: Model is available but not yet downloaded
- **🔄 Downloading**: Model is currently being downloaded
- **📦 On Disk**: Model is downloaded and ready to load
- **✅ Loaded**: Model is loaded in memory and ready for inference

The Models tab provides proactive management and real-time status tracking for all models. Models are organized by family (Mistral & Mixtral, Meta Llama, Google Gemma, DialoGPT) with filtering and sorting options. Recommended models are highlighted with badges.

## 🎭 Mock Mode

**Mock Mode** allows you to use the frontend UI without running real models on the backend. This is useful for:
- UI/UX demos and presentations
- Testing the interface without heavy downloads or compute requirements
- Development when backend resources are unavailable
- Quick feature exploration without model loading delays

When enabled, all model responses are simulated, and no real inference is performed. A helpful tooltip explains this feature in the UI.

## 🏗️ Architecture

```
Frontend (React + Vite) → Backend (FastAPI) → Model Inference (vLLM/Ollama)
                                    ↓
                            Vector DB (ChromaDB)
                                    ↓
                            Document Processing
                                    ↓
                            Embeddings (SentenceTransformers)
```

### API Documentation
For detailed API documentation, see [API.md](API.md) or visit the interactive docs at `http://localhost:8000/docs` when the server is running.

### Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Python 3.11+ + FastAPI + Pydantic
- **Models**: vLLM for local inference, Hugging Face Transformers, Ollama
- **Vector DB**: ChromaDB for RAG functionality
- **Embeddings**: SentenceTransformers
- **Document Processing**: PyMuPDF + LangChain
- **Containerization**: Docker + docker-compose

## 🚀 Quick Start

### Option 1: GitHub Codespaces (Recommended for Cloud Development)

The fastest way to get started is using GitHub Codespaces:

1. **Click the "Open in GitHub Codespaces" button at the top of this README**
2. **Wait for setup to complete** (takes 2-3 minutes)
3. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

**Codespaces Features:**
- ✅ **Automatic setup** - No local installation required
- ✅ **Pre-configured environment** - Python, Node.js, and all dependencies
- ✅ **Mock mode enabled** - Fast startup for UI testing
- ✅ **Port forwarding** - Automatic access to all services
- ✅ **VS Code extensions** - Python, TypeScript, and TailwindCSS support

### Option 2: One-Command Setup (Local Development)

The fastest way to get started is using our automated setup script:

```bash
# Clone the repository
git clone https://github.com/arun-gupta/mistral-playground
cd mistral-playground

# Run the development setup script
chmod +x start-dev.sh
./start-dev.sh
```

This script will automatically:
- ✅ Create a Python virtual environment
- ✅ Install minimal backend dependencies (CPU-friendly)
- ✅ Create a basic `.env` file with sensible defaults
- ✅ Start the backend server
- ✅ Install frontend dependencies (if Node.js is available)
- ✅ Start the frontend development server

**Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

**Default configuration:**
- Uses `microsoft/DialoGPT-small` (CPU-friendly, ~500MB RAM)
- Mock mode disabled (real model inference)
- Basic security settings

### Option 3: Manual Setup (Advanced)

**Setup Options:**
- **GPU Setup**: Use `requirements.txt` for full vLLM support (requires CUDA)
- **CPU Setup**: Use `requirements-basic.txt` for CPU-only inference (slower but no GPU required)
- **Minimal Setup**: Use `requirements-minimal.txt` for basic testing (no LangChain, limited features)

1. **Clone and Setup**
   ```bash
   git clone https://github.com/arun-gupta/mistral-playground
   cd mistral-playground
   ```

2. **Backend Setup**
   ```bash
   # Create virtual environment
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Update pip (recommended)
   pip install --upgrade pip
   
   # Install dependencies (choose one):
   # For GPU support with vLLM:
   pip install -r requirements.txt
   
   # For CPU-only setup (no vLLM):
   pip install -r requirements-basic.txt
   
   # For minimal setup (basic testing):
   pip install -r requirements-minimal.txt
   
   # Copy environment file
   cp .env.example .env
   
   # Generate secure secret key
   ./generate-secret-key.sh
   
   # Edit .env with your configuration
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Start Development Servers**
   ```bash
   # Terminal 1: Backend
   cd backend
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   
   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

5. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Option 4: Docker Deployment

1. **Build and Run**
   ```bash
   docker-compose up --build
   ```

2. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

## ⚙️ Configuration

### Security Setup
The application requires a secure secret key for JWT token signing and other cryptographic operations.

**Generate a secure secret key:**
```bash
# Option 1: Use the provided script
./generate-secret-key.sh

# Option 2: Use OpenSSL directly
openssl rand -hex 32

# Option 3: Use Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**Security Best Practices:**
- Use different keys for development and production
- Never commit the actual secret key to version control
- Keep the key secure and confidential
- Rotate keys periodically in production

### Environment Variables (.env)
```bash
# Model Configuration
MODEL_PROVIDER=huggingface  # huggingface, vllm, ollama
MODEL_NAME=microsoft/DialoGPT-small  # Default CPU-friendly model
DEVICE=cpu  # cpu, cuda, mps

# Vector Database
CHROMA_PERSIST_DIRECTORY=./chroma_db
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]

# Security
SECRET_KEY=your-secret-key-here  # Generate using ./generate-secret-key.sh
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Logging
LOG_LEVEL=INFO

# Development/Testing
MOCK_MODE=false  # Set to true for UI testing without real models

# Telemetry/Privacy
DISABLE_TELEMETRY=true  # Disable all telemetry collection

# Optional: Hugging Face API
HUGGINGFACE_API_KEY=your_hf_token_here
```

## 📁 Project Structure

```
mistral-playground/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── services/
│   │   └── utils/
│   ├── requirements.txt
│   ├── main.py
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🧠 Model Support

### Currently Supported Models

#### CPU-Friendly Models (Recommended for Development)
- **DialoGPT Series**: Microsoft's conversational models
  - `microsoft/DialoGPT-small` (117M parameters, ~500MB RAM) - Perfect for testing
  - `microsoft/DialoGPT-medium` (345M parameters, ~1.5GB RAM) - Good balance
  - `microsoft/DialoGPT-large` (774M parameters, ~3GB RAM) - Better quality

#### Mistral Models (CPU-Optimized)
- **Quantized Mistral**: CPU-optimized versions
  - `TheBloke/Mistral-7B-Instruct-v0.1-GGUF` (4-8GB RAM) - Best for CPU production
  - `TheBloke/Mistral-7B-Instruct-v0.2-GGUF` (4-8GB RAM) - Latest quantized version

#### Full Mistral Models (High RAM)
- **Mistral-7B Series**: Full models requiring significant RAM
  - `mistralai/Mistral-7B-Instruct-v0.1` (~14GB RAM) - Original instruction model
  - `mistralai/Mistral-7B-Instruct-v0.2` (~14GB RAM) - Latest instruction model
  - `mistralai/Mistral-7B-v0.1` (~14GB RAM) - Base model

#### Meta Llama Models
- **Llama 2 Models** (legacy):
  - `TheBloke/Llama-2-13B-Chat-GGUF` (8-12GB RAM) - Larger model, better quality
- **Llama 3 Models** (newer, better performance):
  - `meta-llama/Meta-Llama-3-8B-Instruct` (~16GB RAM) - Full instruct model
  - `meta-llama/Meta-Llama-3-8B` (~16GB RAM) - Full base model
  - `TheBloke/Meta-Llama-3-8B-Instruct-GGUF` (4-8GB RAM) - Quantized instruct
  - `TheBloke/Meta-Llama-3-10B-Instruct-GGUF` (6-10GB RAM) - Lightweight option
  - `TheBloke/Meta-Llama-3-14B-Instruct-GGUF` (8-12GB RAM) - Best balance

#### Google Gemma Models
- **Gemma Series**: Efficient models from Google
  - `google/gemma-2b` (~4GB RAM) - Small, efficient model for development
  - `google/gemma-7b` (~14GB RAM) - Medium-sized model with good performance
  - `google/gemma-2b-it` (~4GB RAM) - Instruction-tuned version for better chat
  - `google/gemma-7b-it` (~14GB RAM) - Instruction-tuned version for better chat

#### Mixtral Models (High Performance)
- **Mixtral-8x7B**: High-performance mixture-of-experts models
  - `TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF` (16-24GB RAM) - CPU optimized version
  - `mistralai/Mixtral-8x7B-Instruct-v0.1` (~32GB RAM) - Full model, GPU recommended

#### GPU-Only Models (For Reference)
- **CodeMistral-7B-Instruct**: Specialized for code generation (~14GB RAM)

### Model Providers
- **Hugging Face**: Primary provider for CPU-friendly models
- **vLLM**: High-performance local inference (GPU recommended)
- **Ollama**: Easy local model management (supports GGUF models)

### Model Selection Guide
- **Testing/Development**: Use `microsoft/DialoGPT-small` or `google/gemma-2b`
- **Production (CPU)**: Use `TheBloke/Mistral-7B-Instruct-v0.2-GGUF` or `TheBloke/Meta-Llama-3-8B-Instruct-GGUF`
- **High Quality**: Use `mistralai/Mistral-7B-Instruct-v0.2` or `meta-llama/Meta-Llama-3-8B-Instruct` (if you have 16GB+ RAM)
- **Maximum Performance**: Use `TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF` (if you have 24GB+ RAM)
- **RAG & Playground**: Only Mistral and Mixtral models are available for focused testing

## ☁️ GitHub Codespaces

### Codespaces-Specific Features

When running in GitHub Codespaces, the application is optimized for cloud development:

#### **Automatic Configuration**
- **Mock Mode**: Enabled by default for fast startup
- **CORS**: Configured for GitHub.dev domains
- **Port Forwarding**: Automatic setup for backend (8000) and frontend (5173)
- **Environment**: Pre-configured Python 3.11 and Node.js 18
- **Resources**: 4 CPU cores, 16GB RAM, 32GB storage
- **Startup Script**: Uses the same `start-dev.sh` as local development

#### **Development Experience**
- **VS Code Extensions**: Python, TypeScript, TailwindCSS, and more
- **Hot Reload**: Both frontend and backend support live reloading
- **Logging**: Separate log files for backend and frontend
- **Process Management**: Easy start/stop of services

#### **Performance Considerations**
- **Mock Mode**: Use for UI testing and development
- **Real Models**: Edit `.env` and set `MOCK_MODE=false` for actual inference
- **Resources**: 4 cores and 16GB RAM support quantized Mistral/Llama models
- **Storage**: 32GB available for model downloads and data

#### **Troubleshooting Codespaces**
```bash
# Run the comprehensive test script
bash .devcontainer/test-codespaces.sh

# Check if services are running
ps aux | grep -E "(uvicorn|npm)"

# Check startup logs
cat /tmp/startup.log

# Test API endpoints
curl http://localhost:8000/health
curl http://localhost:5173

# Manual restart if needed
bash start-dev.sh
```

# View logs
tail -f logs/backend.log
tail -f logs/frontend.log

# Restart services
kill $(cat logs/backend.pid)
kill $(cat logs/frontend.pid)
bash .devcontainer/start.sh

# Check environment
cat .env
```

## 🚀 Upgrading to GPU Setup

If you started with the CPU setup and want to upgrade to GPU acceleration for faster inference:

### Prerequisites for GPU Setup
- **NVIDIA GPU** with CUDA support
- **CUDA Toolkit** (version 11.8 or 12.1 recommended)
- **cuDNN** library
- **Sufficient VRAM** (8GB+ recommended for Mistral-7B)

### Upgrade Steps

1. **Install CUDA Dependencies**
   ```bash
   # Check if CUDA is available
   nvidia-smi
   
   # Install CUDA Toolkit (if not already installed)
   # Download from: https://developer.nvidia.com/cuda-downloads
   ```

2. **Upgrade Python Dependencies**
   ```bash
   # Activate your virtual environment
   source venv/bin/activate
   
   # Uninstall CPU-only packages
   pip uninstall torch torchvision
   
   # Install GPU-enabled packages
   pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
   
   # Install full requirements with vLLM
   pip install -r requirements.txt
   ```

3. **Update Environment Configuration**
   ```bash
   # Edit your .env file
   MODEL_PROVIDER=vllm
   DEVICE=cuda
   ```

4. **Test GPU Setup**
   ```bash
   cd backend
   python test_basic.py
   
   # Look for: "CUDA available: True" in the output
   ```

### Performance Comparison

| Setup | Inference Speed | Memory Usage | Setup Complexity |
|-------|----------------|--------------|------------------|
| **CPU** | ~2-5 tokens/sec | 4-8GB RAM | Easy |
| **GPU** | ~20-50 tokens/sec | 8-16GB VRAM | Moderate |

### Troubleshooting GPU Issues

**Common Issues:**
- **CUDA out of memory**: Reduce model size or batch size
- **Driver issues**: Update NVIDIA drivers
- **Version conflicts**: Use compatible CUDA/PyTorch versions

**Verification Commands:**
```bash
# Check CUDA availability
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"

# Check GPU memory
nvidia-smi

# Test vLLM installation
python -c "from vllm import LLM; print('vLLM installed successfully')"
```

## 🔧 Development

### Backend Development
```bash
cd backend
# Install development dependencies
pip install -r requirements-dev.txt

# Test basic setup
python test_basic.py

# Run tests
pytest

# Format code
black app/
isort app/

# Type checking
mypy app/
```

### Frontend Development
```bash
cd frontend
# Test setup
node test-setup.js

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## 📊 Performance Monitoring

The application tracks:
- **Token Usage**: Input/output tokens per request
- **Latency**: Response time measurements
- **Model Performance**: Throughput and memory usage
- **User Interactions**: Prompt patterns and preferences

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Mistral AI** for providing excellent open-source models
- **vLLM** team for high-performance inference
- **ChromaDB** for vector database capabilities
- **shadcn/ui** for beautiful React components

## 📸 Screenshots

*Screenshots will be added after initial development*

## 🎥 Demo Video Script

1. **Introduction (0-10s)**: "Welcome to Mistral Playground & Model Explorer - your comprehensive tool for exploring and experimenting with Mistral's open models."

2. **Basic Playground (10-30s)**: "Start by comparing responses from different Mistral models. Adjust parameters like temperature and max tokens in real-time."

3. **Advanced Features (30-50s)**: "Upload documents for RAG-powered responses, or use Codestral for specialized code tasks with inline diff views."

4. **Model Management (50-70s)**: "Download, load, and manage different models with real-time status tracking."

5. **Performance Insights (70-90s)**: "Monitor token usage and latency to understand model performance."

## 🧠 Development Notes

This application was developed using Mistral models for:
- **Code Generation**: Initial project structure and boilerplate
- **Documentation**: README and API documentation
- **UI Copy**: Component text and user interface labels
- **Testing**: Model validation and edge case identification

The models demonstrated excellent capabilities in understanding complex requirements and generating production-ready code with proper error handling and documentation. 