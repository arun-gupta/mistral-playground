import time
import httpx
import asyncio
from typing import Dict, Any, Optional
from backend.app.core.config import settings
from backend.app.models.requests import PromptRequest
from backend.app.models.responses import ModelResponse

class HostedModelService:
    """Service for handling hosted model inference across different providers"""
    
    def __init__(self):
        self.openai_base_url = "https://api.openai.com/v1"
        self.anthropic_base_url = "https://api.anthropic.com/v1"
        self.google_base_url = "https://generativelanguage.googleapis.com/v1beta"
        
    async def generate_response(self, request: PromptRequest) -> ModelResponse:
        """Generate response using the specified hosted model provider"""
        start_time = time.time()
        print(f"🔧 HostedModelService.generate_response called with:")
        print(f"   Provider: {request.provider}")
        print(f"   Model: {request.model_name}")
        print(f"   Prompt: {request.prompt[:50]}...")
        
        try:
            if request.provider == "openai":
                response = await self._generate_openai(request)
            elif request.provider == "anthropic":
                response = await self._generate_anthropic(request)
            elif request.provider == "google":
                response = await self._generate_google(request)
            else:
                raise ValueError(f"Unsupported hosted provider: {request.provider}")
            
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
            print(f"❌ Hosted generation failed: {str(e)}")
            end_time = time.time()
            latency_ms = (end_time - start_time) * 1000
            
            return ModelResponse(
                text=f"Sorry, I encountered an error while generating a response: {str(e)}. Please check your API key and try again.",
                model_name=request.model_name or "error",
                provider=request.provider,
                tokens_used=0,
                input_tokens=0,
                output_tokens=0,
                latency_ms=latency_ms,
                finish_reason="error"
            )
    
    async def _generate_openai(self, request: PromptRequest) -> Dict[str, Any]:
        """Generate response using OpenAI API"""
        # Check for API key in request headers or use environment variable
        api_key = request.headers.get("X-OpenAI-API-Key") if hasattr(request, 'headers') else None
        if not api_key:
            api_key = settings.OPENAI_API_KEY
        if not api_key or api_key == "your_openai_api_key_here":
            raise Exception("OpenAI API key not configured. Please set OPENAI_API_KEY in your environment or provide it in the request.")
        
        model_name = request.model_name or "gpt-4o-mini"
        
        # Prepare messages
        messages = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        messages.append({"role": "user", "content": request.prompt})
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.openai_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model_name,
                    "messages": messages,
                    "temperature": request.temperature,
                    "max_tokens": request.max_tokens,
                    "top_p": request.top_p
                },
                timeout=60.0
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise Exception(f"OpenAI API error: {error_data.get('error', {}).get('message', 'Unknown error')}")
            
            data = response.json()
            choice = data["choices"][0]
            
            return {
                "text": choice["message"]["content"],
                "model_name": model_name,
                "tokens_used": data["usage"]["total_tokens"],
                "input_tokens": data["usage"]["prompt_tokens"],
                "output_tokens": data["usage"]["completion_tokens"],
                "finish_reason": choice["finish_reason"]
            }
    
    async def _generate_anthropic(self, request: PromptRequest) -> Dict[str, Any]:
        """Generate response using Anthropic API"""
        # Check for API key in request headers or use environment variable
        api_key = request.headers.get("X-Anthropic-API-Key") if hasattr(request, 'headers') else None
        if not api_key:
            api_key = settings.ANTHROPIC_API_KEY
        if not api_key or api_key == "your_anthropic_api_key_here":
            raise Exception("Anthropic API key not configured. Please set ANTHROPIC_API_KEY in your environment or provide it in the request.")
        
        model_name = request.model_name or "claude-3-5-haiku-20241022"
        
        # Prepare messages
        messages = [{"role": "user", "content": request.prompt}]
        if request.system_prompt:
            # Anthropic uses system parameter instead of system message
            system_prompt = request.system_prompt
        else:
            system_prompt = None
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.anthropic_base_url}/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model_name,
                    "messages": messages,
                    "system": system_prompt,
                    "temperature": request.temperature,
                    "max_tokens": request.max_tokens,
                    "top_p": request.top_p
                },
                timeout=60.0
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise Exception(f"Anthropic API error: {error_data.get('error', {}).get('message', 'Unknown error')}")
            
            data = response.json()
            content = data["content"][0]
            
            return {
                "text": content["text"],
                "model_name": model_name,
                "tokens_used": data["usage"]["input_tokens"] + data["usage"]["output_tokens"],
                "input_tokens": data["usage"]["input_tokens"],
                "output_tokens": data["usage"]["output_tokens"],
                "finish_reason": data.get("stop_reason", "stop")
            }
    
    async def _generate_google(self, request: PromptRequest) -> Dict[str, Any]:
        """Generate response using Google Gemini API"""
        # Check for API key in request headers or use environment variable
        api_key = request.headers.get("X-Google-API-Key") if hasattr(request, 'headers') else None
        if not api_key:
            api_key = settings.GOOGLE_API_KEY
        if not api_key or api_key == "your_google_api_key_here":
            raise Exception("Google API key not configured. Please set GOOGLE_API_KEY in your environment or provide it in the request.")
        
        model_name = request.model_name or "gemini-1.5-flash"
        
        # Prepare content
        contents = [{"parts": [{"text": request.prompt}]}]
        
        # Google Gemini parameters
        generation_config = {
            "temperature": request.temperature,
            "maxOutputTokens": request.max_tokens,
            "topP": request.top_p
        }
        
        # Add system instruction if provided
        if request.system_prompt:
            generation_config["systemInstruction"] = {"parts": [{"text": request.system_prompt}]}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.google_base_url}/models/{model_name}:generateContent",
                params={"key": api_key},
                json={
                    "contents": contents,
                    "generationConfig": generation_config
                },
                timeout=60.0
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise Exception(f"Google API error: {error_data.get('error', {}).get('message', 'Unknown error')}")
            
            data = response.json()
            candidate = data["candidates"][0]
            content = candidate["content"]["parts"][0]
            
            return {
                "text": content["text"],
                "model_name": model_name,
                "tokens_used": data["usageMetadata"]["totalTokenCount"],
                "input_tokens": data["usageMetadata"]["promptTokenCount"],
                "output_tokens": data["usageMetadata"]["candidatesTokenCount"],
                "finish_reason": candidate.get("finishReason", "stop")
            }
    
    def get_available_models(self) -> Dict[str, list]:
        """Get list of available hosted models by provider (Top 3 from each)"""
        return {
            "openai": [
                "gpt-4o-mini",      # Best value (fast, cheap)
                "gpt-3.5-turbo",    # Good balance (reliable, cost-effective)
                "gpt-4o"            # Best performance (latest and most capable)
            ],
            "anthropic": [
                "claude-3-5-haiku-20241022",  # Best value (fast, cheap)
                "claude-3-5-sonnet-20241022", # Good balance (reliable, good performance)
                "claude-3-opus-20240229"      # Best performance (most capable)
            ],
            "google": [
                "gemini-1.5-flash", # Best value (fast, cheap)
                "gemini-1.0-pro",   # Good balance (reliable, good performance)
                "gemini-1.5-pro"    # Best performance (most capable)
            ]
        }

# Global hosted model service instance
hosted_model_service = HostedModelService() 