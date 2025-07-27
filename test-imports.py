#!/usr/bin/env python3
"""
Test script to verify imports work correctly in Codespaces
"""

import sys
import os

print("🔍 Testing imports in Codespaces environment")
print(f"Current directory: {os.getcwd()}")
print(f"Python path: {sys.path}")

# Set PYTHONPATH if not already set
if os.getcwd() not in sys.path:
    sys.path.insert(0, os.getcwd())
    print(f"Added {os.getcwd()} to Python path")

try:
    print("Testing backend module import...")
    import backend
    print("✅ backend module imported successfully")
    
    print("Testing backend.app module import...")
    import backend.app
    print("✅ backend.app module imported successfully")
    
    print("Testing backend.app.models module import...")
    import backend.app.models
    print("✅ backend.app.models module imported successfully")
    
    print("Testing backend.app.models.requests import...")
    from backend.app.models.requests import PromptRequest
    print("✅ backend.app.models.requests imported successfully")
    
    print("Testing backend.app.api.endpoints.models import...")
    from backend.app.api.endpoints import models
    print("✅ backend.app.api.endpoints.models imported successfully")
    
    print("🎉 All imports successful!")
    
except ImportError as e:
    print(f"❌ Import failed: {e}")
    print(f"Current sys.path: {sys.path}")
    print(f"Files in current directory: {os.listdir('.')}")
    if os.path.exists('backend'):
        print(f"Files in backend directory: {os.listdir('backend')}")
    if os.path.exists('backend/app'):
        print(f"Files in backend/app directory: {os.listdir('backend/app')}")
    sys.exit(1) 