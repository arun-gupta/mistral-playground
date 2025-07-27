# Troubleshooting Guide

## 🔧 **Common Issues & Solutions**

### **Frontend Issues**

#### **Tailwind CSS Error**
**Problem**: `Tailwind CSS is unable to load your config file: Can't resolve 'tailwindcss-animate'`

**Solution**:
```bash
cd frontend
chmod +x install-deps.sh
./install-deps.sh
```

**Alternative fix**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm install tailwindcss-animate
```

#### **Port Issues**
**Problem**: Frontend not accessible in Codespaces

**Solution**: Make sure ports 5173 (frontend) and 8000 (backend) are forwarded in Codespaces

#### **Import Errors**
**Problem**: `Failed to resolve import "clsx" from "src/lib/utils.ts"`

**Solution**:
```bash
cd frontend
chmod +x install-deps.sh
./install-deps.sh
```

### **Backend Issues**

#### **Model Loading**
**Problem**: First-time model loading takes too long

**Solution**: 
- First-time model loading may take several minutes
- Use smaller models like `microsoft/DialoGPT-small` for testing
- Check your internet connection for model downloads

#### **Memory Issues**
**Problem**: Out of memory errors when loading models

**Solution**:
- Use smaller models like `microsoft/DialoGPT-small` for testing
- Use GGUF quantized models for CPU environments
- Increase system RAM or use cloud environments

#### **GGUF Models**
**Problem**: GGUF models fail to load

**Solution**: Ensure `ctransformers` is installed for GGUF support
```bash
pip install ctransformers==0.2.27
```

#### **Module Import Errors**
**Problem**: `ModuleNotFoundError: No module named 'app.models'`

**Solution**: Run from project root directory
```bash
# From project root directory
source venv/bin/activate
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### **General Issues**

#### **Dependencies**
**Problem**: Missing dependencies

**Solution**:
```bash
# Backend
cd backend
source venv/bin/activate
pip install -r requirements-basic.txt

# Frontend
cd frontend
npm install
```

#### **Interactive Prompts**
**Problem**: Setup script asks for dependency level choice

**Solution**: The script has been updated to automatically use CPU dependencies. If you still see prompts, ensure you're using the latest version:
```bash
git pull origin main
./setup-and-start.sh
```

## 🚦 **Models Page Issues**

### **Only 4 Models Shown**
**Problem**: Models page shows only 4 models instead of full list

**Cause**: Backend API is not running, frontend falls back to hardcoded list

**Solution**:
```bash
# Start the backend manually (from project root)
source venv/bin/activate
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# Or restart the full setup
./setup-and-start.sh
```

### **API Connection Errors**
**Problem**: `net::ERR_CONNECTION_REFUSED` or 500 errors

**Solution**: Check if the backend is running on port 8000
```bash
curl http://localhost:8000/health
```

### **Full Model List**
**Solution**: Once backend is running, you'll see all 25+ available models

## ☁️ **Codespaces-Specific Issues**

### **Setup Script Not Running**
**Problem**: Codespaces setup doesn't start automatically

**Solution**:
```bash
# Run the comprehensive test script
bash .devcontainer/setup-and-start.sh
```

### **Services Not Starting**
**Problem**: Backend or frontend services not running

**Solution**:
```bash
# Check if services are running
ps aux | grep -E "(uvicorn|npm)"

# Check startup logs
cat /tmp/startup.log

# Test API endpoints
curl http://localhost:8000/health
curl http://localhost:5173

# Manual restart if needed
./setup-and-start.sh
```

### **Port Forwarding Issues**
**Problem**: Can't access services in Codespaces

**Solution**:
- Check that ports 8000 and 5173 are forwarded
- Use the "Ports" tab in VS Code to verify forwarding
- Try accessing via the provided URLs in the terminal

### **Real-time Logs Not Showing**
**Problem**: Setup logs are not displayed in terminal

**Solution**: The setup script has been updated to show real-time logs. If you're still not seeing them:
```bash
# Kill any existing processes
pkill -f uvicorn
pkill -f npm

# Run setup manually
bash .devcontainer/setup-and-start.sh
```

## 🔍 **Performance Issues**

### **Slow Model Loading**
**Problem**: Models take too long to load

**Solutions**:
- Use smaller models for testing
- Use GGUF quantized models for CPU environments
- Consider GPU setup for faster inference
- Check available RAM and close other applications

### **High Memory Usage**
**Problem**: Application uses too much memory

**Solutions**:
- Use quantized models (GGUF)
- Load only one model at a time
- Restart the application periodically
- Use smaller models for development

### **Slow Inference**
**Problem**: Model responses are slow

**Solutions**:
- Use GPU acceleration if available
- Use smaller models for faster responses
- Adjust generation parameters (max tokens, temperature)
- Use quantized models for CPU environments

## 🛠️ **Debugging Commands**

### **Check System Status**
```bash
# Check Python version
python --version

# Check Node.js version
node --version

# Check npm version
npm --version

# Check available memory
free -h  # Linux
top -l 1 | grep PhysMem  # macOS
```

### **Check Service Status**
```bash
# Check if backend is running
curl http://localhost:8000/health

# Check if frontend is running
curl http://localhost:5173

# Check running processes
ps aux | grep -E "(uvicorn|npm|node)"

# Check port usage
netstat -tulpn | grep -E "(8000|5173)"
```

### **Check Logs**
```bash
# Backend logs
tail -f logs/backend.log

# Frontend logs
tail -f logs/frontend.log

# System logs
journalctl -f  # Linux
log show --predicate 'process == "uvicorn"' --last 5m  # macOS
```

### **Reset Environment**
```bash
# Kill all related processes
pkill -f uvicorn
pkill -f npm
pkill -f node

# Clean up temporary files
rm -rf logs/*.log
rm -f *.pid

# Restart services
./setup-and-start.sh
```

## 📞 **Getting Help**

### **Before Asking for Help**
1. Check this troubleshooting guide
2. Check the [GitHub Issues](https://github.com/arun-gupta/mistral-playground/issues)
3. Search existing discussions
4. Try the reset commands above

### **When Reporting Issues**
Please include:
- Operating system and version
- Python version
- Node.js version
- Error messages (full text)
- Steps to reproduce
- Expected vs actual behavior

### **Useful Resources**
- [API Documentation](API.md)
- [Model Support Guide](MODEL_SUPPORT.md)
- [Setup Guide](SETUP.md)
- [GitHub Issues](https://github.com/arun-gupta/mistral-playground/issues) 