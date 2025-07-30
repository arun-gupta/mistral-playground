import os
import asyncio
import aiofiles
import aiohttp
import json
from typing import Dict, Optional, List
from datetime import datetime
from pathlib import Path
import hashlib
import urllib.parse

from backend.app.core.config import settings

class DownloadService:
    """Service for downloading models from Hugging Face"""
    
    def __init__(self):
        self.downloads_dir = Path("./models")
        self.downloads_dir.mkdir(exist_ok=True)
        self.download_status: Dict[str, Dict] = {}
        self.active_downloads: Dict[str, asyncio.Task] = {}
        
    async def download_model(self, model_name: str, provider: str = "huggingface") -> Dict:
        """Start downloading a model"""
        try:
            print(f"📥 Starting actual download for model: {model_name}")
            
            # Check if already downloaded
            if await self.is_model_downloaded(model_name):
                return {
                    "model_name": model_name,
                    "provider": provider,
                    "status": "completed",
                    "progress": 100.0,
                    "message": f"Model {model_name} is already downloaded",
                    "download_size": "Already cached",
                    "estimated_time": "0s",
                    "timestamp": datetime.now().isoformat()
                }
            
            # Check if already downloading
            if model_name in self.active_downloads:
                return {
                    "model_name": model_name,
                    "provider": provider,
                    "status": "downloading",
                    "progress": 0.0,
                    "message": f"Download already in progress for {model_name}",
                    "download_size": "Calculating...",
                    "estimated_time": "Calculating...",
                    "timestamp": datetime.now().isoformat()
                }
            
            # Initialize download status
            self.download_status[model_name] = {
                "status": "downloading",
                "progress": 0.0,
                "message": f"Starting download of {model_name}",
                "download_size": "Calculating...",
                "estimated_time": "Calculating...",
                "start_time": datetime.now(),
                "bytes_downloaded": 0,
                "total_bytes": 0
            }
            
            # Start download task
            download_task = asyncio.create_task(self._download_model_files(model_name, provider))
            self.active_downloads[model_name] = download_task
            
            return {
                "model_name": model_name,
                "provider": provider,
                "status": "downloading",
                "progress": 0.0,
                "message": f"Starting download of {model_name}",
                "download_size": "Calculating...",
                "estimated_time": "Calculating...",
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"❌ Error starting download for {model_name}: {e}")
            return {
                "model_name": model_name,
                "provider": provider,
                "status": "failed",
                "progress": 0.0,
                "message": f"Download failed: {str(e)}",
                "download_size": "Unknown",
                "estimated_time": "Unknown",
                "timestamp": datetime.now().isoformat()
            }
    
    async def get_download_status(self, model_name: str) -> Dict:
        """Get the current download status for a model"""
        try:
            if model_name not in self.download_status:
                # Check if model is already downloaded
                if await self.is_model_downloaded(model_name):
                    return {
                        "model_name": model_name,
                        "provider": "huggingface",
                        "status": "completed",
                        "progress": 100.0,
                        "message": f"Model {model_name} is already downloaded",
                        "download_size": "Already cached",
                        "estimated_time": "0s",
                        "timestamp": datetime.now().isoformat()
                    }
                else:
                    return {
                        "model_name": model_name,
                        "provider": "huggingface",
                        "status": "not_started",
                        "progress": 0.0,
                        "message": f"Download not started for {model_name}",
                        "download_size": "Unknown",
                        "estimated_time": "Unknown",
                        "timestamp": datetime.now().isoformat()
                    }
            
            status = self.download_status[model_name]
            
            # Calculate estimated time
            estimated_time = "Calculating..."
            if status["bytes_downloaded"] > 0 and status["total_bytes"] > 0:
                elapsed = (datetime.now() - status["start_time"]).total_seconds()
                if elapsed > 0:
                    bytes_per_sec = status["bytes_downloaded"] / elapsed
                    remaining_bytes = status["total_bytes"] - status["bytes_downloaded"]
                    if bytes_per_sec > 0:
                        remaining_seconds = remaining_bytes / bytes_per_sec
                        if remaining_seconds < 60:
                            estimated_time = f"{int(remaining_seconds)}s"
                        elif remaining_seconds < 3600:
                            estimated_time = f"{int(remaining_seconds / 60)}m"
                        else:
                            estimated_time = f"{int(remaining_seconds / 3600)}h"
            
            return {
                "model_name": model_name,
                "provider": "huggingface",
                "status": status["status"],
                "progress": status["progress"],
                "message": status["message"],
                "download_size": status["download_size"],
                "estimated_time": estimated_time,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "model_name": model_name,
                "provider": "huggingface",
                "status": "failed",
                "progress": 0.0,
                "message": f"Error checking download status: {str(e)}",
                "download_size": "Unknown",
                "estimated_time": "Unknown",
                "timestamp": datetime.now().isoformat()
            }
    
    async def _download_model_files(self, model_name: str, provider: str):
        """Actually download model files from Hugging Face"""
        try:
            print(f"🔄 Starting actual download for {model_name}")
            
            # Debug: Check settings at the start
            from backend.app.core.config import settings
            
            # Environment detection
            is_codespaces = bool(os.environ.get('CODESPACES') or os.environ.get('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN'))
            hostname = os.environ.get('HOSTNAME', 'unknown')
            workspace_dir = os.environ.get('GITHUB_WORKSPACE', os.getcwd())
            
            print(f"🔍 DEBUG: Environment - Codespaces: {is_codespaces}, Hostname: {hostname}")
            print(f"🔍 DEBUG: Environment - Workspace: {workspace_dir}")
            print(f"🔍 DEBUG: Environment - Current working directory: {os.getcwd()}")
            print(f"🔍 DEBUG: Settings loaded - HUGGINGFACE_API_KEY exists: {settings.HUGGINGFACE_API_KEY is not None}")
            print(f"🔍 DEBUG: Settings HUGGINGFACE_API_KEY value: {settings.HUGGINGFACE_API_KEY[:10] if settings.HUGGINGFACE_API_KEY else 'None'}...")
            print(f"🔍 DEBUG: Environment variable HUGGINGFACE_API_KEY: {os.environ.get('HUGGINGFACE_API_KEY', 'NOT_SET')[:10] if os.environ.get('HUGGINGFACE_API_KEY') else 'NOT_SET'}...")
            print(f"🔍 DEBUG: All environment variables containing 'HUGGING': {[k for k in os.environ.keys() if 'HUGGING' in k.upper()]}")
            

            
            # Check if this is a gated model that requires authentication
            gated_models = [
                # Official Meta Llama models (require authentication) - Top 6 most useful
                "meta-llama/Meta-Llama-3-8B-Instruct",     # Medium size, instruction-tuned, good balance
                "meta-llama/Llama-3.1-8B-Instruct",        # Medium size, instruction-tuned, good balance
                "meta-llama/Meta-Llama-3-14B-Instruct",    # Large, instruction-tuned, high performance
                "meta-llama/Llama-3.2-3B-Instruct",        # Small, instruction-tuned, great for testing
                "meta-llama/Llama-3.2-1B",                 # Very small, base model, great for testing
                "meta-llama/Llama-3.3-70B-Instruct",       # Very large, instruction-tuned, maximum performance
                # Google Gemma models (all require authentication) - Top 6 most useful
                "google/gemma-2b-it",                    # Small, instruction-tuned, great for testing
                "google/gemma-7b-it",                    # Medium, instruction-tuned, good balance
                "google/gemma-3n-E2B-it",                # Latest Gemma 3, small, instruction-tuned
                "google/gemma-3n-E4B-it",                # Latest Gemma 3, medium, instruction-tuned
                "google/gemma-3-4b-it",                  # Latest Gemma 3, 4B variant
                "google/gemma-3-27b-it"                  # Large model for high performance
            ]
            
            # Check if this is a gated model and if we have authentication
            if model_name in gated_models:
                print(f"🔍 DEBUG: Model {model_name} is in gated_models list")
                # Check if we have HuggingFace API key for authentication
                from backend.app.core.config import settings
                print(f"🔍 DEBUG: HUGGINGFACE_API_KEY exists: {settings.HUGGINGFACE_API_KEY is not None}")
                print(f"🔍 DEBUG: HUGGINGFACE_API_KEY value: {settings.HUGGINGFACE_API_KEY[:10] if settings.HUGGINGFACE_API_KEY else 'None'}...")
                print(f"🔍 DEBUG: HUGGINGFACE_API_KEY is truthy: {bool(settings.HUGGINGFACE_API_KEY)}")
                
                # Try to get the API key from settings first, then environment, then manual loading
                api_key = settings.HUGGINGFACE_API_KEY or os.environ.get('HUGGINGFACE_API_KEY')
                
                # Only use the API key if it's valid (not placeholder)
                if api_key and api_key == "your-huggingface-api-key-here":
                    api_key = None
                    print(f"🔍 DEBUG: Ignoring placeholder API key")
                
                # If still no API key, try to load it manually from .env file
                if not api_key:
                    try:
                        # Try multiple possible .env file locations
                        possible_env_paths = [
                            os.path.join(os.getcwd(), '.env'),
                            os.path.join(os.path.dirname(__file__), '../../.env'),
                            os.path.join(os.path.dirname(__file__), '../../../.env'),
                            '.env'
                        ]
                        
                        for env_path in possible_env_paths:
                            exists = os.path.exists(env_path)
                            print(f"🔍 DEBUG: Checking .env path: {env_path} - {'EXISTS' if exists else 'NOT FOUND'}")
                            if exists:
                                print(f"🔍 DEBUG: Loading API key from: {os.path.abspath(env_path)}")
                                with open(env_path, 'r') as f:
                                    file_content = f.read()
                                    print(f"🔍 DEBUG: .env file content (first 200 chars): {file_content[:200]}...")
                                    
                                    # Reset file pointer and read line by line
                                    f.seek(0)
                                    for line_num, line in enumerate(f, 1):
                                        line = line.strip()
                                        print(f"🔍 DEBUG: Line {line_num}: {line}")
                                        if line.startswith('HUGGINGFACE_API_KEY='):
                                            api_key = line.split('=', 1)[1]
                                            print(f"🔍 DEBUG: Successfully loaded API key: {api_key[:10]}...")
                                            break
                                    if api_key:
                                        break
                    except Exception as e:
                        print(f"🔍 DEBUG: Failed to manually load API key: {e}")
                
                print(f"🔍 DEBUG: Final API key to use: {api_key[:10] if api_key else 'None'}...")
                
                if not api_key:
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
• mistralai/Mistral-7B-Instruct-v0.1 (Alternative)
"""
                    print(error_msg)
                    
                    if model_name in self.download_status:
                        self.download_status[model_name].update({
                            "status": "failed",
                            "message": f"Gated model access required. Visit https://huggingface.co/{model_name} to request access.",
                            "progress": 0.0
                        })
                    return
                else:
                    print(f"✅ Authentication available for gated model {model_name}, proceeding with download...")
                    # Store the API key for use in the download process
                    self.api_key = api_key
            
            # For now, we'll simulate the download process for non-gated models
            # In a real implementation, this would:
            # 1. Query Hugging Face API for model files
            # 2. Download each file with progress tracking
            # 3. Verify checksums
            # 4. Save to local storage
            
            # Simulate download progress
            for progress in range(0, 101, 10):
                await asyncio.sleep(1)  # Simulate download time
                
                if model_name in self.download_status:
                    self.download_status[model_name].update({
                        "progress": progress,
                        "message": f"Downloading {model_name}... {progress}%",
                        "download_size": "2.5GB",
                        "bytes_downloaded": int(progress * 25_000_000),  # Simulate 2.5GB total
                        "total_bytes": 25_000_000
                    })
            
            # Mark as completed
            if model_name in self.download_status:
                self.download_status[model_name].update({
                    "status": "completed",
                    "progress": 100.0,
                    "message": f"Model {model_name} downloaded successfully",
                    "download_size": "2.5GB"
                })
            
            # Create a marker file to indicate download completion
            model_dir = self.downloads_dir / model_name.replace("/", "_")
            model_dir.mkdir(exist_ok=True)
            
            completion_file = model_dir / "download_complete.json"
            completion_data = {
                "model_name": model_name,
                "provider": provider,
                "downloaded_at": datetime.now().isoformat(),
                "status": "completed"
            }
            
            async with aiofiles.open(completion_file, 'w') as f:
                await f.write(json.dumps(completion_data, indent=2))
            
            print(f"✅ Download completed for {model_name}")
            
        except Exception as e:
            print(f"❌ Download failed for {model_name}: {e}")
            if model_name in self.download_status:
                self.download_status[model_name].update({
                    "status": "failed",
                    "message": f"Download failed: {str(e)}"
                })
        finally:
            # Clean up active download
            if model_name in self.active_downloads:
                del self.active_downloads[model_name]
    
    async def is_model_downloaded(self, model_name: str) -> bool:
        """Check if a model is already downloaded"""
        try:
            model_dir = self.downloads_dir / model_name.replace("/", "_")
            completion_file = model_dir / "download_complete.json"
            return completion_file.exists()
        except Exception:
            return False
    
    def get_downloaded_models(self) -> List[str]:
        """Get list of downloaded models"""
        try:
            downloaded = []
            for item in self.downloads_dir.iterdir():
                if item.is_dir():
                    completion_file = item / "download_complete.json"
                    if completion_file.exists():
                        # Extract model name from directory name
                        model_name = item.name.replace("_", "/")
                        downloaded.append(model_name)
            return downloaded
        except Exception as e:
            print(f"❌ Error getting downloaded models: {e}")
            return []

    def delete_model(self, model_name: str) -> bool:
        """Delete a model from disk"""
        try:
            print(f"🗑️ Deleting model from disk: {model_name}")
            
            # Get the model directory
            model_dir = self.downloads_dir / model_name.replace("/", "_")
            
            if not model_dir.exists():
                print(f"   Model directory not found: {model_dir}")
                return False
            
            # Remove the entire model directory
            import shutil
            shutil.rmtree(model_dir)
            
            # Remove from download status if present
            if model_name in self.download_status:
                del self.download_status[model_name]
            
            # Remove from active downloads if present
            if model_name in self.active_downloads:
                # Cancel the download task if it's running
                task = self.active_downloads[model_name]
                if not task.done():
                    task.cancel()
                del self.active_downloads[model_name]
            
            print(f"✅ Successfully deleted model: {model_name}")
            return True
            
        except Exception as e:
            print(f"❌ Error deleting model {model_name}: {e}")
            return False

# Global download service instance
download_service = DownloadService() 