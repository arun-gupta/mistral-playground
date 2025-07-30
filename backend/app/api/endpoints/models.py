from fastapi import APIRouter, HTTPException
from typing import List
import uuid
import os
from datetime import datetime

from backend.app.models.requests import PromptRequest, ComparisonRequest, ModelDownloadRequest
from backend.app.models.responses import ModelResponse, ComparisonResponse, ModelInfo, ModelDownloadResponse, ModelStatus
from backend.app.services.model_service import model_service
from backend.app.services.download_service import download_service
from .dashboard import record_performance_data, record_comparison_data

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
        
        # Record performance data for dashboard
        record_performance_data(response, success=True)
        
        return response
    except Exception as e:
        print(f"❌ Error in generate endpoint: {e}")
        # Record failed request
        if 'response' in locals():
            record_performance_data(response, success=False)
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
        
        # Record performance data for each model in comparison
        for response in responses:
            record_comparison_data(response, success=True)
        
        return ComparisonResponse(
            prompt=request.prompt,
            responses=responses,
            comparison_id=str(uuid.uuid4())
        )
    except Exception as e:
        # Record failed comparisons
        if 'responses' in locals():
            for response in responses:
                record_comparison_data(response, success=False)
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
        
        # Use the actual download service
        result = await download_service.download_model(request.model_name, request.provider)
        
        # Convert the result to ModelDownloadResponse
        return ModelDownloadResponse(
            model_name=result["model_name"],
            provider=result["provider"],
            status=result["status"],
            progress=result["progress"],
            message=result["message"],
            download_size=result["download_size"],
            estimated_time=result["estimated_time"],
            timestamp=result["timestamp"]
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
        # Use the actual download service
        result = await download_service.get_download_status(model_name)
        
        # Convert the result to ModelDownloadResponse
        return ModelDownloadResponse(
            model_name=result["model_name"],
            provider=result["provider"],
            status=result["status"],
            progress=result["progress"],
            message=result["message"],
            download_size=result["download_size"],
            estimated_time=result["estimated_time"],
            timestamp=result["timestamp"]
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
    
    # Define fallback models once to avoid duplication
    def get_fallback_models():
        return [
            # Tiny models (very CPU-friendly)
            "microsoft/DialoGPT-small",      # 117M parameters, ~500MB RAM
            "microsoft/DialoGPT-medium",     # 345M parameters, ~1.5GB RAM
            "microsoft/DialoGPT-large",      # 774M parameters, ~3GB RAM
            
            # Mistral models (6 total - smaller sizes preferred)
            "mistralai/Mistral-7B-v0.1",               # Base model, ~14GB RAM (still open)
            "mistralai/Mistral-7B-v0.2",               # Base model v2, ~14GB RAM (still open)
            "mistralai/Mistral-7B-Instruct-v0.3",      # Instruction-tuned, ~14GB RAM (still open)
            "mistralai/Mistral-7B-Instruct-v0.4",      # Latest instruction-tuned, ~14GB RAM (still open)
            "mistralai/Mistral-7B-Instruct-v0.5",      # Latest instruction-tuned, ~14GB RAM (still open)
            "mistralai/Mixtral-8x7B-Instruct-v0.1",    # High performance, ~32GB RAM, GPU recommended
            
            # Meta Llama models (official) - Top 6 most useful
            "meta-llama/Meta-Llama-3-8B-Instruct",     # ~16GB RAM, instruct, good balance
            "meta-llama/Llama-3.1-8B-Instruct",        # ~16GB RAM, instruct, good balance
            "meta-llama/Meta-Llama-3-14B-Instruct",    # ~28GB RAM, instruct, high performance
            "meta-llama/Llama-3.2-3B-Instruct",        # ~6GB RAM, instruct, great for testing
            "meta-llama/Llama-3.2-1B",                 # ~2GB RAM, base, great for testing
            "meta-llama/Llama-3.3-70B-Instruct",       # ~140GB RAM, instruct, maximum performance
            
            # Google Gemma models - Top 6 most useful
            "google/gemma-2b-it",                       # ~4GB RAM, instruction tuned, great for testing
            "google/gemma-7b-it",                       # ~14GB RAM, instruction tuned, good balance
            "google/gemma-3n-E2B-it",                   # ~4GB RAM, latest Gemma 3, instruction tuned
            "google/gemma-3n-E4B-it",                   # ~8GB RAM, latest Gemma 3, instruction tuned
            "google/gemma-3-4b-it",                     # ~8GB RAM, latest Gemma 3, 4B variant
            "google/gemma-3-27b-it",                    # ~54GB RAM, large model for high performance
            
            # Mixtral models (high performance)
            "mistralai/Mixtral-8x7B-Instruct-v0.1",    # ~32GB RAM, GPU recommended
            
            # GPU-only models (for reference)
            "mistralai/CodeMistral-7B-Instruct-v0.1",  # ~14GB RAM, GPU recommended
        ]
    
    def create_model_statuses(model_names):
        """Helper function to create ModelStatus objects from model names"""
        # Get downloaded models from download service
        downloaded_models_list = download_service.get_downloaded_models()
        
        model_statuses = []
        for model_name in model_names:
            # Check if model is downloaded to disk
            is_downloaded = model_name in downloaded_models_list
            
            # Check if model is currently downloading
            is_downloading = model_name in download_service.active_downloads
            
            # Get download progress if downloading
            download_progress = None
            if is_downloading and model_name in download_service.download_status:
                download_progress = download_service.download_status[model_name]["progress"]
            elif is_downloaded:
                download_progress = 100.0
            
            model_statuses.append(ModelStatus(
                name=model_name,
                provider="huggingface",
                is_loaded=False,
                is_downloading=is_downloading,
                download_progress=download_progress,
                size_on_disk="2.5GB" if is_downloaded else None,
                last_used=None,
                load_time=None
            ))
        
        return model_statuses
    
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
            # Check if model is loaded in memory
            is_loaded = model_name in loaded_models
            
            # Check if model is downloaded to disk
            is_downloaded = model_name in download_service.get_downloaded_models()
            
            # Check if model is currently downloading
            is_downloading = model_name in download_service.active_downloads
            
            # Get download progress if downloading
            download_progress = None
            if is_downloading and model_name in download_service.download_status:
                download_progress = download_service.download_status[model_name]["progress"]
            elif is_downloaded:
                download_progress = 100.0
            
            model_statuses.append(ModelStatus(
                name=model_name,
                provider="huggingface",
                is_loaded=is_loaded,
                is_downloading=is_downloading,
                download_progress=download_progress,
                size_on_disk="2.5GB" if is_downloaded else None,
                last_used=None,
                load_time=None
            ))
        
        return model_statuses
        
    except ImportError as e:
        print(f"❌ Import error in get_available_models: {e}")
        # Return basic model statuses if model service can't be imported
        return create_model_statuses(get_fallback_models())
        
    except Exception as e:
        print(f"❌ Error in get_available_models: {e}")
        # Return basic model statuses on any other error
        return create_model_statuses(get_fallback_models())

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
            "mistralai/Mistral-7B-Instruct-v0.2",
            "meta-llama/Meta-Llama-3-8B-Instruct"
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

@router.post("/offload", response_model=dict)
async def offload_model(request: dict):
    """Offload a model from memory (unload it)"""
    try:
        model_name = request.get("model_name")
        if not model_name:
            raise HTTPException(status_code=400, detail="model_name is required")
        
        print(f"🔄 Offloading model: {model_name}")
        
        # Call model service to offload the model
        result = await model_service.offload_model(model_name)
        
        return {
            "status": "success",
            "message": f"Model {model_name} has been offloaded from memory",
            "model_name": model_name,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Error offloading model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete", response_model=dict)
async def delete_model(request: dict):
    """Delete a model from disk"""
    try:
        model_name = request.get("model_name")
        if not model_name:
            raise HTTPException(status_code=400, detail="model_name is required")
        
        print(f"🗑️ Deleting model from disk: {model_name}")
        
        # Call download service to delete the model
        result = download_service.delete_model(model_name)
        
        return {
            "status": "success",
            "message": f"Model {model_name} has been deleted from disk",
            "model_name": model_name,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Error deleting model: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 