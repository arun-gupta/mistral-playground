# Mistral Playground & Prompt Tuner

A modern, developer-friendly full-stack application for exploring, comparing, and fine-tuning prompts across Mistral's open models (Mistral-7B, Mixtral, Codestral).

## 🎯 Key Features

### Main Playground Features
- **Multi-Model Comparison**: Compare responses from multiple Mistral models side-by-side
- **Advanced Parameter Tuning**: Edit temperature, max tokens, system prompt, top_p
- **Performance Metrics**: Show token usage and latency per request
- **Prompt Management**: Save/load/share prompt configurations
- **Rich Output Rendering**: Markdown rendering of outputs with syntax highlighting

### Advanced Features (Planned)
- **RAG Mode**: Upload documents → embed → retrieve → generate grounded answers
- **Codestral Mode**: Prompt flows for code tasks with inline diff view
- **Model Explorer**: Metadata viewer and raw API request/response inspection
- **Multilingual Testing**: Submit prompts in multiple languages and compare outputs
- **Built-in Recipes**: Pre-built prompts for summarization, Q&A, code assistance
- **Rating System**: Rate model outputs for quality assessment

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

### Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Python 3.11+ + FastAPI + Pydantic
- **Models**: vLLM for local inference, Hugging Face Transformers
- **Vector DB**: ChromaDB for RAG functionality
- **Embeddings**: SentenceTransformers
- **Document Processing**: PyMuPDF + LangChain
- **Containerization**: Docker + docker-compose

## 🚀 Quick Start

### Troubleshooting

#### Common Issues

**Frontend Issues:**
- **Tailwind CSS Error**: If you see "Can't resolve 'tailwindcss-animate'", run:
  ```bash
  cd frontend
  npm install
  npm install tailwindcss-animate
  ```
- **Port Issues**: Make sure ports 5173 (frontend) and 8000 (backend) are forwarded in Codespaces

**Backend Issues:**
- **Model Loading**: First-time model loading may take several minutes
- **Memory Issues**: Use smaller models like `microsoft/DialoGPT-small` for testing
- **GGUF Models**: Ensure `ctransformers` is installed for GGUF support

**General:**
- **Dependencies**: If you encounter missing dependencies, run:
  ```bash
  # Backend
  cd backend
  source venv/bin/activate
  pip install -r requirements.txt
  
  # Frontend
  cd frontend
  npm install
  ```

### Option 1: GitHub Codespaces (Recommended for Cloud Development)

**Perfect for cloud-based development without local setup!**

1. **Open in Codespaces**
   - Click the green "Code" button on GitHub
   - Select "Codespaces" tab
   - Click "Create codespace on main"

2. **Automatic Setup**
   - Codespaces will automatically install dependencies
   - Backend and frontend will be configured automatically

3. **Start Development**
   ```bash
   # Backend (Terminal 1)
   cd backend
   source venv/bin/activate
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   
   # Frontend (Terminal 2)
   cd frontend
   npm install  # Ensure dependencies are installed
   npm run dev
   ```

4. **Access Application**
   - Frontend: Use the "Open in Browser" button for port 5173
   - Backend API: Available on port 8000

### Option 2: Local Development

**Setup Options:**
- **GPU Setup**: Use `requirements.txt` for full vLLM support (requires CUDA)
- **CPU Setup**: Use `requirements-basic.txt` for CPU-only inference (slower but no GPU required)
- **Minimal Setup**: Use `requirements-minimal.txt` for basic testing (no LangChain, limited features)

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
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

### Option 2: Docker Deployment

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
MODEL_PROVIDER=vllm  # vllm, ollama, huggingface
MODEL_NAME=mistral-7b-instruct
DEVICE=cuda  # cuda, cpu, mps

# Vector Database
CHROMA_PERSIST_DIRECTORY=./chroma_db
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]

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

#### GPU-Only Models (For Reference)
- **Mixtral-8x7B-Instruct**: High-performance mixture-of-experts model (~32GB RAM)
- **CodeMistral-7B-Instruct**: Specialized for code generation (~14GB RAM)

### Model Providers
- **Hugging Face**: Primary provider for CPU-friendly models
- **vLLM**: High-performance local inference (GPU recommended)
- **Ollama**: Easy local model management (supports GGUF models)

### Model Selection Guide
- **Testing/Development**: Use `microsoft/DialoGPT-small`
- **Production (CPU)**: Use `TheBloke/Mistral-7B-Instruct-v0.1-GGUF`
- **High Quality**: Use `mistralai/Mistral-7B-Instruct-v0.2` (if you have 16GB+ RAM)

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

### Frontend Development
```bash
cd frontend
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

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Mistral AI** for providing excellent open-source models
- **vLLM** team for high-performance inference
- **ChromaDB** for vector database capabilities
- **shadcn/ui** for beautiful React components

## 📸 Screenshots

*Screenshots will be added after initial development*

## 🎥 Demo Video Script

1. **Introduction (0-10s)**: "Welcome to Mistral Playground - your comprehensive tool for exploring and fine-tuning prompts across Mistral's open models."

2. **Basic Playground (10-30s)**: "Start by comparing responses from different Mistral models. Adjust parameters like temperature and max tokens in real-time."

3. **Advanced Features (30-50s)**: "Upload documents for RAG-powered responses, or use Codestral for specialized code tasks with inline diff views."

4. **Prompt Management (50-70s)**: "Save your favorite prompt configurations and share them with your team."

5. **Performance Insights (70-90s)**: "Monitor token usage and latency to optimize your prompts for production use."

## 🧠 Development Notes

This application was developed using Mistral models for:
- **Code Generation**: Initial project structure and boilerplate
- **Documentation**: README and API documentation
- **UI Copy**: Component text and user interface labels
- **Testing**: Prompt validation and edge case identification

The models demonstrated excellent capabilities in understanding complex requirements and generating production-ready code with proper error handling and documentation. 