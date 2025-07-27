from fastapi import APIRouter, HTTPException
from typing import List
import uuid
import os
from datetime import datetime

from backend.app.models.requests import PromptRequest, ComparisonRequest, ModelDownloadRequest
from backend.app.models.responses import ModelResponse, ComparisonResponse, ModelInfo, ModelDownloadResponse, ModelStatus
from backend.app.services.model_service import model_service

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

@router.get("/download-test", response_model=dict)
async def download_test():
    """Test download functionality"""
    try:
        # Test if we can access the downloaded_models set
        model_count = len(downloaded_models)
        
        # Test a mock download
        test_model = "test-model"
        downloaded_models.add(test_model)
        
        return {
            "message": "Download functionality test",
            "status": "ok",
            "downloaded_models_count": model_count,
            "test_model_added": test_model in downloaded_models
        }
    except Exception as e:
        return {
            "message": "Download functionality test failed",
            "status": "error",
            "error": str(e)
        }

@router.get("/mock-status", response_model=dict)
async def get_mock_status():
    """Get the current mock mode status"""
    from backend.app.core.config import settings
    return {
        "mock_mode": settings.MOCK_MODE,
        "message": "Mock mode is enabled" if settings.MOCK_MODE else "Mock mode is disabled - using real models"
    }

@router.get("/model-status", response_model=dict)
async def get_model_status():
    """Get the current model loading status"""
    from backend.app.services.model_service import model_service
    
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
        from backend.app.core.config import settings
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
        try:
            from backend.app.services.model_service import model_service
            loaded_models = (
                list(model_service.transformers_models.keys()) +
                list(model_service.vllm_models.keys()) +
                list(model_service.ct_models.keys())
            )
        except ImportError as e:
            print(f"⚠️ Model service import failed, using empty loaded models list: {e}")
            loaded_models = []
        except Exception as e:
            print(f"⚠️ Error getting loaded models, using empty list: {e}")
            loaded_models = []
        
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
            estimated_time="Calculating...",
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        print(f"❌ Error downloading model {request.model_name}: {e}")
        # Return a mock response instead of raising an error
        return ModelDownloadResponse(
            model_name=request.model_name,
            provider=request.provider,
            status="failed",
            progress=0.0,
            message=f"Download failed: {str(e)}",
            download_size="Unknown",
            estimated_time="Unknown",
            timestamp=datetime.now().isoformat()
        )

@router.get("/download-status/{model_name:path}", response_model=ModelDownloadResponse)
async def get_download_status(model_name: str):
    """Get the status of a model download"""
    try:
        # For now, we'll simulate download status
        # In a real implementation, this would check actual download progress
        
        if model_name in downloaded_models:
            return ModelDownloadResponse(
                model_name=model_name,
                provider="huggingface",
                status="completed",
                progress=100.0,
                message=f"Model {model_name} downloaded successfully",
                download_size="2.5GB",
                estimated_time="0s",
                timestamp=datetime.now().isoformat()
            )
        else:
            return ModelDownloadResponse(
                model_name=model_name,
                provider="huggingface",
                status="downloading",
                progress=50.0,  # Simulate 50% progress
                message=f"Downloading {model_name}...",
                download_size="2.5GB",
                estimated_time="5 minutes",
                timestamp=datetime.now().isoformat()
            )
            
    except Exception as e:
        return ModelDownloadResponse(
            model_name=model_name,
            provider="huggingface",
            status="failed",
            progress=0.0,
            message=f"Error checking download status: {str(e)}",
            download_size="Unknown",
            estimated_time="Unknown",
            timestamp=datetime.now().isoformat()
        )

@router.get("/available", response_model=List[ModelStatus])
async def get_available_models():
    """Get detailed status of all available models"""
    try:
        from backend.app.services.model_service import model_service
        
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
        
    except ImportError as e:
        print(f"❌ Import error in get_available_models: {e}")
        # Return basic model statuses if model service can't be imported
        fallback_models = [
            # Tiny models (very CPU-friendly)
            "microsoft/DialoGPT-small",      # 117M parameters, ~500MB RAM
            "microsoft/DialoGPT-medium",     # 345M parameters, ~1.5GB RAM
            "microsoft/DialoGPT-large",      # 774M parameters, ~3GB RAM
            
            # Quantized Mistral models (CPU-optimized)
            "TheBloke/Mistral-7B-Instruct-v0.1-GGUF",  # 4-8GB RAM
            "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",  # 4-8GB RAM
            
            # Full Mistral models (require more RAM)
            "mistralai/Mistral-7B-Instruct-v0.1",      # ~14GB RAM
            "mistralai/Mistral-7B-Instruct-v0.2",      # ~14GB RAM
            "mistralai/Mistral-7B-v0.1",               # Base model, ~14GB RAM
            
            # Meta Llama models (2 and 3 together)
            # Llama 2 models (legacy)
            "TheBloke/Llama-2-13B-Chat-GGUF",          # 8-12GB RAM, CPU optimized
            
            # Llama 3 models (newer, better performance)
            "meta-llama/Meta-Llama-3-8B-Instruct",     # ~16GB RAM, instruct
            "meta-llama/Meta-Llama-3-8B",              # ~16GB RAM, base
            "TheBloke/Meta-Llama-3-8B-Instruct-GGUF",  # Quantized instruct
            "TheBloke/Meta-Llama-3-10B-Instruct-GGUF", # ~6-10GB RAM, light option
            "TheBloke/Meta-Llama-3-14B-Instruct-GGUF", # ~8-12GB RAM, best balance
            
            # Google Gemma models
            "google/gemma-2b",                          # ~4GB RAM, small model
            "google/gemma-7b",                          # ~14GB RAM, medium model
            "google/gemma-2b-it",                       # ~4GB RAM, instruction tuned
            "google/gemma-7b-it",                       # ~14GB RAM, instruction tuned
            
            # Mixtral models (high performance)
            "mistralai/Mixtral-8x7B-Instruct-v0.1",    # ~32GB RAM, GPU recommended
            "TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF", # 16-24GB RAM, CPU optimized
            
            # GPU-only models (for reference)
            "mistralai/CodeMistral-7B-Instruct-v0.1",  # ~14GB RAM, GPU recommended
        ]
        
        model_statuses = []
        for model_name in fallback_models:
            model_statuses.append(ModelStatus(
                name=model_name,
                provider="huggingface",
                is_loaded=False,
                is_downloading=False,
                download_progress=None,
                size_on_disk=None,
                last_used=None,
                load_time=None
            ))
        
        return model_statuses
        
    except Exception as e:
        print(f"❌ Error in get_available_models: {e}")
        # Return basic model statuses on any other error
        fallback_models = [
            # Tiny models (very CPU-friendly)
            "microsoft/DialoGPT-small",      # 117M parameters, ~500MB RAM
            "microsoft/DialoGPT-medium",     # 345M parameters, ~1.5GB RAM
            "microsoft/DialoGPT-large",      # 774M parameters, ~3GB RAM
            
            # Quantized Mistral models (CPU-optimized)
            "TheBloke/Mistral-7B-Instruct-v0.1-GGUF",  # 4-8GB RAM
            "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",  # 4-8GB RAM
            
            # Full Mistral models (require more RAM)
            "mistralai/Mistral-7B-Instruct-v0.1",      # ~14GB RAM
            "mistralai/Mistral-7B-Instruct-v0.2",      # ~14GB RAM
            "mistralai/Mistral-7B-v0.1",               # Base model, ~14GB RAM
            
            # Meta Llama models (2 and 3 together)
            # Llama 2 models (legacy)
            "TheBloke/Llama-2-13B-Chat-GGUF",          # 8-12GB RAM, CPU optimized
            
            # Llama 3 models (newer, better performance)
            "meta-llama/Meta-Llama-3-8B-Instruct",     # ~16GB RAM, instruct
            "meta-llama/Meta-Llama-3-8B",              # ~16GB RAM, base
            "TheBloke/Meta-Llama-3-8B-Instruct-GGUF",  # Quantized instruct
            "TheBloke/Meta-Llama-3-10B-Instruct-GGUF", # ~6-10GB RAM, light option
            "TheBloke/Meta-Llama-3-14B-Instruct-GGUF", # ~8-12GB RAM, best balance
            
            # Google Gemma models
            "google/gemma-2b",                          # ~4GB RAM, small model
            "google/gemma-7b",                          # ~14GB RAM, medium model
            "google/gemma-2b-it",                       # ~4GB RAM, instruction tuned
            "google/gemma-7b-it",                       # ~14GB RAM, instruction tuned
            
            # Mixtral models (high performance)
            "mistralai/Mixtral-8x7B-Instruct-v0.1",    # ~32GB RAM, GPU recommended
            "TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF", # 16-24GB RAM, CPU optimized
            
            # GPU-only models (for reference)
            "mistralai/CodeMistral-7B-Instruct-v0.1",  # ~14GB RAM, GPU recommended
        ]
        
        model_statuses = []
        for model_name in fallback_models:
            model_statuses.append(ModelStatus(
                name=model_name,
                provider="huggingface",
                is_loaded=False,
                is_downloading=False,
                download_progress=None,
                size_on_disk=None,
                last_used=None,
                load_time=None
            ))
        
        return model_statuses

@router.get("/list", response_model=List[str])
async def get_model_list():
    """Get list of available model names"""
    try:
        from backend.app.services.model_service import model_service
        return model_service.get_available_models()
    except Exception as e:
        print(f"❌ Error getting model list: {e}")
        # Return fallback models
        return [
            "microsoft/DialoGPT-small",
            "TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
            "TheBloke/Mistral-7B-Instruct-v0.1-GGUF",
            "TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF"
        ]

@router.get("/info", response_model=List[ModelInfo])
async def get_model_info():
    """Get detailed information about available models"""
    try:
        from backend.app.services.model_service import model_service
        available_models = model_service.get_available_models()
        
        model_infos = []
        for model_name in available_models:
            # Determine model parameters based on name
            if "7B" in model_name:
                parameters = "7B"
            elif "8x7B" in model_name or "Mixtral" in model_name:
                parameters = "8x7B"
            elif "13B" in model_name:
                parameters = "13B"
            elif "2B" in model_name:
                parameters = "2B"
            else:
                parameters = "Unknown"
            
            # Determine quantization
            quantization = "GGUF" if "GGUF" in model_name else None
            
            # Determine license (simplified)
            license_type = "Apache 2.0" if "mistral" in model_name.lower() else "Custom"
            
            model_infos.append(ModelInfo(
                name=model_name,
                provider="huggingface",
                context_length=8192,  # Default for most models
                parameters=parameters,
                quantization=quantization,
                license=license_type,
                description=f"{parameters} parameter model from Hugging Face"
            ))
        
        return model_infos
        
    except Exception as e:
        print(f"❌ Error getting model info: {e}")
        # Return basic info for fallback models
        return [
            ModelInfo(
                name="microsoft/DialoGPT-small",
                provider="huggingface",
                context_length=1024,
                parameters="117M",
                quantization=None,
                license="MIT",
                description="Small conversational model for testing"
            )
        ] 