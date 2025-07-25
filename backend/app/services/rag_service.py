import os
import uuid
import re
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import fitz  # PyMuPDF
import asyncio

from app.core.config import settings
from app.models.requests import RAGRequest
from app.models.responses import RAGResponse, DocumentChunk, CollectionInfo
from app.services.model_service import model_service

class RAGService:
    """Service for RAG (Retrieval-Augmented Generation) functionality"""
    
    def __init__(self):
        self.chroma_client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIRECTORY,
            settings=Settings(anonymized_telemetry=False)
        )
        self.embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
    
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
                             chunk_size: int = 1000, chunk_overlap: int = 200) -> Dict[str, Any]:
        """Process and embed a document"""
        # Extract text from document
        text = await self._extract_text(file_path)
        
        # Split text into chunks
        chunks = self._split_text(text, chunk_size, chunk_overlap)
        
        # Create or get collection
        collection = self.chroma_client.get_or_create_collection(
            name=collection_name,
            metadata={"description": f"Collection for {os.path.basename(file_path)}"}
        )
        
        # Generate embeddings and add to collection
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
        
        # Create context from retrieved documents
        context = "\n\n".join([doc["text"] for doc in retrieved_docs])
        
        # Generate response using model
        prompt = f"""Based on the following context, answer the question. If the context doesn't contain enough information to answer the question, say so.

Context:
{context}

Question: {request.query}

Answer:"""

        model_request = type('obj', (object,), {
            'prompt': prompt,
            'system_prompt': "You are a helpful assistant that answers questions based on provided context. Always cite the relevant parts of the context in your answer.",
            'temperature': request.temperature,
            'max_tokens': request.max_tokens,
            'top_p': 0.9,
            'model_name': None,
            'provider': 'vllm'
        })()
        
        model_response = await model_service.generate_response(model_request)
        
        return RAGResponse(
            query=request.query,
            answer=model_response.text,
            retrieved_documents=retrieved_docs,
            model_response=model_response
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
            collections.append(CollectionInfo(
                name=collection.name,
                document_count=collection.count(),
                embedding_dimension=len(self.embedding_model.encode(["test"])),
                created_at=collection.metadata.get("created_at", "unknown")
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

# Global RAG service instance
rag_service = RAGService() 