# Setup & Installation Guide

## 🚀 **Quick Start Options**

### **Option 1: GitHub Codespaces (Recommended for Cloud Development)**

The fastest way to get started is using GitHub Codespaces:

1. **Click the "Open in GitHub Codespaces" button at the top of the README**
2. **Wait for setup to complete** (takes 2-3 minutes)
3. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

**Codespaces Features:**
- ✅ **Automatic setup** - No local installation required
- ✅ **Pre-configured environment** - Python, Node.js, and all dependencies
- ✅ **Automatic server startup** - Backend and frontend start automatically
- ✅ **Full model selection** - All 25+ models available in Model Manager
- ✅ **Port forwarding** - Automatic access to all services
- ✅ **VS Code extensions** - Python, TypeScript, and TailwindCSS support

### **Option 2: One-Command Setup (Local Development) ⭐ **Recommended**

The fastest way to get started is using our automated setup script:

```bash
# Clone the repository
git clone https://github.com/arun-gupta/mistral-playground
cd mistral-playground

# Run the complete development setup script
chmod +x setup-and-start.sh
./setup-and-start.sh
```

This script will automatically:
- ✅ Check prerequisites (Python, Node.js, npm)
- ✅ Create a Python virtual environment
- ✅ Install backend dependencies (CPU-optimized by default)
- ✅ Install frontend dependencies
- ✅ Create a basic `.env` file with sensible defaults
- ✅ Start both backend and frontend servers

**💡 This script does both setup AND startup in one command!**

**Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

**Default configuration:**
- Uses `microsoft/DialoGPT-small` (CPU-friendly, ~500MB RAM)
- Mock mode disabled (real model inference)
- Basic security settings

### **Option 3: Manual Setup (Advanced)**

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

### **Option 4: Docker Deployment**

1. **Build and Run**
   ```bash
   docker-compose up --build
   ```

2. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

## ⚙️ **Configuration**

### **Security Setup**
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

**Update your `.env` file:**
```bash
# Copy the example file
cp .env.example .env

# Edit the file and update the SECRET_KEY
nano .env
```

### **Environment Variables**

Key configuration options in `.env`:

```bash
# Model Configuration
MODEL_PROVIDER=huggingface
MODEL_NAME=microsoft/DialoGPT-small
DEVICE=cpu

# Vector Database
CHROMA_PERSIST_DIRECTORY=./chroma_db
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Logging
LOG_LEVEL=INFO

# Development/Testing
MOCK_MODE=False
```

## 🚀 **Upgrading to GPU Setup**

If you started with the CPU setup and want to upgrade to GPU acceleration for faster inference:

### **Prerequisites for GPU Setup**
- **NVIDIA GPU** with CUDA support
- **CUDA Toolkit** (version 11.8 or 12.1 recommended)
- **cuDNN** library
- **Sufficient VRAM** (8GB+ recommended for Mistral-7B)

### **Upgrade Steps**

```bash
# Activate your virtual environment
source venv/bin/activate

# Install GPU dependencies
pip install -r requirements.txt

# Update your .env file
echo "DEVICE=cuda" >> .env

# Restart the backend
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 🔧 **Prerequisites**

### **System Requirements**
- **Python**: 3.11+ (recommended)
- **Node.js**: 18+ (for frontend)
- **npm**: Latest version
- **Memory**: 8GB+ RAM (16GB+ recommended for larger models)
- **Storage**: 10GB+ free space for models and dependencies

### **Optional Requirements**
- **GPU**: NVIDIA GPU with CUDA support (for vLLM acceleration)
- **Docker**: For containerized deployment
- **Git**: For version control

### **Operating System Support**
- **macOS**: 10.15+ (Catalina and later)
- **Linux**: Ubuntu 20.04+, CentOS 8+, or similar
- **Windows**: Windows 10+ with WSL2 (recommended)

## 🛠️ **Development Tools**

### **Recommended IDE/Editor**
- **VS Code**: With Python, TypeScript, and TailwindCSS extensions
- **PyCharm**: Professional Python IDE
- **Vim/Emacs**: For advanced users

### **Useful Extensions**
- **Python**: Language support and debugging
- **TypeScript**: Frontend development
- **TailwindCSS**: CSS framework support
- **GitLens**: Enhanced Git integration
- **Docker**: Container management

## 📚 **Additional Resources**

- **API Documentation**: [API.md](API.md)
- **Model Support**: [MODEL_SUPPORT.md](MODEL_SUPPORT.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md) 