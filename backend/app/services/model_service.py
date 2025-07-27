import time
import uuid
from typing import Dict, Any, Optional, List
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
import httpx
import asyncio

from backend.app.core.config import settings
from backend.app.models.requests import PromptRequest, ModelProvider
from backend.app.models.responses import ModelResponse, ModelComparison

# Try to import vLLM, but don't fail if it's not available
try:
    from vllm import LLM, SamplingParams
    VLLM_AVAILABLE = True
except ImportError:
    VLLM_AVAILABLE = False
    print("⚠️  vLLM not available. Using Transformers fallback.")

# Try to import ctransformers for GGUF support
try:
    from ctransformers import AutoModelForCausalLM as CTModelForCausalLM
    CTTRANSFORMERS_AVAILABLE = True
    print("✅ ctransformers available for GGUF model support")
except ImportError:
    CTTRANSFORMERS_AVAILABLE = False
    print("⚠️  ctransformers not available. GGUF models will not work.")

class ModelService:
    """Service for handling model inference across different providers"""
    
    def __init__(self):
        self.vllm_models: Dict[str, LLM] = {}
        self.transformers_models: Dict[str, Any] = {}
        self.tokenizers: Dict[str, Any] = {}
        self.ct_models: Dict[str, Any] = {}  # ctransformers models for GGUF
        
    async def generate_response(self, request: PromptRequest) -> ModelResponse:
        """Generate response using the specified model and provider"""
        start_time = time.time()
        print(f"🔧 ModelService.generate_response called with:")
        print(f"   Provider: {request.provider}")
        print(f"   Model: {request.model_name}")
        print(f"   Prompt: {request.prompt[:50]}...")
        
        try:
            if request.provider == ModelProvider.VLLM.value:
                if VLLM_AVAILABLE:
                    response = await self._generate_vllm(request)
                else:
                    print("⚠️  vLLM not available, falling back to Hugging Face")
                    response = await self._generate_huggingface(request)
            elif request.provider == ModelProvider.HUGGINGFACE.value:
                response = await self._generate_huggingface(request)
            elif request.provider == ModelProvider.OLLAMA.value:
                response = await self._generate_ollama(request)
            else:
                raise ValueError(f"Unsupported provider: {request.provider}")
            
            end_time = time.time()
            latency_ms = (end_time - start_time) * 1000
            
            return ModelResponse(
                text=response["text"],
                model_name=response["model_name"],
                provider=request.provider,
                tokens_used=response.get("tokens_used", 0),
                input_tokens=response.get("input_tokens", 0),
                output_tokens=response.get("output_tokens", 0),
                latency_ms=latency_ms,
                finish_reason=response.get("finish_reason", "stop")
            )
        except Exception as e:
            print(f"❌ Generation failed: {str(e)}")
            end_time = time.time()
            latency_ms = (end_time - start_time) * 1000
            
            # Return a helpful error response instead of raising
            return ModelResponse(
                text=f"Sorry, I encountered an error while generating a response: {str(e)}. Please try a different model or check your configuration.",
                model_name=request.model_name or "error",
                provider=request.provider,
                tokens_used=0,
                input_tokens=0,
                output_tokens=0,
                latency_ms=latency_ms,
                finish_reason="error"
            )
    
    async def _generate_vllm(self, request: PromptRequest) -> Dict[str, Any]:
        """Generate response using vLLM"""
        model_name = request.model_name or settings.MODEL_NAME
        
        # Check if mock mode is enabled
        if settings.MOCK_MODE:
            print(f"🎭 MOCK MODE: Returning mock response for {model_name}")
            return {
                "text": f"🎭 MOCK RESPONSE from {model_name} (vLLM)\n\nYour prompt: '{request.prompt}'\n\nThis is a mock response for testing. Set MOCK_MODE=false in your .env file to use real models.\n\nParameters used:\n- Temperature: {request.temperature}\n- Max tokens: {request.max_tokens}\n- Top P: {request.top_p}\n- System prompt: {request.system_prompt or 'None'}",
                "model_name": model_name,
                "tokens_used": 50,
                "input_tokens": 10,
                "output_tokens": 40,
                "finish_reason": "stop"
            }
        
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
    
    def _is_gguf_model(self, model_name: str) -> bool:
        """Check if a model is a GGUF model"""
        gguf_indicators = ['gguf', 'GGUF', 'TheBloke']
        return any(indicator in model_name for indicator in gguf_indicators)
    
    async def _generate_huggingface(self, request: PromptRequest) -> Dict[str, Any]:
        """Generate response using Hugging Face Transformers"""
        model_name = request.model_name or settings.MODEL_NAME
        
        # Check if mock mode is enabled
        if settings.MOCK_MODE:
            print(f"🎭 MOCK MODE: Returning mock response for {model_name}")
            return {
                "text": f"🎭 MOCK RESPONSE from {model_name}\n\nYour prompt: '{request.prompt}'\n\nThis is a mock response for testing. Set MOCK_MODE=false in your .env file to use real models.\n\nParameters used:\n- Temperature: {request.temperature}\n- Max tokens: {request.max_tokens}\n- Top P: {request.top_p}\n- System prompt: {request.system_prompt or 'None'}",
                "model_name": model_name,
                "tokens_used": 50,
                "input_tokens": 10,
                "output_tokens": 40,
                "finish_reason": "stop"
            }
        
        # Check if this is a GGUF model
        if self._is_gguf_model(model_name):
            if CTTRANSFORMERS_AVAILABLE:
                return await self._generate_gguf(request)
            else:
                print(f"❌ GGUF model {model_name} requires ctransformers but it's not available")
                # Fallback to a smaller model
                fallback_model = "microsoft/DialoGPT-small"
                print(f"🔄 Trying fallback model: {fallback_model}")
                request.model_name = fallback_model
                return await self._generate_huggingface(request)
        
        try:
            if model_name not in self.transformers_models:
                print(f"🔄 DOWNLOADING & LOADING model: {model_name} (first time)")
                print(f"   This may take several minutes for large models...")
                self.transformers_models[model_name] = AutoModelForCausalLM.from_pretrained(
                    model_name,
                    torch_dtype=torch.float16,
                    device_map="auto",
                    trust_remote_code=True,
                    low_cpu_mem_usage=True
                )
                self.tokenizers[model_name] = AutoTokenizer.from_pretrained(
                    model_name,
                    trust_remote_code=True
                )
                print(f"✅ Model downloaded and loaded successfully: {model_name}")
            else:
                print(f"⚡ Using cached model: {model_name} (already loaded)")
        except Exception as e:
            print(f"❌ Failed to load model {model_name}: {e}")
            # Fallback to a smaller model
            fallback_model = "microsoft/DialoGPT-small"
            print(f"🔄 Trying fallback model: {fallback_model}")
            original_model = model_name
            
            try:
                if fallback_model not in self.transformers_models:
                    print(f"🔄 DOWNLOADING & LOADING fallback model: {fallback_model}")
                    self.transformers_models[fallback_model] = AutoModelForCausalLM.from_pretrained(
                        fallback_model,
                        torch_dtype=torch.float16,
                        device_map="auto",
                        trust_remote_code=True,
                        low_cpu_mem_usage=True
                    )
                    self.tokenizers[fallback_model] = AutoTokenizer.from_pretrained(
                        fallback_model,
                        trust_remote_code=True
                    )
                    print(f"✅ Fallback model downloaded and loaded: {fallback_model}")
                else:
                    print(f"⚡ Using cached fallback model: {fallback_model}")
                model_name = fallback_model
            except Exception as fallback_error:
                print(f"❌ Fallback model also failed: {fallback_error}")
                raise Exception(f"Failed to load any model. Original error: {e}, Fallback error: {fallback_error}")
        
        model = self.transformers_models[model_name]
        tokenizer = self.tokenizers[model_name]
        
        print(f"🚀 Generating response with {model_name}...")
        
        # Prepare input
        if request.system_prompt:
            full_prompt = f"{request.system_prompt}\n\n{request.prompt}"
        else:
            full_prompt = request.prompt
        
        # Tokenize
        inputs = tokenizer(full_prompt, return_tensors="pt").to(model.device)
        input_tokens = inputs.input_ids.shape[1]
        
        # Generate
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=min(request.max_tokens, 100),  # Limit to 100 tokens for DialoGPT
                temperature=request.temperature,
                top_p=request.top_p,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id,
                repetition_penalty=1.1
            )
        
        # Decode
        generated_text = tokenizer.decode(outputs[0][input_tokens:], skip_special_tokens=True)
        output_tokens = len(outputs[0]) - input_tokens
        tokens_used = len(outputs[0])
        
        print(f"✅ Response generated successfully: {output_tokens} tokens")
        
        return {
            "text": generated_text,
            "model_name": model_name,
            "tokens_used": tokens_used,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "finish_reason": "stop",
            "fallback_used": "original_model" in locals(),
            "original_model": locals().get("original_model")
        }
    
    async def _generate_gguf(self, request: PromptRequest) -> Dict[str, Any]:
        """Generate response using GGUF models via ctransformers"""
        model_name = request.model_name or settings.MODEL_NAME
        
        try:
            if model_name not in self.ct_models:
                print(f"🔄 DOWNLOADING & LOADING GGUF model: {model_name} (first time)")
                print(f"   This may take several minutes for large GGUF models...")
                
                # Load GGUF model with ctransformers
                self.ct_models[model_name] = CTModelForCausalLM.from_pretrained(
                    model_name,
                    model_type="mistral",  # or "llama" depending on the model
                    gpu_layers=0,  # CPU only for now
                    # Don't specify lib on Apple Silicon - let it auto-detect
                )
                print(f"✅ GGUF model downloaded and loaded successfully: {model_name}")
            else:
                print(f"⚡ Using cached GGUF model: {model_name} (already loaded)")
        except Exception as e:
            print(f"❌ Failed to load GGUF model {model_name}: {e}")
            # Fallback to a smaller model
            fallback_model = "microsoft/DialoGPT-small"
            print(f"🔄 Trying fallback model: {fallback_model}")
            original_model = request.model_name
            request.model_name = fallback_model
            response = await self._generate_huggingface(request)
            response["fallback_used"] = True
            response["original_model"] = original_model
            return response
        
        model = self.ct_models[model_name]
        
        print(f"🚀 Generating response with GGUF model: {model_name}...")
        
        # Prepare input
        if request.system_prompt:
            full_prompt = f"{request.system_prompt}\n\n{request.prompt}"
        else:
            full_prompt = request.prompt
        
        # Generate with GGUF model
        generated_text = model(
            full_prompt,
            max_new_tokens=min(request.max_tokens, 200),  # GGUF models can handle more tokens
            temperature=request.temperature,
            top_p=request.top_p,
            repetition_penalty=1.1
        )
        
        # Estimate token usage (GGUF doesn't provide exact counts)
        input_tokens = len(full_prompt.split())  # Rough estimate
        output_tokens = len(generated_text.split()) - input_tokens
        tokens_used = input_tokens + output_tokens
        
        print(f"✅ GGUF response generated successfully: {output_tokens} tokens")
        
        return {
            "text": generated_text,
            "model_name": model_name,
            "tokens_used": tokens_used,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "finish_reason": "stop"
        }
    
    async def _generate_ollama(self, request: PromptRequest) -> Dict[str, Any]:
        """Generate response using Ollama"""
        model_name = request.model_name or settings.MODEL_NAME
        
        # Check if mock mode is enabled
        if settings.MOCK_MODE:
            print(f"🎭 MOCK MODE: Returning mock response for {model_name}")
            return {
                "text": f"🎭 MOCK RESPONSE from {model_name} (Ollama)\n\nYour prompt: '{request.prompt}'\n\nThis is a mock response for testing. Set MOCK_MODE=false in your .env file to use real models.\n\nParameters used:\n- Temperature: {request.temperature}\n- Max tokens: {request.max_tokens}\n- Top P: {request.top_p}\n- System prompt: {request.system_prompt or 'None'}",
                "model_name": model_name,
                "tokens_used": 50,
                "input_tokens": 10,
                "output_tokens": 40,
                "finish_reason": "stop"
            }
        
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
            "output_tokens": int(estimated_output_tokens),
            "finish_reason": "stop"
        }
    
    async def compare_models(self, prompt: str, models: List[str], 
                           parameters: Dict[str, Any]) -> List[ModelComparison]:
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
                provider=ModelProvider.VLLM.value
            )
            tasks.append(self.generate_response(request))
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions and convert to ModelComparison objects
        valid_responses = []
        for i, response in enumerate(responses):
            if isinstance(response, Exception):
                # Create error response as ModelComparison
                valid_responses.append(ModelComparison(
                    model_name=models[i],
                    provider="vllm",
                    text=f"Error: {str(response)}",
                    parameters=parameters,
                    usage={"total_tokens": 0, "input_tokens": 0, "output_tokens": 0},
                    latency=0.0
                ))
            else:
                # Convert ModelResponse to ModelComparison
                valid_responses.append(ModelComparison(
                    model_name=response.model_name,
                    provider=response.provider,
                    text=response.text,
                    parameters=parameters,
                    usage={
                        "total_tokens": response.tokens_used,
                        "input_tokens": response.input_tokens,
                        "output_tokens": response.output_tokens
                    },
                    latency=response.latency_ms / 1000.0  # Convert milliseconds to seconds
                ))
        
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

# Global model service instance
model_service = ModelService() 