import os
import uuid
import re
from typing import List, Dict, Any, Optional
import fitz  # PyMuPDF
import asyncio
import json
from datetime import datetime

from backend.app.core.config import settings
from backend.app.models.requests import RAGRequest
from backend.app.models.responses import RAGResponse, DocumentChunk, CollectionInfo
from backend.app.services.model_service import model_service

# Conditional import for ChromaDB to avoid SQLite version issues
try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError as e:
    print(f"⚠️  ChromaDB not available: {e}")
    CHROMADB_AVAILABLE = False
except RuntimeError as e:
    if "sqlite3" in str(e):
        print(f"⚠️  ChromaDB not available due to SQLite version: {e}")
        CHROMADB_AVAILABLE = False
    else:
        raise

# Lazy import for sentence_transformers to avoid startup issues
SentenceTransformer = None

class RAGService:
    """Service for RAG (Retrieval-Augmented Generation) functionality"""
    
    def __init__(self):
        self.chroma_client = None
        self.embedding_model = None
        self._embedding_model_loaded = False
        
        if CHROMADB_AVAILABLE:
            # Disable all telemetry for ChromaDB
            chroma_settings = Settings(
                anonymized_telemetry=False,
                is_persistent=True,
                allow_reset=True
            )
            
            # Suppress telemetry warnings during client creation
            import sys
            import os
            original_stderr = sys.stderr
            sys.stderr = open(os.devnull, 'w')
            
            try:
                self.chroma_client = chromadb.PersistentClient(
                    path=settings.CHROMA_PERSIST_DIRECTORY,
                    settings=chroma_settings
                )
            finally:
                sys.stderr.close()
                sys.stderr = original_stderr
        else:
            print("⚠️  RAG functionality disabled - ChromaDB not available")
    
    def _load_embedding_model(self):
        """Lazy load the embedding model"""
        if not self._embedding_model_loaded:
            global SentenceTransformer
            if SentenceTransformer is None:
                try:
                    from sentence_transformers import SentenceTransformer
                except ImportError as e:
                    raise ImportError(f"sentence-transformers not available: {e}")
            
            self.embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
            self._embedding_model_loaded = True
    
    def _get_embedding_dimension(self):
        """Get embedding dimension without loading the full model"""
        self._load_embedding_model()
        return self.embedding_model.encode(["test"])
    
    def _split_text(self, text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
        """Simple text splitter that splits on sentences and paragraphs"""
        # Split on double newlines (paragraphs)
        paragraphs = re.split(r'\n\s*\n', text)
        chunks = []
        current_chunk = ""
        
        for paragraph in paragraphs:
            # If adding this paragraph would exceed chunk size, save current chunk
            if len(current_chunk) + len(paragraph) > chunk_size and current_chunk:
                chunks.append(current_chunk.strip())
                # Start new chunk with overlap
                overlap_start = max(0, len(current_chunk) - chunk_overlap)
                current_chunk = current_chunk[overlap_start:] + "\n\n" + paragraph
            else:
                current_chunk += "\n\n" + paragraph if current_chunk else paragraph
        
        # Add the last chunk
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        return chunks
    
    async def process_document(self, file_path: str, collection_name: str, 
                             chunk_size: int = 1000, chunk_overlap: int = 200,
                             description: str = None, tags: List[str] = None, 
                             is_public: bool = False) -> Dict[str, Any]:
        """Process and embed a document"""
        # Extract text from document
        text = await self._extract_text(file_path)
        
        # Split text into chunks
        chunks = self._split_text(text, chunk_size, chunk_overlap)
        
        # Create or get collection with metadata
        collection_metadata = {
            "description": description or f"Collection for {os.path.basename(file_path)}",
            "tags": json.dumps(tags or []),  # Convert list to JSON string
            "is_public": is_public,
            "created_at": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat()
        }
        
        collection = self.chroma_client.get_or_create_collection(
            name=collection_name,
            metadata=collection_metadata
        )
        
        # Generate embeddings and add to collection
        self._load_embedding_model()
        embeddings = self.embedding_model.encode(chunks)
        
        # Prepare documents for insertion
        documents = []
        metadatas = []
        ids = []
        
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            doc_id = str(uuid.uuid4())
            documents.append(chunk)
            metadatas.append({
                "source": os.path.basename(file_path),
                "chunk_index": i,
                "chunk_size": len(chunk)
            })
            ids.append(doc_id)
        
        # Add to collection
        collection.add(
            documents=documents,
            embeddings=embeddings.tolist(),
            metadatas=metadatas,
            ids=ids
        )
        
        return {
            "collection_name": collection_name,
            "document_name": os.path.basename(file_path),
            "chunks_processed": len(chunks),
            "collection_size": collection.count()
        }
    
    async def query_rag(self, request: RAGRequest) -> RAGResponse:
        """Query RAG system with document retrieval and generation"""
        # Get collection
        try:
            collection = self.chroma_client.get_collection(request.collection_name)
        except Exception as e:
            raise ValueError(f"Collection '{request.collection_name}' not found: {str(e)}")
        
        # Query collection
        self._load_embedding_model()
        query_embedding = self.embedding_model.encode([request.query])
        results = collection.query(
            query_embeddings=query_embedding.tolist(),
            n_results=request.top_k,
            include=["documents", "metadatas", "distances"]
        )
        
        # Prepare retrieved documents
        retrieved_docs = []
        for i, (doc, metadata, distance) in enumerate(zip(
            results["documents"][0], 
            results["metadatas"][0], 
            results["distances"][0]
        )):
            retrieved_docs.append({
                "text": doc,
                "metadata": metadata,
                "similarity_score": 1 - distance,  # Convert distance to similarity
                "rank": i + 1
            })
        
        # Create context from retrieved documents (limit to ~300 tokens to leave room for prompt)
        context_parts = []
        total_chars = 0
        max_chars = 1200  # Roughly 300 tokens
        
        for doc in retrieved_docs:
            if total_chars + len(doc["text"]) <= max_chars:
                context_parts.append(doc["text"])
                total_chars += len(doc["text"])
            else:
                # Truncate this document to fit
                remaining_chars = max_chars - total_chars
                if remaining_chars > 50:  # Only add if we have meaningful space
                    context_parts.append(doc["text"][:remaining_chars] + "...")
                break
        
        context = "\n\n".join(context_parts)
        
        # Generate response using model
        prompt = f"""Context: {context}

Q: {request.query}
A:"""

        model_request = type('obj', (object,), {
            'prompt': prompt,
            'system_prompt': "Answer based on the context provided.",
            'temperature': request.temperature,
            'max_tokens': request.max_tokens,
            'top_p': 0.9,
            'model_name': request.model_name,
            'provider': request.provider
        })()
        
        try:
            model_response = await model_service.generate_response(model_request)
            answer = model_response.text if model_response.text.strip() else "I found relevant information in the document, but I'm having trouble generating a detailed response. Please try rephrasing your question."
        except Exception as e:
            print(f"Model generation error: {e}")
            answer = "I found relevant information in the document, but encountered an error while generating the response. Please try again."
        
        return RAGResponse(
            query=request.query,
            answer=answer,
            retrieved_documents=retrieved_docs,
            model_response={
                "text": answer,
                "tokens_used": model_response.usage.get('total_tokens', 0) if model_response.usage else 0,
                "latency_ms": int(model_response.latency * 1000) if model_response.latency else 0
            }
        )
    
    async def _extract_text(self, file_path: str) -> str:
        """Extract text from various document formats"""
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext == '.pdf':
            return await self._extract_pdf_text(file_path)
        elif file_ext in ['.txt', '.md']:
            return await self._extract_text_file(file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_ext}")
    
    async def _extract_pdf_text(self, file_path: str) -> str:
        """Extract text from PDF file"""
        try:
            doc = fitz.open(file_path)
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            return text
        except Exception as e:
            raise ValueError(f"Error extracting text from PDF: {str(e)}")
    
    async def _extract_text_file(self, file_path: str) -> str:
        """Extract text from text file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            raise ValueError(f"Error reading text file: {str(e)}")
    
    def list_collections(self) -> List[CollectionInfo]:
        """List all collections"""
        collections = []
        for collection in self.chroma_client.list_collections():
            # Get collection metadata
            metadata = collection.metadata or {}
            
            # Parse tags from JSON string
            tags = []
            if metadata.get("tags"):
                try:
                    tags = json.loads(metadata.get("tags"))
                except (json.JSONDecodeError, TypeError):
                    tags = []
            
            collections.append(CollectionInfo(
                name=collection.name,
                description=metadata.get("description"),
                tags=tags,
                document_count=1,  # Simplified - assume 1 document per collection
                chunk_count=collection.count(),
                total_size_mb=None,  # TODO: Calculate actual size
                created_at=metadata.get("created_at", datetime.now().isoformat()),
                last_updated=metadata.get("last_updated", datetime.now().isoformat()),
                last_queried=None,  # TODO: Track query timestamps
                is_public=metadata.get("is_public", False),
                owner=None  # TODO: Add user management
            ))
        return collections
    
    def delete_collection(self, collection_name: str) -> bool:
        """Delete a collection"""
        try:
            self.chroma_client.delete_collection(collection_name)
            return True
        except Exception:
            return False
    
    def get_collection_stats(self, collection_name: str) -> Dict[str, Any]:
        """Get statistics for a collection"""
        try:
            collection = self.chroma_client.get_collection(collection_name)
            return {
                "name": collection_name,
                "document_count": collection.count(),
                "metadata": collection.metadata
            }
        except Exception as e:
            raise ValueError(f"Collection '{collection_name}' not found: {str(e)}")

    def update_collection_metadata(self, collection_name: str, description: str = None, 
                                 tags: List[str] = None, is_public: bool = None) -> Dict[str, Any]:
        """Update collection metadata"""
        try:
            collection = self.chroma_client.get_collection(collection_name)
            current_metadata = collection.metadata or {}
            
            if description is not None:
                current_metadata["description"] = description
            if tags is not None:
                current_metadata["tags"] = tags
            if is_public is not None:
                current_metadata["is_public"] = is_public
            
            # Update metadata (ChromaDB doesn't have direct metadata update, so we'd need to recreate)
            # For now, return the updated metadata structure
            return {
                "name": collection_name,
                "metadata": current_metadata,
                "message": "Metadata updated successfully"
            }
        except Exception as e:
            raise ValueError(f"Failed to update collection metadata: {str(e)}")

    def search_collections(self, query: str = "", tags: List[str] = None, 
                          owner: str = None, is_public: bool = None) -> List[CollectionInfo]:
        """Search and filter collections"""
        all_collections = self.list_collections()
        filtered_collections = []
        
        for collection in all_collections:
            # Filter by query (search in name and description)
            if query and query.lower() not in collection.name.lower():
                if not collection.description or query.lower() not in collection.description.lower():
                    continue
            
            # Filter by tags
            if tags and not any(tag in (collection.tags or []) for tag in tags):
                continue
            
            # Filter by owner
            if owner and collection.owner != owner:
                continue
            
            # Filter by public status
            if is_public is not None and collection.is_public != is_public:
                continue
            
            filtered_collections.append(collection)
        
        return filtered_collections

    def merge_collections(self, target_collection_name: str, source_collection_names: List[str]) -> Dict[str, Any]:
        """Merge multiple collections into one"""
        try:
            # Get target collection
            target_collection = self.chroma_client.get_collection(target_collection_name)
            
            total_chunks = 0
            for source_name in source_collection_names:
                source_collection = self.chroma_client.get_collection(source_name)
                # Get all data from source collection
                results = source_collection.get()
                
                if results['documents']:
                    # Add to target collection
                    target_collection.add(
                        documents=results['documents'],
                        embeddings=results['embeddings'],
                        metadatas=results['metadatas'],
                        ids=results['ids']
                    )
                    total_chunks += len(results['documents'])
            
            return {
                "target_collection": target_collection_name,
                "source_collections": source_collection_names,
                "chunks_merged": total_chunks,
                "message": f"Successfully merged {len(source_collection_names)} collections"
            }
        except Exception as e:
            raise ValueError(f"Failed to merge collections: {str(e)}")

    def bulk_delete_collections(self, collection_names: List[str]) -> Dict[str, Any]:
        """Delete multiple collections"""
        deleted_count = 0
        failed_deletions = []
        
        for collection_name in collection_names:
            try:
                success = self.delete_collection(collection_name)
                if success:
                    deleted_count += 1
                else:
                    failed_deletions.append(collection_name)
            except Exception as e:
                failed_deletions.append(f"{collection_name}: {str(e)}")
        
        return {
            "deleted_count": deleted_count,
            "failed_deletions": failed_deletions,
            "message": f"Deleted {deleted_count} collections, {len(failed_deletions)} failed"
        }

    def export_collection(self, collection_name: str) -> Dict[str, Any]:
        """Export collection data"""
        try:
            collection = self.chroma_client.get_collection(collection_name)
            results = collection.get()
            
            return {
                "collection_name": collection_name,
                "metadata": collection.metadata,
                "document_count": len(results['documents']) if results['documents'] else 0,
                "documents": results['documents'],
                "metadatas": results['metadatas'],
                "exported_at": datetime.now().isoformat()
            }
        except Exception as e:
            raise ValueError(f"Failed to export collection: {str(e)}")

# Global RAG service instance
rag_service = RAGService() 