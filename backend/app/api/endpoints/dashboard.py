from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import time
import psutil
import os
from backend.app.models.responses import ModelResponse, ModelComparison
from backend.app.services.model_service import model_service
from backend.app.core.config import settings

router = APIRouter()

# In-memory storage for metrics (in production, use a proper database)
performance_data = []
model_usage = {}
system_start_time = time.time()

# Add some sample data for demonstration
def add_sample_data():
    """Add sample performance data for demonstration"""
    from datetime import datetime, timedelta
    import random
    
    models = [
        ("mistral-7b-instruct", "ollama"),
        ("llama2-7b-chat", "ollama"),
        ("codellama-7b-instruct", "ollama"),
        ("mistral-7b-instruct", "openai"),
        ("gpt-3.5-turbo", "openai")
    ]
    
    # Generate sample data for the last 24 hours
    now = datetime.now()
    for i in range(50):  # 50 sample requests
        timestamp = now - timedelta(hours=random.uniform(0, 24))
        model_name, provider = random.choice(models)
        
        # Generate realistic latency (100ms to 5000ms)
        latency = random.uniform(100, 5000)
        
        # Generate realistic token usage (50 to 500 tokens)
        tokens = random.randint(50, 500)
        
        data = {
            'timestamp': timestamp,
            'model_name': model_name,
            'provider': provider,
            'tokens_used': tokens,
            'latency_ms': latency,
            'success': random.random() > 0.05  # 95% success rate
        }
        performance_data.append(data)
    
    # Sort by timestamp
    performance_data.sort(key=lambda x: x['timestamp'])

# Initialize with sample data
add_sample_data()

@router.get("/metrics")
async def get_performance_metrics(timeRange: str = Query("24h", description="Time range for metrics")):
    """Get overall performance metrics"""
    try:
        # Calculate time range
        now = datetime.now()
        if timeRange == "1h":
            start_time = now - timedelta(hours=1)
        elif timeRange == "24h":
            start_time = now - timedelta(days=1)
        elif timeRange == "7d":
            start_time = now - timedelta(days=7)
        elif timeRange == "30d":
            start_time = now - timedelta(days=30)
        else:
            start_time = now - timedelta(days=1)
        
        # Filter data by time range
        filtered_data = [
            data for data in performance_data 
            if data.get('timestamp', datetime.now()) >= start_time
        ]
        
        if not filtered_data:
            # Return default metrics if no data
            return {
                "totalRequests": 0,
                "averageLatency": 0,
                "totalTokens": 0,
                "successRate": 100,
                "modelsUsed": [],
                "peakConcurrentRequests": 0,
                "averageTokensPerRequest": 0
            }
        
        # Calculate metrics
        total_requests = len(filtered_data)
        total_tokens = sum(data.get('tokens_used', 0) for data in filtered_data)
        successful_requests = sum(1 for data in filtered_data if data.get('success', True))
        success_rate = (successful_requests / total_requests) * 100 if total_requests > 0 else 100
        
        latencies = [data.get('latency_ms', 0) for data in filtered_data]
        average_latency = sum(latencies) / len(latencies) if latencies else 0
        
        models_used = list(set(data.get('model_name', '') for data in filtered_data if data.get('model_name')))
        average_tokens_per_request = total_tokens / total_requests if total_requests > 0 else 0
        
        # Calculate peak concurrent requests (simplified)
        peak_concurrent = max(len(filtered_data) // 10, 1)  # Simplified calculation
        
        return {
            "totalRequests": total_requests,
            "averageLatency": round(average_latency, 2),
            "totalTokens": total_tokens,
            "successRate": round(success_rate, 1),
            "modelsUsed": models_used,
            "peakConcurrentRequests": peak_concurrent,
            "averageTokensPerRequest": round(average_tokens_per_request, 1)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating metrics: {str(e)}")

@router.get("/models")
async def get_model_performance(timeRange: str = Query("24h", description="Time range for metrics")):
    """Get performance metrics by model"""
    try:
        # Calculate time range
        now = datetime.now()
        if timeRange == "1h":
            start_time = now - timedelta(hours=1)
        elif timeRange == "24h":
            start_time = now - timedelta(days=1)
        elif timeRange == "7d":
            start_time = now - timedelta(days=7)
        elif timeRange == "30d":
            start_time = now - timedelta(days=30)
        else:
            start_time = now - timedelta(days=1)
        
        # Filter data by time range
        filtered_data = [
            data for data in performance_data 
            if data.get('timestamp', datetime.now()) >= start_time
        ]
        
        # Group by model
        model_stats = {}
        for data in filtered_data:
            model_name = data.get('model_name', 'Unknown')
            provider = data.get('provider', 'Unknown')
            key = f"{model_name} ({provider})"
            
            if key not in model_stats:
                model_stats[key] = {
                    'requests': [],
                    'tokens': [],
                    'successes': 0,
                    'last_used': data.get('timestamp', datetime.now())
                }
            
            model_stats[key]['requests'].append(data.get('latency_ms', 0))
            model_stats[key]['tokens'].append(data.get('tokens_used', 0))
            if data.get('success', True):
                model_stats[key]['successes'] += 1
            model_stats[key]['last_used'] = max(
                model_stats[key]['last_used'], 
                data.get('timestamp', datetime.now())
            )
        
        # Calculate metrics for each model
        result = []
        for model_key, stats in model_stats.items():
            model_name, provider = model_key.split(" (")
            provider = provider.rstrip(")")
            
            total_requests = len(stats['requests'])
            total_tokens = sum(stats['tokens'])
            success_rate = (stats['successes'] / total_requests) * 100 if total_requests > 0 else 100
            average_latency = sum(stats['requests']) / len(stats['requests']) if stats['requests'] else 0
            average_tokens_per_request = total_tokens / total_requests if total_requests > 0 else 0
            
            result.append({
                "modelName": model_name,
                "provider": provider,
                "totalRequests": total_requests,
                "averageLatency": round(average_latency, 2),
                "totalTokens": total_tokens,
                "successRate": round(success_rate, 1),
                "lastUsed": stats['last_used'].isoformat() if isinstance(stats['last_used'], datetime) else str(stats['last_used']),
                "averageTokensPerRequest": round(average_tokens_per_request, 1)
            })
        
        # Sort by total requests
        result.sort(key=lambda x: x['totalRequests'], reverse=True)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating model metrics: {str(e)}")

@router.get("/system")
async def get_system_metrics():
    """Get current system health metrics"""
    try:
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Calculate uptime
        uptime_seconds = time.time() - system_start_time
        uptime_hours = int(uptime_seconds // 3600)
        uptime_minutes = int((uptime_seconds % 3600) // 60)
        uptime_str = f"{uptime_hours}h {uptime_minutes}m"
        
        # Get model information
        available_models = model_service.get_available_models()
        # For now, assume all available models are active (simplified)
        active_models = len(available_models)
        total_models = len(available_models)
        
        return {
            "cpuUsage": round(cpu_percent, 1),
            "memoryUsage": round(memory.percent, 1),
            "diskUsage": round((disk.used / disk.total) * 100, 1),
            "activeModels": active_models,
            "totalModels": total_models,
            "uptime": uptime_str
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting system metrics: {str(e)}")

@router.get("/analytics")
async def get_usage_analytics(timeRange: str = Query("24h", description="Time range for analytics")):
    """Get detailed usage analytics"""
    try:
        # Calculate time range
        now = datetime.now()
        if timeRange == "1h":
            start_time = now - timedelta(hours=1)
            interval_hours = 1
        elif timeRange == "24h":
            start_time = now - timedelta(days=1)
            interval_hours = 24
        elif timeRange == "7d":
            start_time = now - timedelta(days=7)
            interval_hours = 168
        elif timeRange == "30d":
            start_time = now - timedelta(days=30)
            interval_hours = 720
        else:
            start_time = now - timedelta(days=1)
            interval_hours = 24
        
        # Filter data by time range
        filtered_data = [
            data for data in performance_data 
            if data.get('timestamp', datetime.now()) >= start_time
        ]
        
        # Generate hourly request data
        requests_by_hour = []
        for i in range(min(24, interval_hours)):  # Limit to 24 data points
            hour_start = start_time + timedelta(hours=i)
            hour_end = hour_start + timedelta(hours=1)
            hour_requests = len([
                data for data in filtered_data 
                if hour_start <= data.get('timestamp', datetime.now()) < hour_end
            ])
            requests_by_hour.append({
                "hour": hour_start.strftime("%H:%M"),
                "requests": hour_requests
            })
        
        # Calculate tokens by model
        tokens_by_model = {}
        for data in filtered_data:
            model_name = data.get('model_name', 'Unknown')
            tokens = data.get('tokens_used', 0)
            tokens_by_model[model_name] = tokens_by_model.get(model_name, 0) + tokens
        
        tokens_by_model_list = [
            {"model": model, "tokens": tokens}
            for model, tokens in tokens_by_model.items()
        ]
        tokens_by_model_list.sort(key=lambda x: x['tokens'], reverse=True)
        
        # Generate latency trends (simplified)
        latency_trends = []
        for i, data in enumerate(filtered_data[-10:]):  # Last 10 requests
            latency_trends.append({
                "timestamp": data.get('timestamp', datetime.now()).strftime("%H:%M"),
                "latency": data.get('latency_ms', 0)
            })
        
        # Popular prompts (simplified - in real implementation, track actual prompts)
        popular_prompts = [
            {"prompt": "General conversation", "count": len(filtered_data) // 3},
            {"prompt": "Code generation", "count": len(filtered_data) // 4},
            {"prompt": "Text analysis", "count": len(filtered_data) // 6},
            {"prompt": "Question answering", "count": len(filtered_data) // 8}
        ]
        
        return {
            "requestsByHour": requests_by_hour,
            "tokensByModel": tokens_by_model_list,
            "latencyTrends": latency_trends,
            "popularPrompts": popular_prompts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating analytics: {str(e)}")

# Helper function to record performance data
def record_performance_data(response: ModelResponse, success: bool = True):
    """Record performance data for dashboard metrics"""
    try:
        data = {
            'timestamp': datetime.now(),
            'model_name': response.model_name,
            'provider': response.provider,
            'tokens_used': response.tokens_used,
            'latency_ms': response.latency_ms,
            'success': success
        }
        performance_data.append(data)
        
        # Keep only last 1000 records to prevent memory issues
        if len(performance_data) > 1000:
            performance_data.pop(0)
    except Exception as e:
        print(f"Error recording performance data: {e}")

# Helper function to record comparison data
def record_comparison_data(comparison: ModelComparison, success: bool = True):
    """Record comparison data for dashboard metrics"""
    try:
        data = {
            'timestamp': datetime.now(),
            'model_name': comparison.model_name,
            'provider': comparison.provider,
            'tokens_used': comparison.usage.get('total_tokens', 0),
            'latency_ms': comparison.latency * 1000,  # Convert to ms
            'success': success
        }
        performance_data.append(data)
        
        # Keep only last 1000 records to prevent memory issues
        if len(performance_data) > 1000:
            performance_data.pop(0)
    except Exception as e:
        print(f"Error recording comparison data: {e}") 