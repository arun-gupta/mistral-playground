import os
import uuid
import re
from typing import List, Dict, Any, Optional
import asyncio
import json
from datetime import datetime
import pickle

# Conditional import for PyMuPDF
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError as e:
    print(f"⚠️  PyMuPDF not available: {e}")
    PYMUPDF_AVAILABLE = False

from backend.app.core.config import settings
from backend.app.models.requests import RAGRequest
from backend.app.models.responses import RAGResponse, DocumentChunk, CollectionInfo
from backend.app.services.model_service import model_service

# Conditional import for FAISS
try:
    import faiss
    import numpy as np
    FAISS_AVAILABLE = True
except ImportError as e:
    print(f"⚠️  FAISS not available: {e}")
    FAISS_AVAILABLE = False

# Lazy import for sentence_transformers
SentenceTransformer = None

class RAGServiceFAISS:
    """Service for RAG (Retrieval-Augmented Generation) functionality using FAISS"""
    
    def __init__(self):
        self.embedding_model = None
        self._embedding_model_loaded = False
        self.collections = {}  # Store collections in memory
        self.collection_metadata = {}  # Store metadata separately
        
        if FAISS_AVAILABLE:
            print("✅ FAISS-based RAG service initialized")
        else:
            print("⚠️  FAISS not available, RAG functionality disabled")
    
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
                current_chunk = paragraph
            else:
                current_chunk += "\n\n" + paragraph if current_chunk else paragraph
        
        # Add the last chunk
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    async def process_document(self, file_path: str, collection_name: str, 
                             chunk_size: int = 1000, chunk_overlap: int = 200,
                             description: str = None, tags: List[str] = None, 
                             is_public: bool = False) -> Dict[str, Any]:
        """Process a document and add it to a collection"""
        if not FAISS_AVAILABLE:
            raise Exception("FAISS not available")
        
        try:
            # Extract text from document
            text = await self._extract_text(file_path)
            
            # Split text into chunks
            chunks = self._split_text(text, chunk_size, chunk_overlap)
            
            # Load embedding model
            self._load_embedding_model()
            
            # Create embeddings for chunks
            embeddings = self.embedding_model.encode(chunks)
            
            # Initialize or get collection
            if collection_name not in self.collections:
                dimension = embeddings.shape[1]
                self.collections[collection_name] = faiss.IndexFlatIP(dimension)
                self.collection_metadata[collection_name] = {
                    'chunks': [],
                    'metadata': [],
                    'description': description or '',
                    'tags': tags or [],
                    'is_public': is_public,
                    'created_at': datetime.now().isoformat(),
                    'document_count': 0
                }
            
            # Add embeddings to collection
            self.collections[collection_name].add(embeddings.astype('float32'))
            
            # Store chunks and metadata
            for i, chunk in enumerate(chunks):
                chunk_id = str(uuid.uuid4())
                self.collection_metadata[collection_name]['chunks'].append({
                    'id': chunk_id,
                    'text': chunk,
                    'document': os.path.basename(file_path)
                })
                self.collection_metadata[collection_name]['metadata'].append({
                    'chunk_id': chunk_id,
                    'document': os.path.basename(file_path),
                    'chunk_index': i,
                    'added_at': datetime.now().isoformat()
                })
            
            self.collection_metadata[collection_name]['document_count'] += 1
            
            return {
                "success": True,
                "collection_name": collection_name,
                "chunks_added": len(chunks),
                "total_chunks": len(self.collection_metadata[collection_name]['chunks']),
                "message": f"Document processed and added to collection '{collection_name}'"
            }
            
        except Exception as e:
            print(f"❌ Error processing document: {e}")
            raise
    
    async def query_rag(self, request: RAGRequest) -> RAGResponse:
        """Query RAG system with a question"""
        if not FAISS_AVAILABLE:
            raise Exception("FAISS not available")
        
        try:
            # Load embedding model
            self._load_embedding_model()
            
            # Get collection
            if request.collection_name not in self.collections:
                raise Exception(f"Collection '{request.collection_name}' not found")
            
            collection = self.collections[request.collection_name]
            metadata = self.collection_metadata[request.collection_name]
            
            # Create query embedding
            query_embedding = self.embedding_model.encode([request.query])
            
            # Search for similar chunks
            k = min(request.top_k, len(metadata['chunks']))
            if k == 0:
                return RAGResponse(
                    answer="No documents found in the collection.",
                    sources=[],
                    query=request.query,
                    collection_name=request.collection_name
                )
            
            scores, indices = collection.search(query_embedding.astype('float32'), k)
            
            # Get relevant chunks
            relevant_chunks = []
            for i, (score, idx) in enumerate(zip(scores[0], indices[0])):
                if idx < len(metadata['chunks']):
                    chunk = metadata['chunks'][idx]
                    relevant_chunks.append({
                        'text': chunk['text'],
                        'score': float(score),
                        'document': chunk['document']
                    })
            
            # Create context from chunks
            context = "\n\n".join([chunk['text'] for chunk in relevant_chunks])
            
            # Generate answer using model
            prompt = f"""Based on the following context, answer the question. If the context doesn't contain enough information to answer the question, say so.

Context:
{context}

Question: {request.query}

Answer:"""
            
            # Use model service to generate answer
            model_response = await model_service.generate_response(
                type('obj', (object,), {
                    'prompt': prompt,
                    'model_name': request.model_name or settings.MODEL_NAME,
                    'provider': 'huggingface',
                    'temperature': request.temperature or 0.7,
                    'max_tokens': request.max_tokens or 500,
                    'top_p': request.top_p or 0.9,
                    'system_prompt': None
                })()
            )
            
            return RAGResponse(
                answer=model_response['text'],
                sources=[{
                    'text': chunk['text'][:200] + "...",
                    'document': chunk['document'],
                    'score': chunk['score']
                } for chunk in relevant_chunks],
                query=request.query,
                collection_name=request.collection_name
            )
            
        except Exception as e:
            print(f"❌ Error in RAG query: {e}")
            raise
    
    async def _extract_text(self, file_path: str) -> str:
        """Extract text from various file formats"""
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext == '.pdf':
            return await self._extract_pdf_text(file_path)
        elif file_ext in ['.txt', '.md', '.py', '.js', '.html', '.css']:
            return await self._extract_text_file(file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_ext}")
    
    async def _extract_pdf_text(self, file_path: str) -> str:
        """Extract text from PDF file"""
        if not PYMUPDF_AVAILABLE:
            raise ImportError("PyMuPDF (fitz) is required for PDF processing")
        
        try:
            doc = fitz.open(file_path)
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            return text
        except Exception as e:
            raise Exception(f"Error extracting text from PDF: {e}")
    
    async def _extract_text_file(self, file_path: str) -> str:
        """Extract text from text file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            raise Exception(f"Error reading text file: {e}")
    
    def list_collections(self) -> List[CollectionInfo]:
        """List all collections"""
        collections = []
        for name, metadata in self.collection_metadata.items():
            collections.append(CollectionInfo(
                name=name,
                description=metadata['description'],
                tags=metadata['tags'],
                is_public=metadata['is_public'],
                created_at=metadata['created_at'],
                document_count=metadata['document_count'],
                chunk_count=len(metadata['chunks'])
            ))
        return collections
    
    def delete_collection(self, collection_name: str) -> bool:
        """Delete a collection"""
        if collection_name in self.collections:
            del self.collections[collection_name]
            del self.collection_metadata[collection_name]
            return True
        return False

# Create global instance
rag_service_faiss = RAGServiceFAISS() 