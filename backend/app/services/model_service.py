import time
import uuid
from typing import Dict, Any, Optional, List
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
import httpx
import asyncio
import urllib.parse

from backend.app.core.config import settings
from backend.app.models.requests import PromptRequest, ModelProvider
from backend.app.models.responses import ModelResponse, ModelComparison
from backend.app.services.hosted_model_service import hosted_model_service

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
            # Check if this is a hosted provider
            if request.provider in [ModelProvider.OPENAI.value, ModelProvider.ANTHROPIC.value, ModelProvider.GOOGLE.value]:
                print(f"🌐 Using hosted model service for {request.provider}")
                return await hosted_model_service.generate_response(request)
            
            # Local model providers
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
            # Check if CUDA is available for vLLM
            cuda_available = torch.cuda.is_available()
            print(f"🔍 vLLM: CUDA available: {cuda_available}")
            
            if cuda_available:
                self.vllm_models[model_name] = LLM(
                    model=model_name,
                    trust_remote_code=True,
                    tensor_parallel_size=1
                )
            else:
                print(f"⚠️  vLLM requires CUDA but it's not available. Falling back to HuggingFace.")
                # Fallback to HuggingFace for CPU-only environments
                return await self._generate_huggingface(request)
        
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
                # Use HuggingFace token for authentication if available and valid
                token = settings.HUGGINGFACE_API_KEY if settings.HUGGINGFACE_API_KEY and settings.HUGGINGFACE_API_KEY != "your-huggingface-api-key-here" else None
                print(f"🔑 Token being used: {token[:10] if token else 'None'}...")
                print(f"🔑 Token length: {len(token) if token else 0}")
                print(f"🔑 Token valid format: {token.startswith('hf_') if token else False}")
                
                # Check if CUDA is available
                cuda_available = torch.cuda.is_available()
                print(f"🔍 CUDA available: {cuda_available}")
                
                # For large models like Mistral, use more memory-efficient settings
                if "mistral" in model_name.lower() or "7b" in model_name.lower():
                    print(f"🔧 Loading large model {model_name} with memory-efficient settings...")
                    
                    if cuda_available:
                        # GPU settings
                        self.transformers_models[model_name] = AutoModelForCausalLM.from_pretrained(
                            model_name,
                            torch_dtype=torch.float16,  # Use float16 for memory efficiency
                            device_map="auto",
                            trust_remote_code=True,
                            low_cpu_mem_usage=True,
                            token=token,
                            max_memory={0: "4GB"}  # Limit memory usage
                        )
                    else:
                        # CPU-only settings
                        print(f"🖥️  Using CPU-only settings for {model_name}")
                        self.transformers_models[model_name] = AutoModelForCausalLM.from_pretrained(
                            model_name,
                            torch_dtype=torch.float32,  # Use float32 for CPU
                            device_map="cpu",  # Force CPU
                            trust_remote_code=True,
                            low_cpu_mem_usage=True,
                            token=token
                        )
                else:
                    # Smaller models
                    if cuda_available:
                        self.transformers_models[model_name] = AutoModelForCausalLM.from_pretrained(
                            model_name,
                            torch_dtype=torch.float32,
                            device_map="auto",
                            trust_remote_code=True,
                            low_cpu_mem_usage=True,
                            token=token
                        )
                    else:
                        self.transformers_models[model_name] = AutoModelForCausalLM.from_pretrained(
                            model_name,
                            torch_dtype=torch.float32,
                            device_map="cpu",  # Force CPU
                            trust_remote_code=True,
                            low_cpu_mem_usage=True,
                            token=token
                        )
                # Load tokenizer with more robust error handling
                # Special handling for Mistral models that have tokenizer issues
                if "mistral" in model_name.lower():
                    print(f"🔧 Loading Mistral tokenizer with special settings...")
                    tokenizer_loaded = False
                    
                    # Try multiple tokenizer configurations
                    tokenizer_configs = [
                        {
                            "name": "Mistral with slow tokenizer",
                            "kwargs": {
                                "trust_remote_code": True,
                                "token": token,
                                "use_fast": False,
                                "padding_side": "left",
                                "model_max_length": 4096
                            }
                        },
                        {
                            "name": "Mistral with fast tokenizer",
                            "kwargs": {
                                "trust_remote_code": True,
                                "token": token,
                                "use_fast": True,
                                "padding_side": "left"
                            }
                        },
                        {
                            "name": "Mistral with minimal settings",
                            "kwargs": {
                                "trust_remote_code": True,
                                "token": token,
                                "use_fast": False
                            }
                        }
                    ]
                    
                    for config in tokenizer_configs:
                        if tokenizer_loaded:
                            break
                        try:
                            print(f"🔄 Trying {config['name']}...")
                            self.tokenizers[model_name] = AutoTokenizer.from_pretrained(
                                model_name,
                                **config["kwargs"]
                            )
                            print(f"✅ {config['name']} successful!")
                            tokenizer_loaded = True
                        except Exception as e:
                            print(f"⚠️  {config['name']} failed: {str(e)[:100]}...")
                    
                    # If all Mistral tokenizer attempts fail, use GPT2 tokenizer
                    if not tokenizer_loaded:
                        print(f"🔄 All Mistral tokenizer attempts failed, using GPT2 tokenizer...")
                        try:
                            self.tokenizers[model_name] = AutoTokenizer.from_pretrained(
                                "gpt2",
                                trust_remote_code=True,
                                token=token,
                                padding_side="left"
                            )
                            print("✅ GPT2 tokenizer loaded successfully")
                        except Exception as gpt2_error:
                            print(f"❌ GPT2 tokenizer also failed: {gpt2_error}")
                            # Final fallback to DialoGPT tokenizer
                            print(f"🔄 Using DialoGPT tokenizer as final fallback...")
                            self.tokenizers[model_name] = AutoTokenizer.from_pretrained(
                                "microsoft/DialoGPT-small",
                                trust_remote_code=True,
                                token=token
                            )
                else:
                    try:
                        self.tokenizers[model_name] = AutoTokenizer.from_pretrained(
                            model_name,
                            trust_remote_code=True,
                            token=token,
                            use_fast=False  # Use slow tokenizer for better compatibility
                        )
                    except Exception as tokenizer_error:
                        print(f"⚠️  Tokenizer loading failed: {tokenizer_error}")
                        print(f"🔄 Trying with different tokenizer settings...")
                        
                        # Try with different settings
                        try:
                            self.tokenizers[model_name] = AutoTokenizer.from_pretrained(
                                model_name,
                                trust_remote_code=True,
                                token=token,
                                use_fast=True,  # Try fast tokenizer
                                padding_side="left"  # Add padding side
                            )
                        except Exception as second_error:
                            print(f"❌ Second tokenizer attempt failed: {second_error}")
                            # Try with a known working tokenizer
                            print(f"🔄 Using fallback tokenizer for {model_name}")
                            self.tokenizers[model_name] = AutoTokenizer.from_pretrained(
                                "microsoft/DialoGPT-small",  # Known working tokenizer
                                trust_remote_code=True,
                                token=token
                            )
                
                # Ensure tokenizer is on the same device as the model
                if not cuda_available:
                    print(f"🖥️  Ensuring tokenizer is on CPU for {model_name}")
                    # Tokenizers don't need device specification, but ensure no CUDA references
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
                    # Use HuggingFace token for authentication if available and valid
                    token = settings.HUGGINGFACE_API_KEY if settings.HUGGINGFACE_API_KEY and settings.HUGGINGFACE_API_KEY != "your-huggingface-api-key-here" else None
                    
                    # Use CPU-aware settings for fallback model too
                    if cuda_available:
                        self.transformers_models[fallback_model] = AutoModelForCausalLM.from_pretrained(
                            fallback_model,
                            torch_dtype=torch.float32,
                            device_map="auto",
                            trust_remote_code=True,
                            low_cpu_mem_usage=True,
                            token=token
                        )
                    else:
                        self.transformers_models[fallback_model] = AutoModelForCausalLM.from_pretrained(
                            fallback_model,
                            torch_dtype=torch.float32,
                            device_map="cpu",  # Force CPU
                            trust_remote_code=True,
                            low_cpu_mem_usage=True,
                            token=token
                        )
                    # Load fallback tokenizer with robust error handling
                    try:
                        self.tokenizers[fallback_model] = AutoTokenizer.from_pretrained(
                            fallback_model,
                            trust_remote_code=True,
                            token=token,
                            use_fast=False  # Use slow tokenizer for better compatibility
                        )
                    except Exception as tokenizer_error:
                        print(f"⚠️  Fallback tokenizer loading failed: {tokenizer_error}")
                        print(f"🔄 Using known working tokenizer...")
                        self.tokenizers[fallback_model] = AutoTokenizer.from_pretrained(
                            "microsoft/DialoGPT-small",
                            trust_remote_code=True,
                            token=token
                        )
                    
                    # Ensure fallback tokenizer is also CPU-aware
                    if not cuda_available:
                        print(f"🖥️  Ensuring fallback tokenizer is on CPU for {fallback_model}")
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
        inputs = tokenizer(full_prompt, return_tensors="pt")
        
        # Ensure inputs are on the correct device
        if cuda_available:
            inputs = inputs.to(model.device)
        else:
            # For CPU, ensure inputs stay on CPU
            print(f"🖥️  Keeping inputs on CPU for {model_name}")
        
        input_tokens = inputs.input_ids.shape[1]
        
        # Generate with timeout handling for CPU generation
        try:
            import signal
            
            def timeout_handler(signum, frame):
                raise TimeoutError("Generation timed out")
            
            # Set timeout for CPU generation (5 minutes for large models)
            timeout_seconds = 300 if "mistral" in model_name.lower() or "7b" in model_name.lower() else 60
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(timeout_seconds)
            
            with torch.no_grad():
                # Use conservative token limits for CPU generation to avoid timeouts
                if cuda_available:
                    max_tokens = min(request.max_tokens, 512)  # Full limit for GPU
                else:
                    # Conservative limits for CPU to avoid timeouts
                    if "mistral" in model_name.lower() or "7b" in model_name.lower():
                        max_tokens = min(request.max_tokens, 50)  # Very conservative for large models on CPU
                    else:
                        max_tokens = min(request.max_tokens, 100)  # Conservative for smaller models on CPU
                
                print(f"🚀 Generating with max_new_tokens={max_tokens}, temperature={request.temperature}")
                print(f"⏱️  Timeout set to {timeout_seconds} seconds for CPU generation...")
                print(f"🔄 Generation in progress... (this may take a while on CPU)")
                
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=max_tokens,
                    temperature=request.temperature,
                    top_p=request.top_p,
                    do_sample=True,
                    pad_token_id=tokenizer.eos_token_id,
                    eos_token_id=tokenizer.eos_token_id,
                    repetition_penalty=1.1
                )
                
                # Cancel timeout
                signal.alarm(0)
                
        except TimeoutError:
            print(f"⏰ Generation timed out after {timeout_seconds} seconds")
            # Return a timeout message
            return {
                "text": f"⏰ Generation timed out after {timeout_seconds} seconds. This model is quite large and may take a while on CPU. Consider using a smaller model like 'microsoft/DialoGPT-small' for faster responses.",
                "model_name": model_name,
                "tokens_used": 0,
                "input_tokens": input_tokens,
                "output_tokens": 0,
                "finish_reason": "timeout"
            }
        except Exception as gen_error:
            print(f"❌ Generation error: {gen_error}")
            # Try with more conservative settings
            print(f"🔄 Retrying with conservative settings...")
            try:
                with torch.no_grad():
                    outputs = model.generate(
                        **inputs,
                        max_new_tokens=50,  # Very conservative
                        temperature=0.7,
                        top_p=0.9,
                        do_sample=True,
                        pad_token_id=tokenizer.eos_token_id,
                        eos_token_id=tokenizer.eos_token_id,
                        repetition_penalty=1.0
                    )
            except Exception as retry_error:
                print(f"❌ Retry also failed: {retry_error}")
                return {
                    "text": f"❌ Generation failed: {str(retry_error)}. This model may be too large for CPU generation. Try a smaller model.",
                    "model_name": model_name,
                    "tokens_used": 0,
                    "input_tokens": input_tokens,
                    "output_tokens": 0,
                    "finish_reason": "error"
                }
        
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
                
                # Check if this is a gated model
                gated_models = [
                    # Official Meta Llama models (require authentication) - Top 3 most useful
                    "meta-llama/Llama-3.2-1B",
                    "meta-llama/Meta-Llama-3-8B-Instruct",
                    "meta-llama/Llama-3.3-70B-Instruct",
                    # Google Gemma models (all require authentication) - Top 3 most useful
                    "google/gemma-2b-it",
                    "google/gemma-7b-it",
                    "google/gemma-3-27b-it",
                    # Mistral models that are now gated (including base models) - Keep all as requested
                    "mistralai/Mistral-7B-v0.1",
                    "mistralai/Mistral-7B-v0.2",
                    "mistralai/Mistral-7B-Instruct-v0.1",
                    "mistralai/Mistral-7B-Instruct-v0.2",
                    "mistralai/Mistral-7B-Instruct-v0.3",
                    "mistralai/Mistral-7B-Instruct-v0.4",
                    "mistralai/Mistral-7B-Instruct-v0.5"
                ]
                
                if model_name in gated_models:
                    error_msg = f"""
❌ Gated Model Access Required

The model '{model_name}' requires authentication to download from Hugging Face.

To access this model:
1. Visit: https://huggingface.co/{model_name}
2. Click "Access Request" and accept the license terms
3. Wait for approval (usually instant for Llama 3)
4. Set up your Hugging Face token in the environment

Alternative models that don't require authentication:
• mistralai/Mistral-7B-Instruct-v0.2 (Recommended)
• microsoft/DialoGPT-small (For testing)
• google/gemma-2b-it (Google's open model)
"""
                    print(error_msg)
                    raise Exception(f"Gated model access required. Visit https://huggingface.co/{model_name} to request access.")
                
                # Load GGUF model with ctransformers
                # Use HuggingFace token for authentication if available and valid
                token = settings.HUGGINGFACE_API_KEY if settings.HUGGINGFACE_API_KEY and settings.HUGGINGFACE_API_KEY != "your-huggingface-api-key-here" else None
                self.ct_models[model_name] = CTModelForCausalLM.from_pretrained(
                    model_name,
                    model_type="mistral",  # or "llama" depending on the model
                    gpu_layers=0,  # CPU only for now
                    token=token,
                    # Don't specify lib on Apple Silicon - let it auto-detect
                )
                print(f"✅ GGUF model downloaded and loaded successfully: {model_name}")
            else:
                print(f"⚡ Using cached GGUF model: {model_name} (already loaded)")
        except Exception as e:
            print(f"❌ Failed to load GGUF model {model_name}: {e}")
            
            # Check if it's a gated model error
            if "401" in str(e) or "gated" in str(e).lower():
                print(f"🔒 This is a gated model that requires authentication.")
                print(f"💡 Try using an open model like 'mistralai/Mistral-7B-Instruct-v0.2' instead.")
                print(f"💡 Or use 'microsoft/DialoGPT-small' for testing.")
                print(f"💡 For Llama models, try 'meta-llama/Meta-Llama-3-8B-Instruct' (requires authentication).")
                raise Exception(f"Gated model access required for {model_name}. Use an open model instead.")
            
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
            # Determine the correct provider based on model name
            provider = self._determine_provider(model_name)
            
            request = PromptRequest(
                prompt=prompt,
                system_prompt=parameters.get("system_prompt"),
                temperature=parameters.get("temperature", 0.7),
                max_tokens=parameters.get("max_tokens", 1024),
                top_p=parameters.get("top_p", 0.9),
                model_name=model_name,
                provider=provider
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
    
    async def offload_model(self, model_name: str) -> bool:
        """Offload a model from memory (unload it)"""
        print(f"🔄 Offloading model from memory: {model_name}")
        
        try:
            # Remove from vLLM models
            if model_name in self.vllm_models:
                print(f"   Removing vLLM model: {model_name}")
                del self.vllm_models[model_name]
            
            # Remove from transformers models
            if model_name in self.transformers_models:
                print(f"   Removing transformers model: {model_name}")
                del self.transformers_models[model_name]
            
            # Remove from tokenizers
            if model_name in self.tokenizers:
                print(f"   Removing tokenizer: {model_name}")
                del self.tokenizers[model_name]
            
            # Remove from ctransformers models
            if model_name in self.ct_models:
                print(f"   Removing ctransformers model: {model_name}")
                del self.ct_models[model_name]
            
            # Force garbage collection to free memory
            import gc
            gc.collect()
            
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                print(f"   Cleared CUDA cache")
            
            print(f"✅ Successfully offloaded model: {model_name}")
            return True
            
        except Exception as e:
            print(f"❌ Error offloading model {model_name}: {e}")
            return False
    
    def _determine_provider(self, model_name: str) -> str:
        """Determine the provider for a given model name"""
        # Hosted models
        if model_name.startswith('gpt-'):
            return ModelProvider.OPENAI.value
        elif model_name.startswith('claude-'):
            return ModelProvider.ANTHROPIC.value
        elif model_name.startswith('gemini-'):
            return ModelProvider.GOOGLE.value
        
        # Local models - default to VLLM for most models
        return ModelProvider.VLLM.value

    def get_available_models(self) -> List[str]:
        """Get list of available models (Top 3 from each family)"""
        return [
            # Microsoft DialoGPT models (Top 3) - No authentication required
            "microsoft/DialoGPT-small",      # 117M parameters, ~500MB RAM - Best for testing
            "microsoft/DialoGPT-medium",     # 345M parameters, ~1.5GB RAM - Good balance
            "microsoft/DialoGPT-large",      # 774M parameters, ~3GB RAM - Best performance
            
            # Mistral AI models (Top 6) - Require authentication
            "mistralai/Mistral-7B-Instruct-v0.2",      # ~14GB RAM, instruction tuned, great balance
            "mistralai/Mistral-7B-Instruct-v0.3",      # ~14GB RAM, latest instruction tuned
            "mistralai/Mistral-7B-v0.1",               # ~14GB RAM, base model
            "mistralai/Mistral-7B-v0.3",               # ~14GB RAM, latest base model
            "mistralai/Mixtral-8x7B-Instruct-v0.1",    # ~32GB RAM, high performance, best capability
            "mistralai/Mixtral-8x7B-Instruct-v0.1-GGUF", # ~32GB RAM, CPU optimized version
            
            # Google Gemma models (Top 3) - Require authentication
            "google/gemma-2b-it",                       # ~4GB RAM, instruction tuned, great for testing
            "google/gemma-7b-it",                       # ~14GB RAM, instruction tuned, good balance
            "google/gemma-3-27b-it",                    # ~54GB RAM, large model for high performance
            
            # Meta Llama models (Top 3) - Require authentication
            "meta-llama/Llama-3.2-1B",                 # ~2GB RAM, base, great for testing
            "meta-llama/Meta-Llama-3-8B-Instruct",     # ~16GB RAM, instruct, good balance
            "meta-llama/Llama-3.3-70B-Instruct",       # ~140GB RAM, instruct, maximum performance
        ]

# Global model service instance
model_service = ModelService() 