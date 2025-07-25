from fastapi import APIRouter, HTTPException
from typing import List
import uuid
import os

from app.models.requests import PromptRequest, ComparisonRequest
from app.models.responses import ModelResponse, ComparisonResponse, ModelInfo
from app.services.model_service import model_service

router = APIRouter()

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
    
    return {
        "loaded_models": loaded_models + vllm_models,
        "total_loaded": len(loaded_models) + len(vllm_models),
        "transformers_models": loaded_models,
        "vllm_models": vllm_models,
        "status": "ready" if (len(loaded_models) + len(vllm_models)) > 0 else "no_models_loaded"
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
        )
    ]
    return models_info 