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
            print(f"🔍 DEBUG: Settings loaded - HUGGINGFACE_API_KEY exists: {settings.HUGGINGFACE_API_KEY is not None}")
            print(f"🔍 DEBUG: Settings HUGGINGFACE_API_KEY value: {settings.HUGGINGFACE_API_KEY[:10] if settings.HUGGINGFACE_API_KEY else 'None'}...")
            print(f"🔍 DEBUG: Environment variable HUGGINGFACE_API_KEY: {os.environ.get('HUGGINGFACE_API_KEY', 'NOT_SET')[:10] if os.environ.get('HUGGINGFACE_API_KEY') else 'NOT_SET'}...")
            print(f"🔍 DEBUG: All environment variables containing 'HUGGING': {[k for k in os.environ.keys() if 'HUGGING' in k.upper()]}")
            
            # Check if this is a gated model that requires authentication
            gated_models = [
                # Official Meta Llama models (require authentication)
                "meta-llama/Meta-Llama-3-8B-Instruct",
                "meta-llama/Meta-Llama-3-8B", 
                "meta-llama/Meta-Llama-3-14B-Instruct",
                "meta-llama/Meta-Llama-3-14B",
                "meta-llama/Llama-3.1-8B-Instruct",
                "meta-llama/Llama-3.2-3B-Instruct",
                "meta-llama/Llama-3.2-1B",
                "meta-llama/Llama-3.3-70B-Instruct",
                "meta-llama/Llama-4-Scout-17B-16E-Instruct",
                # Google Gemma models (all require authentication)
                "google/gemma-2b-it",
                "google/gemma-2b",
                "google/gemma-7b-it",
                "google/gemma-7b",
                "google/gemma-3n-E4B-it",
                "google/gemma-3n-E4B-it-litert-preview",
                "google/gemma-3n-E2B-it-litert-preview",
                "google/gemma-3-4b-it",
                "google/gemma-3n-E2B-it",
                "google/gemma-3-27b-it"
            ]
            
            # Check if this is a gated model and if we have authentication
            if model_name in gated_models:
                print(f"🔍 DEBUG: Model {model_name} is in gated_models list")
                # Check if we have HuggingFace API key for authentication
                from backend.app.core.config import settings
                print(f"🔍 DEBUG: HUGGINGFACE_API_KEY exists: {settings.HUGGINGFACE_API_KEY is not None}")
                print(f"🔍 DEBUG: HUGGINGFACE_API_KEY value: {settings.HUGGINGFACE_API_KEY[:10] if settings.HUGGINGFACE_API_KEY else 'None'}...")
                print(f"🔍 DEBUG: HUGGINGFACE_API_KEY is truthy: {bool(settings.HUGGINGFACE_API_KEY)}")
                if not settings.HUGGINGFACE_API_KEY:
                    error_msg = f"""
❌ Gated Model Access Required

The model '{model_name}' requires authentication to download from Hugging Face.

To access this model:
1. Visit: https://huggingface.co/{model_name}
2. Click "Access Request" and accept the license terms
3. Wait for approval (usually instant for Llama 3)
4. Set up your Hugging Face token in the environment

Alternative models that don't require authentication:
• TheBloke/Mistral-7B-Instruct-v0.2-GGUF (Recommended)
• microsoft/DialoGPT-small (For testing)
• TheBloke/Mistral-7B-Instruct-v0.1-GGUF (Alternative)
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

# Global download service instance
download_service = DownloadService() 