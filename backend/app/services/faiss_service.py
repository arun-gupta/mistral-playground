"""
FAISS Vector Database Service
Alternative to ChromaDB for environments where ChromaDB has issues (like Codespaces)
"""

import os
import pickle
import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False

from backend.app.core.config import settings
from backend.app.models.responses import CollectionInfo


class FAISSService:
    """FAISS-based vector database service for RAG functionality"""
    
    def __init__(self, persist_directory: str = None):
        self.persist_directory = persist_directory or settings.CHROMA_PERSIST_DIRECTORY
        self.collections_file = os.path.join(self.persist_directory, "faiss_collections.pkl")
        self.collections = {}
        
        if not FAISS_AVAILABLE:
            raise RuntimeError("FAISS is not available. Please install faiss-cpu.")
        
        self._load_collections()
    
    def _load_collections(self):
        """Load collections from disk"""
        if os.path.exists(self.collections_file):
            try:
                with open(self.collections_file, 'rb') as f:
                    self.collections = pickle.load(f)
                print(f"✅ Loaded {len(self.collections)} FAISS collections")
            except Exception as e:
                print(f"⚠️  Failed to load FAISS collections: {e}")
                self.collections = {}
    
    def _save_collections(self):
        """Save collections to disk"""
        try:
            os.makedirs(os.path.dirname(self.collections_file), exist_ok=True)
            with open(self.collections_file, 'wb') as f:
                pickle.dump(self.collections, f)
        except Exception as e:
            print(f"⚠️  Failed to save FAISS collections: {e}")
    
    def create_collection(self, name: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Create a new collection"""
        if name in self.collections:
            raise ValueError(f"Collection '{name}' already exists")
        
        # Create FAISS index (will be initialized when first embeddings are added)
        collection_data = {
            "name": name,
            "index": None,
            "documents": [],
            "metadatas": [],
            "ids": [],
            "metadata": metadata or {},
            "created_at": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat()
        }
        
        self.collections[name] = collection_data
        self._save_collections()
        
        return collection_data
    
    def get_collection(self, name: str) -> Dict[str, Any]:
        """Get a collection by name"""
        if name not in self.collections:
            raise ValueError(f"Collection '{name}' not found")
        return self.collections[name]
    
    def add_to_collection(self, collection_name: str, documents: List[str], 
                         embeddings: List[List[float]], metadatas: List[Dict] = None, 
                         ids: List[str] = None) -> Dict[str, Any]:
        """Add documents and embeddings to a collection"""
        if collection_name not in self.collections:
            raise ValueError(f"Collection '{collection_name}' not found")
        
        collection = self.collections[collection_name]
        
        # Convert embeddings to numpy array
        embeddings_array = np.array(embeddings, dtype=np.float32)
        
        # Initialize FAISS index if needed
        if collection["index"] is None:
            dimension = embeddings_array.shape[1]
            collection["index"] = faiss.IndexFlatIP(dimension)  # Inner product for cosine similarity
        
        # Add to FAISS index
        collection["index"].add(embeddings_array)
        
        # Store documents and metadata
        collection["documents"].extend(documents)
        collection["metadatas"].extend(metadatas or [{}] * len(documents))
        collection["ids"].extend(ids or [f"doc_{i}" for i in range(len(documents))])
        collection["last_updated"] = datetime.now().isoformat()
        
        self._save_collections()
        
        return {
            "collection_name": collection_name,
            "documents_added": len(documents),
            "total_documents": len(collection["documents"])
        }
    
    def query_collection(self, collection_name: str, query_embedding: List[float], 
                        n_results: int = 5) -> Dict[str, Any]:
        """Query a collection with an embedding"""
        if collection_name not in self.collections:
            raise ValueError(f"Collection '{collection_name}' not found")
        
        collection = self.collections[collection_name]
        
        if collection["index"] is None or len(collection["documents"]) == 0:
            return {
                "documents": [],
                "metadatas": [],
                "distances": [],
                "ids": []
            }
        
        # Convert query embedding to numpy array
        query_array = np.array([query_embedding], dtype=np.float32)
        
        # Search in FAISS index
        distances, indices = collection["index"].search(query_array, min(n_results, len(collection["documents"])))
        
        # Get results
        results = {
            "documents": [[collection["documents"][i] for i in indices[0]]],
            "metadatas": [[collection["metadatas"][i] for i in indices[0]]],
            "distances": [distances[0].tolist()],
            "ids": [[collection["ids"][i] for i in indices[0]]]
        }
        
        return results
    
    def list_collections(self) -> List[CollectionInfo]:
        """List all collections"""
        collections = []
        for name, data in self.collections.items():
            # Parse tags from metadata
            tags = []
            if data["metadata"].get("tags"):
                try:
                    tags = json.loads(data["metadata"].get("tags"))
                except (json.JSONDecodeError, TypeError):
                    tags = []
            
            collections.append(CollectionInfo(
                name=name,
                description=data["metadata"].get("description"),
                tags=tags,
                document_count=1,  # Simplified
                chunk_count=len(data["documents"]),
                total_size_mb=None,
                created_at=data["metadata"].get("created_at", data["created_at"]),
                last_updated=data["metadata"].get("last_updated", data["last_updated"]),
                last_queried=None,
                is_public=data["metadata"].get("is_public", False),
                owner=None
            ))
        
        return collections
    
    def delete_collection(self, name: str) -> bool:
        """Delete a collection"""
        if name in self.collections:
            del self.collections[name]
            self._save_collections()
            return True
        return False
    
    def get_collection_stats(self, name: str) -> Dict[str, Any]:
        """Get statistics for a collection"""
        if name not in self.collections:
            raise ValueError(f"Collection '{name}' not found")
        
        collection = self.collections[name]
        return {
            "name": name,
            "document_count": len(collection["documents"]),
            "metadata": collection["metadata"]
        } 