from fastapi import APIRouter, HTTPException
from typing import List
import uuid
import os

from backend.app.models.requests import PromptConfigSaveRequest
from backend.app.models.responses import PromptConfig

router = APIRouter()

# In-memory storage for prompt configurations (in production, use a database)
prompt_configs: dict = {}

@router.post("/save", response_model=PromptConfig)
async def save_prompt_config(request: PromptConfigSaveRequest):
    """Save a prompt configuration"""
    try:
        config_id = str(uuid.uuid4())
        config = PromptConfig(
            id=config_id,
            name=request.name,
            description=request.description,
            prompt=request.prompt,
            system_prompt=request.system_prompt,
            parameters=request.parameters,
            tags=request.tags,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        prompt_configs[config_id] = config
        return config
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list", response_model=List[PromptConfig])
async def list_prompt_configs():
    """List all saved prompt configurations"""
    try:
        return list(prompt_configs.values())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{config_id}", response_model=PromptConfig)
async def get_prompt_config(config_id: str):
    """Get a specific prompt configuration"""
    try:
        if config_id not in prompt_configs:
            raise HTTPException(status_code=404, detail="Configuration not found")
        return prompt_configs[config_id]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{config_id}", response_model=PromptConfig)
async def update_prompt_config(config_id: str, request: PromptConfigSaveRequest):
    """Update a prompt configuration"""
    try:
        if config_id not in prompt_configs:
            raise HTTPException(status_code=404, detail="Configuration not found")
        
        existing_config = prompt_configs[config_id]
        updated_config = PromptConfig(
            id=config_id,
            name=request.name,
            description=request.description,
            prompt=request.prompt,
            system_prompt=request.system_prompt,
            parameters=request.parameters,
            tags=request.tags,
            created_at=existing_config.created_at,
            updated_at=datetime.utcnow()
        )
        
        prompt_configs[config_id] = updated_config
        return updated_config
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{config_id}")
async def delete_prompt_config(config_id: str):
    """Delete a prompt configuration"""
    try:
        if config_id not in prompt_configs:
            raise HTTPException(status_code=404, detail="Configuration not found")
        
        del prompt_configs[config_id]
        return {"message": "Configuration deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search/{tag}", response_model=List[PromptConfig])
async def search_prompt_configs_by_tag(tag: str):
    """Search prompt configurations by tag"""
    try:
        matching_configs = [
            config for config in prompt_configs.values()
            if tag.lower() in [t.lower() for t in config.tags]
        ]
        return matching_configs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 