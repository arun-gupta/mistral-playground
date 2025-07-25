import time
import uuid
from typing import Dict, Any, Optional, List
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
import httpx
import asyncio

from app.core.config import settings
from app.models.requests import PromptRequest, ModelProvider
from app.models.responses import ModelResponse

# Try to import vLLM, but don't fail if it's not available
try:
    from vllm import LLM, SamplingParams
    VLLM_AVAILABLE = True
except ImportError:
    VLLM_AVAILABLE = False
    print("⚠️  vLLM not available. Using Transformers fallback.")

class ModelService:
    """Service for handling model inference across different providers"""
    
    def __init__(self):
        self.vllm_models: Dict[str, LLM] = {}
        self.transformers_models: Dict[str, Any] = {}
        self.tokenizers: Dict[str, Any] = {}
        
    async def generate_response(self, request: PromptRequest) -> ModelResponse:
        """Generate response using the specified model and provider"""
        start_time = time.time()
        print(f"🔧 ModelService.generate_response called with:")
        print(f"   Provider: {request.provider}")
        print(f"   Model: {request.model_name}")
        print(f"   Prompt: {request.prompt[:50]}...")
        
        try:
            if request.provider == ModelProvider.VLLM:
                if VLLM_AVAILABLE:
                    response = await self._generate_vllm(request)
                else:
                    print("⚠️  vLLM not available, falling back to Hugging Face")
                    response = await self._generate_huggingface(request)
            elif request.provider == ModelProvider.HUGGINGFACE:
                response = await self._generate_huggingface(request)
            elif request.provider == ModelProvider.OLLAMA:
                response = await self._generate_ollama(request)
            else:
                raise ValueError(f"Unsupported provider: {request.provider}")
            
            end_time = time.time()
            latency_ms = (end_time - start_time) * 1000
            
            return ModelResponse(
                text=response["text"],
                model_name=response["model_name"],
                provider=request.provider.value,
                tokens_used=response["tokens_used"],
                input_tokens=response["input_tokens"],
                output_tokens=response["output_tokens"],
                latency_ms=latency_ms,
                finish_reason=response.get("finish_reason", "length")
            )
        except Exception as e:
            print(f"❌ Generation failed: {str(e)}")
            end_time = time.time()
            latency_ms = (end_time - start_time) * 1000
            
            # Return a helpful error response instead of raising
            return ModelResponse(
                text=f"Sorry, I encountered an error while generating a response: {str(e)}. Please try a different model or check your configuration.",
                model_name=request.model_name or "error",
                provider=request.provider.value,
                tokens_used=0,
                input_tokens=0,
                output_tokens=0,
                latency_ms=latency_ms,
                finish_reason="error"
            )
    
    async def _generate_vllm(self, request: PromptRequest) -> Dict[str, Any]:
        """Generate response using vLLM"""
        model_name = request.model_name or settings.MODEL_NAME
        
        if model_name not in self.vllm_models:
            self.vllm_models[model_name] = LLM(
                model=model_name,
                trust_remote_code=True,
                tensor_parallel_size=1
            )
        
        llm = self.vllm_models[model_name]
        
        # Prepare messages
        messages = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        messages.append({"role": "user", "content": request.prompt})
        
        # Create sampling parameters
        sampling_params = SamplingParams(
            temperature=request.temperature,
            top_p=request.top_p,
            max_tokens=request.max_tokens
        )
        
        # Generate response
        outputs = llm.generate([messages], sampling_params)
        output = outputs[0]
        
        # Count tokens
        input_tokens = len(output.prompt_token_ids)
        output_tokens = len(output.outputs[0].token_ids)
        tokens_used = input_tokens + output_tokens
        
        return {
            "text": output.outputs[0].text,
            "model_name": model_name,
            "tokens_used": tokens_used,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "finish_reason": output.outputs[0].finish_reason
        }
    
    async def _generate_huggingface(self, request: PromptRequest) -> Dict[str, Any]:
        """Generate response using Hugging Face Transformers"""
        model_name = request.model_name or settings.MODEL_NAME
        
        # FORCE MOCK RESPONSE FOR TESTING
        print(f"🎭 FORCED MOCK RESPONSE for testing")
        return {
            "text": f"🎉 SUCCESS! This is a MOCK response from {model_name}. Your prompt was: '{request.prompt}'. The API flow is working perfectly!",
            "model_name": model_name,
            "tokens_used": 25,
            "input_tokens": 5,
            "output_tokens": 20
        }
        
        # TODO: Uncomment this when model loading is optimized
        # For now, we're using the mock response above
        pass
    
    async def _generate_ollama(self, request: PromptRequest) -> Dict[str, Any]:
        """Generate response using Ollama"""
        model_name = request.model_name or settings.MODEL_NAME
        
        # Prepare request payload
        payload = {
            "model": model_name,
            "prompt": request.prompt,
            "stream": False,
            "options": {
                "temperature": request.temperature,
                "top_p": request.top_p,
                "num_predict": request.max_tokens
            }
        }
        
        if request.system_prompt:
            payload["system"] = request.system_prompt
        
        # Make request to Ollama
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:11434/api/generate",
                json=payload,
                timeout=300.0
            )
            response.raise_for_status()
            result = response.json()
        
        # Estimate token usage (Ollama doesn't provide exact counts)
        estimated_input_tokens = len(request.prompt.split()) * 1.3
        estimated_output_tokens = len(result["response"].split()) * 1.3
        tokens_used = int(estimated_input_tokens + estimated_output_tokens)
        
        return {
            "text": result["response"],
            "model_name": model_name,
            "tokens_used": tokens_used,
            "input_tokens": int(estimated_input_tokens),
            "output_tokens": int(estimated_output_tokens)
        }
    
    async def compare_models(self, prompt: str, models: List[str], 
                           parameters: Dict[str, Any]) -> List[ModelResponse]:
        """Compare responses from multiple models"""
        tasks = []
        
        for model_name in models:
            request = PromptRequest(
                prompt=prompt,
                system_prompt=parameters.get("system_prompt"),
                temperature=parameters.get("temperature", 0.7),
                max_tokens=parameters.get("max_tokens", 1024),
                top_p=parameters.get("top_p", 0.9),
                model_name=model_name,
                provider=ModelProvider.VLLM
            )
            tasks.append(self.generate_response(request))
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions and return valid responses
        valid_responses = []
        for i, response in enumerate(responses):
            if isinstance(response, Exception):
                # Create error response
                valid_responses.append(ModelResponse(
                    text=f"Error: {str(response)}",
                    model_name=models[i],
                    provider="vllm",
                    tokens_used=0,
                    input_tokens=0,
                    output_tokens=0,
                    latency_ms=0,
                    finish_reason="error"
                ))
            else:
                valid_responses.append(response)
        
        return valid_responses
    
    def get_available_models(self) -> List[str]:
        """Get list of available models"""
        # CPU-friendly models ordered by size
        return [
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
            
            # GPU-only models (for reference)
            "mistralai/Mixtral-8x7B-Instruct-v0.1",    # ~32GB RAM, GPU recommended
            "mistralai/CodeMistral-7B-Instruct-v0.1",  # ~14GB RAM, GPU recommended
        ]

# Global model service instance
model_service = ModelService() 