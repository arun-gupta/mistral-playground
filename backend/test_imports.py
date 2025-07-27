#!/usr/bin/env python3
"""
Test script to check what imports are failing in the model service
"""

def test_imports():
    print("🔍 Testing model service imports...")
    
    # Test basic imports
    try:
        import time
        import uuid
        from typing import Dict, Any, Optional, List
        print("✅ Basic imports: OK")
    except Exception as e:
        print(f"❌ Basic imports failed: {e}")
        return False
    
    # Test torch
    try:
        import torch
        print(f"✅ PyTorch: OK (version: {torch.__version__})")
    except Exception as e:
        print(f"❌ PyTorch failed: {e}")
    
    # Test transformers
    try:
        from transformers import AutoTokenizer, AutoModelForCausalLM
        print("✅ Transformers: OK")
    except Exception as e:
        print(f"❌ Transformers failed: {e}")
    
    # Test httpx
    try:
        import httpx
        print("✅ httpx: OK")
    except Exception as e:
        print(f"❌ httpx failed: {e}")
    
    # Test asyncio
    try:
        import asyncio
        print("✅ asyncio: OK")
    except Exception as e:
        print(f"❌ asyncio failed: {e}")
    
    # Test app imports
    try:
        from app.core.config import settings
        print("✅ app.core.config: OK")
    except Exception as e:
        print(f"❌ app.core.config failed: {e}")
    
    try:
        from app.models.requests import PromptRequest, ModelProvider
        print("✅ app.models.requests: OK")
    except Exception as e:
        print(f"❌ app.models.requests failed: {e}")
    
    try:
        from app.models.responses import ModelResponse, ModelComparison
        print("✅ app.models.responses: OK")
    except Exception as e:
        print(f"❌ app.models.responses failed: {e}")
    
    # Test vLLM
    try:
        from vllm import LLM, SamplingParams
        print("✅ vLLM: OK")
    except ImportError:
        print("⚠️  vLLM not available (expected)")
    except Exception as e:
        print(f"❌ vLLM failed: {e}")
    
    # Test ctransformers
    try:
        from ctransformers import AutoModelForCausalLM as CTModelForCausalLM
        print("✅ ctransformers: OK")
    except ImportError:
        print("⚠️  ctransformers not available (expected)")
    except Exception as e:
        print(f"❌ ctransformers failed: {e}")
    
    # Test model service import
    try:
        from app.services.model_service import model_service
        print("✅ model_service import: OK")
        
        # Test get_available_models
        try:
            models = model_service.get_available_models()
            print(f"✅ get_available_models: OK ({len(models)} models)")
            print(f"   First 5 models: {models[:5]}")
        except Exception as e:
            print(f"❌ get_available_models failed: {e}")
            
    except Exception as e:
        print(f"❌ model_service import failed: {e}")
        return False
    
    print("🎉 All tests completed!")
    return True

if __name__ == "__main__":
    test_imports() 