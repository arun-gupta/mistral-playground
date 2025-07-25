# CPU-Friendly Mistral Models Guide

This guide lists the CPU-friendly Mistral models that can be used in the Mistral Playground application, ordered by resource requirements.

## 🖥️ **CPU-Friendly Model Options**

### **1. Tiny Models (Very CPU-Friendly)**
*Best for testing and development*

| Model | Parameters | RAM Usage | Speed | Quality | Use Case |
|-------|------------|-----------|-------|---------|----------|
| `microsoft/DialoGPT-small` | 117M | ~500MB | Very Fast | Basic | Testing, prototyping |
| `microsoft/DialoGPT-medium` | 345M | ~1.5GB | Fast | Good | Development, quick responses |
| `microsoft/DialoGPT-large` | 774M | ~3GB | Medium | Better | General use, good balance |

### **2. Quantized Mistral Models (CPU-Optimized)**
*Best balance of performance and resource usage*

| Model | Parameters | RAM Usage | Speed | Quality | Use Case |
|-------|------------|-----------|-------|---------|----------|
| `TheBloke/Mistral-7B-Instruct-v0.1-GGUF` | 7B | 4-8GB | Medium | Excellent | Production, high quality |
| `TheBloke/Mistral-7B-Instruct-v0.2-GGUF` | 7B | 4-8GB | Medium | Excellent | Latest features, best quality |

### **3. Full Mistral Models (High RAM)**
*Require significant RAM but no GPU*

| Model | Parameters | RAM Usage | Speed | Quality | Use Case |
|-------|------------|-----------|-------|---------|----------|
| `mistralai/Mistral-7B-Instruct-v0.1` | 7B | ~14GB | Slow | Excellent | High-quality inference |
| `mistralai/Mistral-7B-Instruct-v0.2` | 7B | ~14GB | Slow | Excellent | Latest model, best performance |
| `mistralai/Mistral-7B-v0.1` | 7B | ~14GB | Slow | Good | Base model, no instruction tuning |

## 🚀 **Recommended Setup by Use Case**

### **For Development & Testing**
```bash
# Use tiny models for quick iteration
MODEL_NAME=microsoft/DialoGPT-small
```

### **For Production (CPU-Only)**
```bash
# Use quantized models for best performance
MODEL_NAME=TheBloke/Mistral-7B-Instruct-v0.2-GGUF
```

### **For High-Quality Output**
```bash
# Use full models if you have enough RAM
MODEL_NAME=mistralai/Mistral-7B-Instruct-v0.2
```

## 📊 **Performance Comparison**

| Model Type | RAM Usage | Speed (tokens/sec) | Quality | Setup Complexity |
|------------|-----------|-------------------|---------|------------------|
| **Tiny** | 0.5-3GB | 50-100 | Basic | Very Easy |
| **Quantized** | 4-8GB | 10-20 | Excellent | Easy |
| **Full** | 14GB+ | 2-5 | Excellent | Moderate |

## ⚙️ **Configuration Tips**

### **For Low RAM Systems (< 8GB)**
- Use `microsoft/DialoGPT-small` or `microsoft/DialoGPT-medium`
- Set `max_tokens` to 50-100
- Use lower `temperature` values (0.3-0.7)

### **For Medium RAM Systems (8-16GB)**
- Use quantized Mistral models (`TheBloke/Mistral-7B-Instruct-v0.1-GGUF`)
- Set `max_tokens` to 200-500
- Can use higher `temperature` values (0.7-1.0)

### **For High RAM Systems (16GB+)**
- Use full Mistral models (`mistralai/Mistral-7B-Instruct-v0.2`)
- Set `max_tokens` to 500-1000
- Full parameter tuning capabilities

## 🔧 **Installation Notes**

### **GGUF Models (Recommended for CPU)**
GGUF models require additional setup:
```bash
# Install GGUF support
pip install llama-cpp-python

# Or for better CPU performance
pip install llama-cpp-python --force-reinstall --index-url https://jllllll.github.io/llama-cpp-python-cuBLAS-wheels/cpu
```

### **Memory Optimization**
```bash
# For Hugging Face models, use these settings
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:128
export TOKENIZERS_PARALLELISM=false
```

## 🎯 **Model Selection Guide**

### **Start Here (Testing)**
- **Model**: `microsoft/DialoGPT-small`
- **Why**: Fastest, smallest, perfect for testing the application

### **Daily Use (Development)**
- **Model**: `microsoft/DialoGPT-medium` or `TheBloke/Mistral-7B-Instruct-v0.1-GGUF`
- **Why**: Good balance of speed and quality

### **Production (High Quality)**
- **Model**: `mistralai/Mistral-7B-Instruct-v0.2`
- **Why**: Best quality, latest features

## ⚠️ **Important Notes**

1. **First Load**: Models take time to download and load on first use
2. **Memory**: Monitor RAM usage, especially with larger models
3. **Speed**: CPU inference is much slower than GPU
4. **Quality**: Larger models generally produce better results
5. **Stability**: Smaller models are more stable for development

## 🔗 **Model Sources**

- **Hugging Face Hub**: https://huggingface.co/mistralai
- **TheBloke (Quantized)**: https://huggingface.co/TheBloke
- **Microsoft DialoGPT**: https://huggingface.co/microsoft/DialoGPT-small 