# Model Support Guide

## 🎯 **Mistral Model Families**

### **Mistral-7B Series** (Primary Focus)
- **Base Models**: `mistralai/Mistral-7B-v0.1` (~14GB RAM) - Foundation model
- **Instruct Models**: `mistralai/Mistral-7B-Instruct-v0.2` (~14GB RAM) - Instruction-tuned for chat
- **GGUF Quantized**: `TheBloke/Mistral-7B-Instruct-v0.2-GGUF` (4-8GB RAM) - CPU optimized
- **Code Models**: `mistralai/CodeMistral-7B-Instruct` (~14GB RAM) - Specialized for code generation

### **Mixtral-8x7B Series** (High Performance)
- **Full Model**: `mistralai/Mixtral-8x7B-Instruct-v0.1` (~32GB RAM) - Mixture-of-experts, GPU recommended
- **GGUF Quantized**: `TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF` (16-24GB RAM) - CPU optimized version

### **Other Supported Models** (For Comparison)

#### Meta Llama Models
- **Llama 2 Series**: `meta-llama/Llama-2-7b-chat-hf` (~14GB RAM) - Chat-optimized
- **Llama 3 Series**: `meta-llama/Meta-Llama-3-8B-Instruct` (~16GB RAM) - Latest generation
- **GGUF Variants**: `TheBloke/Meta-Llama-3-8B-Instruct-GGUF` (4-8GB RAM) - Quantized versions

#### Google Gemma Models
- **Gemma Series**: Efficient models from Google
  - `google/gemma-2b` (~4GB RAM) - Small, efficient model for development
  - `google/gemma-7b` (~14GB RAM) - Medium-sized model with good performance
  - `google/gemma-2b-it` (~4GB RAM) - Instruction-tuned version for better chat
  - `google/gemma-7b-it` (~14GB RAM) - Instruction-tuned version for better chat

#### Development/Testing Models
- **DialoGPT**: `microsoft/DialoGPT-small` (~500MB RAM) - Lightweight for testing
- **Other Models**: Various models for comparison and testing purposes

## 🚀 **Model Selection Guide**

### **For Testing/Development**
- **Lightweight**: `microsoft/DialoGPT-small` (~500MB RAM) - Fast startup, good for UI testing
- **Small Mistral**: `google/gemma-2b` (~4GB RAM) - Efficient development model
- **Mistral GGUF**: `TheBloke/Mistral-7B-Instruct-v0.2-GGUF` (4-8GB RAM) - CPU-friendly Mistral

### **For Production (CPU)**
- **Recommended**: `TheBloke/Mistral-7B-Instruct-v0.2-GGUF` (4-8GB RAM) - Best balance
- **Alternative**: `TheBloke/Meta-Llama-3-8B-Instruct-GGUF` (4-8GB RAM) - Good performance

### **For High Quality**
- **Mistral-7B**: `mistralai/Mistral-7B-Instruct-v0.2` (~14GB RAM) - Full Mistral model
- **Llama 3**: `meta-llama/Meta-Llama-3-8B-Instruct` (~16GB RAM) - Latest Llama

### **For Maximum Performance**
- **Mixtral GGUF**: `TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF` (16-24GB RAM) - High performance
- **Full Mixtral**: `mistralai/Mixtral-8x7B-Instruct-v0.1` (~32GB RAM) - Maximum quality (GPU recommended)

### **For RAG & Playground**
- **Mistral Models Only**: The playground prioritizes Mistral models for focused testing and comparison

## 🔧 **Model Providers**

### **Hugging Face**
- **Primary Provider**: Most models available through Hugging Face Hub
- **CPU-Friendly**: Optimized for CPU inference with Transformers
- **Quantized Models**: GGUF models for resource-constrained environments

### **vLLM** (GPU Recommended)
- **High Performance**: Fast inference for supported models
- **GPU Acceleration**: CUDA support for faster processing
- **Memory Efficient**: Optimized memory usage for large models

### **Ollama**
- **Easy Management**: Simple model management and switching
- **GGUF Support**: Native support for quantized models
- **Local Deployment**: Self-contained model serving

## 📊 **Model Performance Characteristics**

### **Mistral-7B Series**
- **Speed**: Fast inference, good for real-time applications
- **Quality**: Excellent instruction-following capabilities
- **Memory**: Moderate memory requirements (~14GB for full model)
- **Use Cases**: Chat, instruction-following, general text generation

### **Mixtral-8x7B Series**
- **Speed**: Slower than 7B but higher quality
- **Quality**: Superior performance due to mixture-of-experts architecture
- **Memory**: High memory requirements (~32GB for full model)
- **Use Cases**: High-quality text generation, complex reasoning tasks

### **GGUF Quantized Models**
- **Speed**: Slower than full models but CPU-friendly
- **Quality**: Slightly reduced quality due to quantization
- **Memory**: Significantly reduced memory requirements
- **Use Cases**: Resource-constrained environments, development, testing

## 🛠️ **Model Management**

### **Download Status**
- **⏳ Not Downloaded**: Model available but not yet downloaded
- **🔄 Downloading**: Model currently being downloaded
- **📦 On Disk**: Model downloaded and ready to load
- **✅ Loaded**: Model loaded in memory and ready for inference

### **Model Organization**
- **By Family**: Grouped by Mistral, Llama, Gemma families
- **By Size**: Filtered by memory requirements
- **By Type**: Base, Instruct, Quantized variants
- **By Performance**: Recommended models highlighted

### **Model Comparison**
- **Side-by-Side Testing**: Compare responses from multiple models
- **Performance Metrics**: Token usage, latency, quality assessment
- **Prepared Scenarios**: Test combinations for different use cases
- **Real-time Analysis**: Live comparison of model capabilities

## 🔍 **Model Troubleshooting**

### **Common Issues**
- **Memory Errors**: Use smaller models or GGUF quantized versions
- **Slow Loading**: First-time model loading may take several minutes
- **Download Failures**: Check internet connection and disk space
- **Inference Errors**: Ensure model is compatible with current setup

### **Performance Optimization**
- **CPU Setup**: Use GGUF models for CPU-only environments
- **GPU Setup**: Use full models with vLLM for maximum performance
- **Memory Management**: Monitor memory usage and adjust model selection
- **Batch Processing**: Use appropriate batch sizes for your hardware

### **Model Compatibility**
- **Transformers**: Most models compatible with Hugging Face Transformers
- **vLLM**: Limited to supported model architectures
- **Ollama**: Requires Ollama-compatible model formats
- **GGUF**: Requires ctransformers for CPU inference 