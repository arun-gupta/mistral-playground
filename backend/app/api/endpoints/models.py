from fastapi import APIRouter, HTTPException
from typing import List
import uuid
import os

from app.models.requests import PromptRequest, ComparisonRequest, ModelDownloadRequest
from app.models.responses import ModelResponse, ComparisonResponse, ModelInfo, ModelDownloadResponse, ModelStatus
from app.services.model_service import model_service

router = APIRouter()

# Track downloaded models (in a real app, this would be persistent)
downloaded_models = set()

@router.post("/generate", response_model=ModelResponse)
async def generate_response(request: PromptRequest):
    """Generate response from a single model"""
    print(f"🎯 Received generate request:")
    print(f"   Prompt: {request.prompt}")
    print(f"   Model: {request.model_name}")
    print(f"   Provider: {request.provider}")
    print(f"   Temperature: {request.temperature}")
    print(f"   Max tokens: {request.max_tokens}")
    print(f"   Top P: {request.top_p}")
    print(f"   System prompt: {request.system_prompt}")
    
    try:
        print("🔄 Calling model service...")
        response = await model_service.generate_response(request)
        print(f"✅ Model service returned: {response.text[:100]}...")
        return response
    except Exception as e:
        print(f"❌ Error in generate endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/compare", response_model=ComparisonResponse)
async def compare_models(request: ComparisonRequest):
    """Compare responses from multiple models"""
    try:
        responses = await model_service.compare_models(
            request.prompt,
            request.models,
            request.parameters
        )
        return ComparisonResponse(
            prompt=request.prompt,
            responses=responses,
            comparison_id=str(uuid.uuid4())
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test", response_model=dict)
async def test_endpoint():
    """Test endpoint to verify API is working"""
    print("🧪 Test endpoint called")
    return {"message": "API is working!", "status": "ok"}

@router.get("/simple", response_model=dict)
async def simple_test():
    """Simple test without model loading"""
    print("🧪 Simple test endpoint called")
    return {"message": "Simple test works!", "timestamp": "now"}

@router.get("/mock-status", response_model=dict)
async def get_mock_status():
    """Get the current mock mode status"""
    from app.core.config import settings
    return {
        "mock_mode": settings.MOCK_MODE,
        "message": "Mock mode is enabled" if settings.MOCK_MODE else "Mock mode is disabled - using real models"
    }

@router.get("/model-status", response_model=dict)
async def get_model_status():
    """Get the current model loading status"""
    from app.services.model_service import model_service
    
    # Get loaded models
    loaded_models = list(model_service.transformers_models.keys())
    vllm_models = list(model_service.vllm_models.keys())
    ct_models = list(model_service.ct_models.keys())
    
    all_loaded = loaded_models + vllm_models + ct_models
    
    return {
        "loaded_models": all_loaded,
        "total_loaded": len(all_loaded),
        "transformers_models": loaded_models,
        "vllm_models": vllm_models,
        "ct_models": ct_models,
        "status": "ready" if len(all_loaded) > 0 else "no_models_loaded"
    }

@router.post("/toggle-mock", response_model=dict)
async def toggle_mock_mode(request: dict):
    """Toggle mock mode on/off"""
    try:
        new_mode = request.get("mock_mode", False)
        
        # Update the environment variable
        os.environ["MOCK_MODE"] = str(new_mode).lower()
        
        # Reload settings to pick up the change
        from app.core.config import settings
        settings.MOCK_MODE = new_mode
        
        print(f"🎭 Mock mode {'enabled' if new_mode else 'disabled'}")
        
        return {
            "success": True,
            "mock_mode": new_mode,
            "message": f"Mock mode {'enabled' if new_mode else 'disabled'} successfully"
        }
    except Exception as e:
        print(f"❌ Error toggling mock mode: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mock-generate", response_model=ModelResponse)
async def mock_generate():
    """Mock generate endpoint that doesn't use model service"""
    print("🎭 Mock generate endpoint called")
    return ModelResponse(
        text="🎉 SUCCESS! This is a MOCK response. The API flow is working perfectly!",
        model_name="mock-model",
        provider="mock",
        tokens_used=25,
        input_tokens=5,
        output_tokens=20,
        latency_ms=100,
        finish_reason="stop"
    )

@router.post("/download", response_model=ModelDownloadResponse)
async def download_model(request: ModelDownloadRequest):
    """Download a model proactively"""
    try:
        print(f"📥 Starting download for model: {request.model_name}")
        
        # Check if model is already loaded
        from app.services.model_service import model_service
        loaded_models = (
            list(model_service.transformers_models.keys()) +
            list(model_service.vllm_models.keys()) +
            list(model_service.ct_models.keys())
        )
        
        if request.model_name in loaded_models and not request.force_redownload:
            return ModelDownloadResponse(
                model_name=request.model_name,
                provider=request.provider,
                status="completed",
                progress=100.0,
                message=f"Model {request.model_name} is already loaded",
                download_size="Already cached",
                estimated_time="0s"
            )
        
        # Start download process
        # For now, we'll simulate the download process
        # In a real implementation, this would be async and track progress
        
        # Add to downloaded models set (simulating successful download)
        downloaded_models.add(request.model_name)
        
        return ModelDownloadResponse(
            model_name=request.model_name,
            provider=request.provider,
            status="downloading",
            progress=0.0,
            message=f"Starting download of {request.model_name}",
            download_size="Calculating...",
            estimated_time="Calculating..."
        )
        
    except Exception as e:
        print(f"❌ Error downloading model {request.model_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download-status/{model_name:path}", response_model=ModelDownloadResponse)
async def get_download_status(model_name: str):
    """Get download status for a specific model"""
    try:
        # Decode URL-encoded model name
        import urllib.parse
        decoded_model_name = urllib.parse.unquote(model_name)
        
        # This would check the actual download status
        # For now, return a mock response that simulates progress
        import time
        import random
        
        # Simulate different download states based on time
        current_time = time.time()
        # Use model name hash to create consistent "progress" for demo
        progress_seed = hash(decoded_model_name) % 100
        
        # Check if model is already downloaded
        if decoded_model_name in downloaded_models:
            status = "completed"
            progress = 100.0
            message = f"Model {decoded_model_name} download completed"
            estimated_time = "0s"
        else:
            # Simulate progress between 0-100%
            progress = min(100.0, (current_time % 30) * 3.33 + progress_seed)
            
            if progress >= 100:
                status = "completed"
                message = f"Model {decoded_model_name} download completed"
                estimated_time = "0s"
                # Mark as downloaded
                downloaded_models.add(decoded_model_name)
            else:
                status = "downloading"
                message = f"Downloading {decoded_model_name}... {progress:.1f}%"
                estimated_time = f"{max(1, int((100 - progress) / 3.33))}s"
        
        return ModelDownloadResponse(
            model_name=decoded_model_name,
            provider="huggingface",
            status=status,
            progress=progress,
            message=message,
            download_size="2.5GB",
            estimated_time=estimated_time
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/available", response_model=List[ModelStatus])
async def get_available_models():
    """Get detailed status of all available models"""
    try:
        from app.services.model_service import model_service
        
        # Get loaded models
        loaded_models = (
            list(model_service.transformers_models.keys()) +
            list(model_service.vllm_models.keys()) +
            list(model_service.ct_models.keys())
        )
        
        # Get available models from the service
        available_models = model_service.get_available_models()
        
        model_statuses = []
        for model_name in available_models:
            # Only mark as loaded if actually loaded in memory
            is_loaded = model_name in loaded_models
            model_statuses.append(ModelStatus(
                name=model_name,
                provider="huggingface",
                is_loaded=is_loaded,
                is_downloading=False,
                download_progress=100.0 if is_loaded else None,
                size_on_disk="2.5GB" if is_loaded else None,
                last_used=None,
                load_time=None
            ))
        
        return model_statuses
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list", response_model=List[str])
async def get_model_list():
    """Get simple list of all available model names"""
    try:
        from app.services.model_service import model_service
        return model_service.get_available_models()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/info", response_model=List[ModelInfo])
async def get_model_info():
    """Get detailed information about available models"""
    models_info = [
        # CPU-friendly tiny models
        ModelInfo(
            name="microsoft/DialoGPT-small",
            provider="huggingface",
            context_length=1024,
            parameters="117M",
            quantization="fp32",
            license="MIT",
            description="Very small, CPU-friendly model for testing"
        ),
        ModelInfo(
            name="microsoft/DialoGPT-medium",
            provider="huggingface",
            context_length=1024,
            parameters="345M",
            quantization="fp32",
            license="MIT",
            description="Medium-sized model, good balance of speed and quality"
        ),
        ModelInfo(
            name="microsoft/DialoGPT-large",
            provider="huggingface",
            context_length=1024,
            parameters="774M",
            quantization="fp32",
            license="MIT",
            description="Larger model with better quality, still CPU-friendly"
        ),
        
        # Quantized Mistral models (CPU-optimized)
        ModelInfo(
            name="TheBloke/Mistral-7B-Instruct-v0.1-GGUF",
            provider="huggingface",
            context_length=8192,
            parameters="7B",
            quantization="GGUF",
            license="Apache 2.0",
            description="Quantized Mistral model optimized for CPU inference"
        ),
        
        # Full Mistral models (require more RAM)
        ModelInfo(
            name="mistralai/Mistral-7B-Instruct-v0.1",
            provider="huggingface",
            context_length=8192,
            parameters="7B",
            quantization="fp16",
            license="Apache 2.0",
            description="Full Mistral model, requires ~14GB RAM"
        ),
        ModelInfo(
            name="mistralai/Mistral-7B-Instruct-v0.2",
            provider="huggingface",
            context_length=8192,
            parameters="7B",
            quantization="fp16",
            license="Apache 2.0",
            description="Latest Mistral model with improved performance"
        ),
        
        # GPU-only models (for reference)
        ModelInfo(
            name="mistralai/Mixtral-8x7B-Instruct-v0.1",
            provider="vllm",
            context_length=32768,
            parameters="8x7B",
            quantization="fp16",
            license="Apache 2.0",
            description="High-performance mixture-of-experts model (GPU recommended)"
        ),
        ModelInfo(
            name="mistralai/CodeMistral-7B-Instruct-v0.1",
            provider="vllm",
            context_length=8192,
            parameters="7B",
            quantization="fp16",
            license="Apache 2.0",
            description="Specialized for code generation and analysis (GPU recommended)"
        ),
        
        # Meta Llama models (2 and 3 together)
        # Llama 2 models (legacy)
        ModelInfo(
            name="TheBloke/Llama-2-7B-Chat-GGUF",
            provider="huggingface",
            context_length=4096,
            parameters="7B",
            quantization="GGUF",
            license="Meta License",
            description="Quantized Llama-2 chat model optimized for CPU inference"
        ),
        ModelInfo(
            name="TheBloke/Llama-2-13B-Chat-GGUF",
            provider="huggingface",
            context_length=4096,
            parameters="13B",
            quantization="GGUF",
            license="Meta License",
            description="Larger quantized Llama-2 chat model with better quality"
        ),
        ModelInfo(
            name="meta-llama/Llama-2-7b-chat-hf",
            provider="huggingface",
            context_length=4096,
            parameters="7B",
            quantization="fp16",
            license="Meta License",
            description="Full Llama-2 chat model, requires ~14GB RAM"
        ),
        
        # Llama 3 models (newer, better performance)
        ModelInfo(
            name="TheBloke/Meta-Llama-3-10B-Instruct-GGUF",
            provider="huggingface",
            context_length=8192,
            parameters="10B",
            quantization="GGUF",
            license="Meta License",
            description="Lightweight Llama 3 model optimized for CPU inference"
        ),
        ModelInfo(
            name="TheBloke/Meta-Llama-3-14B-Instruct-GGUF",
            provider="huggingface",
            context_length=8192,
            parameters="14B",
            quantization="GGUF",
            license="Meta License",
            description="High-quality Llama 3 model with excellent performance"
        ),

        
        # Google Gemma models
        ModelInfo(
            name="google/gemma-2b",
            provider="huggingface",
            context_length=8192,
            parameters="2B",
            quantization="fp16",
            license="Gemma License",
            description="Small, efficient model from Google, good for development"
        ),
        ModelInfo(
            name="google/gemma-7b",
            provider="huggingface",
            context_length=8192,
            parameters="7B",
            quantization="fp16",
            license="Gemma License",
            description="Medium-sized Gemma model with good performance"
        ),
        ModelInfo(
            name="google/gemma-2b-it",
            provider="huggingface",
            context_length=8192,
            parameters="2B",
            quantization="fp16",
            license="Gemma License",
            description="Instruction-tuned version of Gemma-2B for better chat"
        ),
        ModelInfo(
            name="google/gemma-7b-it",
            provider="huggingface",
            context_length=8192,
            parameters="7B",
            quantization="fp16",
            license="Gemma License",
            description="Instruction-tuned version of Gemma-7B for better chat"
        ),
        
        # Mixtral models (high performance)
        ModelInfo(
            name="TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF",
            provider="huggingface",
            context_length=32768,
            parameters="8x7B",
            quantization="GGUF",
            license="Apache 2.0",
            description="Quantized Mixtral model optimized for CPU inference"
        )
    ]
    return models_info 