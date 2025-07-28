import os
import uuid
import re
import pickle
from typing import List, Dict, Any, Optional
import asyncio
import json
from datetime import datetime

print("🔍 RAG Service: Starting module import...")

# Conditional import for PyMuPDF
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
    print("✅ PyMuPDF imported successfully")
except ImportError as e:
    print(f"⚠️  PyMuPDF not available: {e}")
    PYMUPDF_AVAILABLE = False

print("🔍 RAG Service: Importing config and models...")

try:
    from backend.app.core.config import settings
    print("✅ Config imported successfully")
except Exception as e:
    print(f"❌ Failed to import config: {e}")
    raise

try:
    from backend.app.models.requests import RAGRequest
    from backend.app.models.responses import RAGResponse, DocumentChunk, CollectionInfo, ModelResponse
    print("✅ Models imported successfully")
except Exception as e:
    print(f"❌ Failed to import models: {e}")
    raise

try:
    from backend.app.services.model_service import model_service
    print("✅ Model service imported successfully")
except Exception as e:
    print(f"❌ Failed to import model service: {e}")
    raise

print("🔍 RAG Service: Config and models imported successfully")

# Conditional import for ChromaDB to avoid SQLite version issues
try:
    print("🔍 RAG Service: Attempting to import ChromaDB...")
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
    print("✅ ChromaDB imported successfully")
except ImportError as e:
    print(f"⚠️  ChromaDB not available: {e}")
    CHROMADB_AVAILABLE = False
except RuntimeError as e:
    if "sqlite3" in str(e):
        print(f"⚠️  ChromaDB not available due to SQLite version: {e}")
        CHROMADB_AVAILABLE = False
    else:
        raise

# Conditional import for FAISS as fallback
try:
    print("🔍 RAG Service: Attempting to import FAISS...")
    import faiss
    print("✅ FAISS imported successfully")
    import numpy as np
    print("✅ NumPy imported successfully")
    FAISS_AVAILABLE = True
    print("✅ FAISS_AVAILABLE set to True")
except ImportError as e:
    print(f"⚠️  FAISS not available: {e}")
    print("🔍 RAG Service: Trying alternative FAISS import methods...")
    
    # Try alternative import methods
    try:
        print("🔍 RAG Service: Trying 'import faiss' without numpy...")
        import faiss
        print("✅ FAISS imported successfully (without numpy)")
        FAISS_AVAILABLE = True
    except ImportError as e2:
        print(f"⚠️  Alternative FAISS import failed: {e2}")
        FAISS_AVAILABLE = False
    
    # Try to import numpy separately
    try:
        print("🔍 RAG Service: Trying to import numpy separately...")
        import numpy as np
        print("✅ NumPy imported successfully (separately)")
    except ImportError as e3:
        print(f"⚠️  NumPy import failed: {e3}")
        FAISS_AVAILABLE = False
except Exception as e:
    print(f"⚠️  Unexpected error during FAISS import: {e}")
    import traceback
    traceback.print_exc()
    FAISS_AVAILABLE = False

print(f"🔍 RAG Service: Import status - CHROMADB_AVAILABLE={CHROMADB_AVAILABLE}, FAISS_AVAILABLE={FAISS_AVAILABLE}")

# Lazy import for sentence_transformers to avoid startup issues
SentenceTransformer = None

class RAGService:
    """Service for RAG (Retrieval-Augmented Generation) functionality"""
    
    def __init__(self):
        print("🔍 RAGService.__init__: Starting initialization...")
        self.chroma_client = None
        self.embedding_model = None
        self._embedding_model_loaded = False
        
        # FAISS fallback attributes
        self.faiss_index = None
        self.faiss_collections = {}  # Store collection data
        self.faiss_collection_metadata = {}  # Store collection metadata
        self.faiss_collection_path = None  # Will be set after imports are handled
        
        # Simple in-memory fallback when no vector database is available
        self.use_simple_fallback = False
        self.simple_collections = {}  # Simple in-memory storage
        self.simple_collection_metadata = {}
        
        print(f"🔍 RAGService.__init__: CHROMADB_AVAILABLE={CHROMADB_AVAILABLE}")
        
        if CHROMADB_AVAILABLE:
            print("🔍 RAGService.__init__: Attempting ChromaDB initialization...")
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
                print(f"🔍 RAGService.__init__: Creating ChromaDB client with path: {settings.CHROMA_PERSIST_DIRECTORY}")
                self.chroma_client = chromadb.PersistentClient(
                    path=settings.CHROMA_PERSIST_DIRECTORY,
                    settings=chroma_settings
                )
                print("✅ RAGService.__init__: ChromaDB client created successfully")
            except Exception as e:
                print(f"⚠️  RAGService.__init__: ChromaDB initialization failed: {e}")
                import traceback
                traceback.print_exc()
                self.chroma_client = None
            finally:
                sys.stderr.close()
                sys.stderr = original_stderr
        
        print(f"🔍 RAGService.__init__: After ChromaDB attempt - chroma_client is None: {self.chroma_client is None}")
        print(f"🔍 RAGService.__init__: FAISS_AVAILABLE={FAISS_AVAILABLE}")
        
        # If ChromaDB failed, try FAISS
        if self.chroma_client is None and FAISS_AVAILABLE:
            try:
                print(f"🔍 RAGService.__init__: Attempting FAISS initialization...")
                # Set FAISS collection path now that os is available
                self.faiss_collection_path = os.path.join(settings.CHROMA_PERSIST_DIRECTORY, "faiss_collections.pkl")
                print(f"🔍 RAGService.__init__: FAISS collection path: {self.faiss_collection_path}")
                self._load_faiss_collections()
                print("✅ RAGService.__init__: FAISS initialization completed successfully")
            except Exception as e:
                print(f"⚠️  RAGService.__init__: FAISS initialization failed: {e}")
                import traceback
                traceback.print_exc()
        elif self.chroma_client is None:
            print("⚠️  RAGService.__init__: No vector database available - RAG functionality will be disabled")
            print(f"🔍 RAGService.__init__: Debug - CHROMADB_AVAILABLE={CHROMADB_AVAILABLE}, FAISS_AVAILABLE={FAISS_AVAILABLE}")
            
            # Enable simple in-memory fallback
            print("🔍 RAGService.__init__: Enabling simple in-memory fallback for basic RAG functionality")
            self.use_simple_fallback = True
        
        print(f"🔍 RAGService.__init__: Final state - chroma_client is None: {self.chroma_client is None}")
        print(f"🔍 RAGService.__init__: Final state - faiss_collections count: {len(self.faiss_collections)}")
        print(f"🔍 RAGService.__init__: Final state - use_simple_fallback: {self.use_simple_fallback}")
        print("🔍 RAGService.__init__: Initialization completed")
    
    def _load_embedding_model(self):
        """Lazy load the embedding model"""
        print(f"🔍 _load_embedding_model: Starting, _embedding_model_loaded={self._embedding_model_loaded}")
        if not self._embedding_model_loaded:
            print("🔍 _load_embedding_model: Model not loaded, loading now...")
            global SentenceTransformer
            if SentenceTransformer is None:
                print("🔍 _load_embedding_model: SentenceTransformer is None, importing...")
                try:
                    from sentence_transformers import SentenceTransformer
                    print("✅ _load_embedding_model: SentenceTransformer imported successfully")
                except ImportError as e:
                    print(f"❌ _load_embedding_model: Failed to import SentenceTransformer: {e}")
                    raise ImportError(f"sentence-transformers not available: {e}")
            
            print(f"🔍 _load_embedding_model: Creating SentenceTransformer with model: {settings.EMBEDDING_MODEL}")
            try:
                self.embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
                print("✅ _load_embedding_model: SentenceTransformer created successfully")
                self._embedding_model_loaded = True
                print("✅ _load_embedding_model: Model loaded and ready")
            except Exception as e:
                print(f"❌ _load_embedding_model: Failed to create SentenceTransformer: {e}")
                import traceback
                traceback.print_exc()
                raise
        else:
            print("🔍 _load_embedding_model: Model already loaded, skipping")
    
    def _load_faiss_collections(self):
        """Load FAISS collections from disk"""
        print(f"🔍 Loading FAISS collections from: {self.faiss_collection_path}")
        if os.path.exists(self.faiss_collection_path):
            try:
                print("🔍 FAISS collections file exists, loading...")
                with open(self.faiss_collection_path, 'rb') as f:
                    data = pickle.load(f)
                    if isinstance(data, dict) and 'collections' in data:
                        # New format with metadata
                        self.faiss_collections = data['collections']
                        self.faiss_collection_metadata = data.get('metadata', {})
                        print(f"✅ Loaded {len(self.faiss_collections)} FAISS collections (new format)")
                    else:
                        # Old format - just collections
                        self.faiss_collections = data
                        self.faiss_collection_metadata = {}
                        print(f"✅ Loaded {len(self.faiss_collections)} FAISS collections (old format)")
            except Exception as e:
                print(f"⚠️  Failed to load FAISS collections: {e}")
                import traceback
                traceback.print_exc()
                self.faiss_collections = {}
                self.faiss_collection_metadata = {}
        else:
            print("🔍 No existing FAISS collections file found, starting fresh")
            self.faiss_collections = {}
            self.faiss_collection_metadata = {}
    
    def _save_faiss_collections(self):
        """Save FAISS collections to disk"""
        try:
            os.makedirs(os.path.dirname(self.faiss_collection_path), exist_ok=True)
            data = {
                'collections': self.faiss_collections,
                'metadata': self.faiss_collection_metadata
            }
            with open(self.faiss_collection_path, 'wb') as f:
                pickle.dump(data, f)
        except Exception as e:
            print(f"⚠️  Failed to save FAISS collections: {e}")
    
    def _create_faiss_index(self, dimension: int):
        """Create a new FAISS index"""
        return faiss.IndexFlatIP(dimension)  # Inner product for cosine similarity
    
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
        print(f"🔍 process_document: Starting with file_path={file_path}, collection_name={collection_name}")
        print(f"🔍 process_document: chroma_client is None: {self.chroma_client is None}")
        print(f"🔍 process_document: FAISS_AVAILABLE={FAISS_AVAILABLE}")
        print(f"🔍 process_document: faiss_collections count: {len(self.faiss_collections)}")
        
        # Check if ChromaDB is available, if not use FAISS fallback
        if self.chroma_client is None:
            print("🔍 process_document: ChromaDB is None, checking FAISS availability...")
            if not FAISS_AVAILABLE:
                print("🔍 process_document: FAISS not available, checking simple fallback...")
                if self.use_simple_fallback:
                    print("🔍 process_document: Using simple in-memory fallback")
                    return await self._process_document_simple(file_path, collection_name, chunk_size, chunk_overlap, description, tags, is_public)
                else:
                    print("❌ process_document: Neither ChromaDB nor FAISS is available")
                    raise RuntimeError("Neither ChromaDB nor FAISS is available. RAG functionality is disabled.")
            else:
                print("🔍 process_document: Using FAISS fallback")
                # Use FAISS fallback
                return await self._process_document_faiss(file_path, collection_name, chunk_size, chunk_overlap, description, tags, is_public)
        
        print("🔍 process_document: Using ChromaDB")
        
        # Extract text from document
        print("🔍 process_document: Extracting text from document...")
        text = await self._extract_text(file_path)
        print(f"🔍 process_document: Extracted text length: {len(text)}")
        
        # Split text into chunks
        print("🔍 process_document: Splitting text into chunks...")
        chunks = self._split_text(text, chunk_size, chunk_overlap)
        print(f"🔍 process_document: Created {len(chunks)} chunks")
        
        # Create or get collection with metadata
        print("🔍 process_document: Creating collection metadata...")
        collection_metadata = {
            "description": description or f"Collection for {os.path.basename(file_path)}",
            "tags": json.dumps(tags or []),  # Convert list to JSON string
            "is_public": is_public,
            "created_at": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat()
        }
        
        print(f"🔍 process_document: Getting or creating collection '{collection_name}'...")
        collection = self.chroma_client.get_or_create_collection(
            name=collection_name,
            metadata=collection_metadata
        )
        print("🔍 process_document: Collection retrieved successfully")
        
        # Generate embeddings and add to collection
        print("🔍 process_document: Loading embedding model...")
        self._load_embedding_model()
        print("🔍 process_document: Generating embeddings...")
        embeddings = self.embedding_model.encode(chunks)
        print(f"🔍 process_document: Generated embeddings shape: {embeddings.shape}")
        
        # Prepare documents for insertion
        print("🔍 process_document: Preparing documents for insertion...")
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
        print("🔍 process_document: Adding documents to collection...")
        collection.add(
            documents=documents,
            embeddings=embeddings.tolist(),
            metadatas=metadatas,
            ids=ids
        )
        print("🔍 process_document: Documents added successfully")
        
        result = {
            "collection_name": collection_name,
            "document_name": os.path.basename(file_path),
            "chunks_processed": len(chunks),
            "collection_size": collection.count()
        }
        print(f"🔍 process_document: Returning result: {result}")
        return result
    
    async def _process_document_faiss(self, file_path: str, collection_name: str, 
                                     chunk_size: int = 1000, chunk_overlap: int = 200,
                                     description: str = None, tags: List[str] = None, 
                                     is_public: bool = False) -> Dict[str, Any]:
        """Process document using FAISS fallback"""
        print(f"🔍 _process_document_faiss: Starting with file_path={file_path}, collection_name={collection_name}")
        
        # Extract text from document
        print("🔍 _process_document_faiss: Extracting text from document...")
        text = await self._extract_text(file_path)
        print(f"🔍 _process_document_faiss: Extracted text length: {len(text)}")
        
        # Split text into chunks
        print("🔍 _process_document_faiss: Splitting text into chunks...")
        chunks = self._split_text(text, chunk_size, chunk_overlap)
        print(f"🔍 _process_document_faiss: Created {len(chunks)} chunks")
        
        # Load embedding model
        print("🔍 _process_document_faiss: Loading embedding model...")
        self._load_embedding_model()
        print("🔍 _process_document_faiss: Generating embeddings...")
        embeddings = self.embedding_model.encode(chunks)
        print(f"🔍 _process_document_faiss: Generated embeddings shape: {embeddings.shape}")
        
        # Initialize collection if it doesn't exist
        print(f"🔍 _process_document_faiss: Checking if collection '{collection_name}' exists...")
        if collection_name not in self.faiss_collections:
            print(f"🔍 _process_document_faiss: Collection '{collection_name}' does not exist, creating new collection...")
            dimension = embeddings.shape[1]
            print(f"🔍 _process_document_faiss: Creating FAISS index with dimension {dimension}")
            self.faiss_collections[collection_name] = {
                'index': self._create_faiss_index(dimension),
                'documents': [],
                'metadatas': [],
                'ids': []
            }
            self.faiss_collection_metadata[collection_name] = {
                "description": description or f"Collection for {os.path.basename(file_path)}",
                "tags": tags or [],
                "is_public": is_public,
                "created_at": datetime.now().isoformat(),
                "last_updated": datetime.now().isoformat()
            }
            print(f"🔍 _process_document_faiss: Created new collection '{collection_name}'")
        else:
            print(f"🔍 _process_document_faiss: Collection '{collection_name}' already exists")
        
        # Add documents to collection
        print("🔍 _process_document_faiss: Adding documents to collection...")
        collection = self.faiss_collections[collection_name]
        start_idx = len(collection['documents'])
        print(f"🔍 _process_document_faiss: Starting at index {start_idx}")
        
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            doc_id = str(uuid.uuid4())
            collection['documents'].append(chunk)
            collection['metadatas'].append({
                "source": os.path.basename(file_path),
                "chunk_index": i,
                "chunk_size": len(chunk)
            })
            collection['ids'].append(doc_id)
        
        print(f"🔍 _process_document_faiss: Added {len(chunks)} documents to collection")
        
        # Add embeddings to FAISS index
        print("🔍 _process_document_faiss: Adding embeddings to FAISS index...")
        collection['index'].add(embeddings.astype('float32'))
        print("🔍 _process_document_faiss: Embeddings added to FAISS index")
        
        # Update metadata
        print("🔍 _process_document_faiss: Updating collection metadata...")
        self.faiss_collection_metadata[collection_name]["last_updated"] = datetime.now().isoformat()
        
        # Save collections
        print("🔍 _process_document_faiss: Saving collections to disk...")
        self._save_faiss_collections()
        print("🔍 _process_document_faiss: Collections saved successfully")
        
        result = {
            "collection_name": collection_name,
            "document_name": os.path.basename(file_path),
            "chunks_processed": len(chunks),
            "collection_size": len(collection['documents'])
        }
        print(f"🔍 _process_document_faiss: Returning result: {result}")
        return result
    
    async def _process_document_simple(self, file_path: str, collection_name: str, 
                                      chunk_size: int = 1000, chunk_overlap: int = 200,
                                      description: str = None, tags: List[str] = None, 
                                      is_public: bool = False) -> Dict[str, Any]:
        """Process document using simple in-memory fallback (no vector similarity)"""
        print(f"🔍 _process_document_simple: Starting with file_path={file_path}, collection_name={collection_name}")
        
        # Extract text from document
        print("🔍 _process_document_simple: Extracting text from document...")
        text = await self._extract_text(file_path)
        print(f"🔍 _process_document_simple: Extracted text length: {len(text)}")
        
        # Split text into chunks
        print("🔍 _process_document_simple: Splitting text into chunks...")
        chunks = self._split_text(text, chunk_size, chunk_overlap)
        print(f"🔍 _process_document_simple: Created {len(chunks)} chunks")
        
        # Initialize collection if it doesn't exist
        print(f"🔍 _process_document_simple: Checking if collection '{collection_name}' exists...")
        if collection_name not in self.simple_collections:
            print(f"🔍 _process_document_simple: Collection '{collection_name}' does not exist, creating new collection...")
            self.simple_collections[collection_name] = {
                'documents': [],
                'metadatas': [],
                'ids': []
            }
            self.simple_collection_metadata[collection_name] = {
                "description": description or f"Collection for {os.path.basename(file_path)}",
                "tags": tags or [],
                "is_public": is_public,
                "created_at": datetime.now().isoformat(),
                "last_updated": datetime.now().isoformat()
            }
            print(f"🔍 _process_document_simple: Created new collection '{collection_name}'")
        else:
            print(f"🔍 _process_document_simple: Collection '{collection_name}' already exists")
        
        # Add documents to collection
        print("🔍 _process_document_simple: Adding documents to collection...")
        collection = self.simple_collections[collection_name]
        start_idx = len(collection['documents'])
        print(f"🔍 _process_document_simple: Starting at index {start_idx}")
        
        for i, chunk in enumerate(chunks):
            doc_id = str(uuid.uuid4())
            collection['documents'].append(chunk)
            collection['metadatas'].append({
                "source": os.path.basename(file_path),
                "chunk_index": i,
                "chunk_size": len(chunk)
            })
            collection['ids'].append(doc_id)
        
        print(f"🔍 _process_document_simple: Added {len(chunks)} documents to collection")
        
        # Update metadata
        print("🔍 _process_document_simple: Updating collection metadata...")
        self.simple_collection_metadata[collection_name]["last_updated"] = datetime.now().isoformat()
        
        result = {
            "collection_name": collection_name,
            "document_name": os.path.basename(file_path),
            "chunks_processed": len(chunks),
            "collection_size": len(collection['documents'])
        }
        print(f"🔍 _process_document_simple: Returning result: {result}")
        return result
    
    async def query_rag(self, request: RAGRequest) -> RAGResponse:
        """Query RAG system with document retrieval and generation"""
        print(f"🔍 RAG Service Debug: Starting query_rag method")
        print(f"🔍 query_rag: chroma_client is None: {self.chroma_client is None}")
        print(f"🔍 query_rag: FAISS_AVAILABLE={FAISS_AVAILABLE}")
        print(f"🔍 query_rag: use_simple_fallback={self.use_simple_fallback}")
        
        # Check if ChromaDB is available, if not use FAISS fallback
        if self.chroma_client is None:
            print("🔍 query_rag: ChromaDB is None, checking FAISS availability...")
            if not FAISS_AVAILABLE:
                print("🔍 query_rag: FAISS not available, checking simple fallback...")
                if self.use_simple_fallback:
                    print("🔍 query_rag: Using simple in-memory fallback")
                    return await self._query_rag_simple(request)
                else:
                    print("❌ query_rag: Neither ChromaDB nor FAISS is available")
                    raise RuntimeError("Neither ChromaDB nor FAISS is available. RAG functionality is disabled.")
            else:
                print("🔍 query_rag: Using FAISS fallback")
                # Use FAISS fallback
                return await self._query_rag_faiss(request)
        
        print("🔍 query_rag: Using ChromaDB")
        
        # Get collection
        try:
            print(f"🔍 RAG Service Debug: Getting collection '{request.collection_name}'")
            collection = self.chroma_client.get_collection(request.collection_name)
            print(f"🔍 RAG Service Debug: Collection retrieved successfully")
        except Exception as e:
            print(f"❌ RAG Service Error: Failed to get collection: {e}")
            raise ValueError(f"Collection '{request.collection_name}' not found: {str(e)}")
        
        # Query collection
        try:
            print(f"🔍 RAG Service Debug: Loading embedding model")
            self._load_embedding_model()
            print(f"🔍 RAG Service Debug: Generating query embedding")
            query_embedding = self.embedding_model.encode([request.query])
            print(f"🔍 RAG Service Debug: Querying collection with {request.top_k} results")
            results = collection.query(
                query_embeddings=query_embedding.tolist(),
                n_results=request.top_k,
                include=["documents", "metadatas", "distances"]
            )
            print(f"🔍 RAG Service Debug: Collection query successful, found {len(results['documents'][0])} documents")
        except Exception as e:
            print(f"❌ RAG Service Error: Failed to query collection: {e}")
            raise e
        
        # Prepare retrieved documents
        try:
            print(f"🔍 RAG Service Debug: Preparing retrieved documents")
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
            print(f"🔍 RAG Service Debug: Prepared {len(retrieved_docs)} documents")
        except Exception as e:
            print(f"❌ RAG Service Error: Failed to prepare documents: {e}")
            raise e
        
        # Create context from retrieved documents (limit to ~300 tokens to leave room for prompt)
        try:
            print(f"🔍 RAG Service Debug: Creating context from documents")
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
            print(f"🔍 RAG Service Debug: Context created with {len(context)} characters")
        except Exception as e:
            print(f"❌ RAG Service Error: Failed to create context: {e}")
            raise e
        
        # Generate response using model
        try:
            print(f"🔍 RAG Service Debug: Creating prompt for model")
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
            print(f"🔍 RAG Service Debug: Calling model service with model: {request.model_name}")
            
            model_response = await model_service.generate_response(model_request)
            print(f"🔍 RAG Service Debug: Model response received successfully")
            answer = model_response.text if model_response.text.strip() else "I found relevant information in the document, but I'm having trouble generating a detailed response. Please try rephrasing your question."
        except Exception as e:
            print(f"❌ RAG Service Error: Model generation failed: {e}")
            import traceback
            traceback.print_exc()
            answer = "I found relevant information in the document, but encountered an error while generating the response. Please try again."
        
        # Create RAGResponse
        try:
            print(f"🔍 RAG Service Debug: Creating RAGResponse object")
            rag_response = RAGResponse(
                query=request.query,
                answer=answer,
                retrieved_documents=retrieved_docs,
                model_response=ModelResponse(
                    text=answer,
                    model_name=request.model_name or "unknown",
                    provider=request.provider or "huggingface",
                    tokens_used=model_response.tokens_used,
                    input_tokens=model_response.input_tokens,
                    output_tokens=model_response.output_tokens,
                    latency_ms=model_response.latency_ms,
                    finish_reason=model_response.finish_reason
                )
            )
            print(f"🔍 RAG Service Debug: RAGResponse created successfully")
            return rag_response
        except Exception as e:
            print(f"❌ RAG Service Error: Failed to create RAGResponse: {e}")
            import traceback
            traceback.print_exc()
            raise e
    
    async def _query_rag_faiss(self, request: RAGRequest) -> RAGResponse:
        """Query RAG system using FAISS fallback"""
        print(f"🔍 RAG Service Debug: Starting _query_rag_faiss method")
        
        # Get collection
        if request.collection_name not in self.faiss_collections:
            raise ValueError(f"Collection '{request.collection_name}' not found in FAISS collections.")
        
        collection = self.faiss_collections[request.collection_name]
        
        # Query collection
        try:
            print(f"🔍 RAG Service Debug: Loading embedding model")
            self._load_embedding_model()
            print(f"🔍 RAG Service Debug: Generating query embedding")
            query_embedding = self.embedding_model.encode([request.query])
            print(f"🔍 RAG Service Debug: Querying FAISS collection with {request.top_k} results")
            
            # Search in FAISS index
            distances, indices = collection['index'].search(query_embedding.astype('float32'), k=request.top_k)
            print(f"🔍 RAG Service Debug: FAISS query successful, found {len(indices[0])} documents")
        except Exception as e:
            print(f"❌ RAG Service Error: Failed to query FAISS collection: {e}")
            raise e
        
        # Prepare retrieved documents
        try:
            print(f"🔍 RAG Service Debug: Preparing retrieved documents")
            retrieved_docs = []
            for i, (idx, distance) in enumerate(zip(indices[0], distances[0])):
                if idx < len(collection['documents']):
                    retrieved_docs.append({
                        "text": collection['documents'][idx],
                        "metadata": collection['metadatas'][idx] if idx < len(collection['metadatas']) else {},
                        "similarity_score": 1 - distance,  # Convert distance to similarity
                        "rank": i + 1
                    })
            print(f"🔍 RAG Service Debug: Prepared {len(retrieved_docs)} documents")
        except Exception as e:
            print(f"❌ RAG Service Error: Failed to prepare documents: {e}")
            raise e
        
        # Create context from retrieved documents (limit to ~300 tokens to leave room for prompt)
        try:
            print(f"🔍 RAG Service Debug: Creating context from documents")
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
            print(f"🔍 RAG Service Debug: Context created with {len(context)} characters")
        except Exception as e:
            print(f"❌ RAG Service Error: Failed to create context: {e}")
            raise e
        
        # Generate response using model
        try:
            print(f"🔍 RAG Service Debug: Creating prompt for model")
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
            print(f"🔍 RAG Service Debug: Calling model service with model: {request.model_name}")
            
            model_response = await model_service.generate_response(model_request)
            print(f"🔍 RAG Service Debug: Model response received successfully")
            answer = model_response.text if model_response.text.strip() else "I found relevant information in the document, but I'm having trouble generating a detailed response. Please try rephrasing your question."
        except Exception as e:
            print(f"❌ RAG Service Error: Model generation failed: {e}")
            import traceback
            traceback.print_exc()
            answer = "I found relevant information in the document, but encountered an error while generating the response. Please try again."
        
        # Create RAGResponse
        try:
            print(f"🔍 RAG Service Debug: Creating RAGResponse object")
            rag_response = RAGResponse(
                query=request.query,
                answer=answer,
                retrieved_documents=retrieved_docs,
                model_response=ModelResponse(
                    text=answer,
                    model_name=request.model_name or "unknown",
                    provider=request.provider or "huggingface",
                    tokens_used=model_response.tokens_used,
                    input_tokens=model_response.input_tokens,
                    output_tokens=model_response.output_tokens,
                    latency_ms=model_response.latency_ms,
                    finish_reason=model_response.finish_reason
                )
            )
            print(f"🔍 RAG Service Debug: RAGResponse created successfully")
            return rag_response
        except Exception as e:
            print(f"❌ RAG Service Error: Failed to create RAGResponse: {e}")
            import traceback
            traceback.print_exc()
            raise e
    
    async def _query_rag_simple(self, request: RAGRequest) -> RAGResponse:
        """Query RAG system using simple in-memory fallback"""
        print(f"🔍 RAG Service Debug: Starting _query_rag_simple method")
        
        # Get collection
        if request.collection_name not in self.simple_collections:
            raise ValueError(f"Collection '{request.collection_name}' not found in simple collections.")
        
        collection = self.simple_collections[request.collection_name]
        
        # Query collection
        try:
            print(f"�� RAG Service Debug: Using keyword-based search (no embedding model needed)")
            print(f"🔍 RAG Service Debug: Querying simple collection with {request.top_k} results")
            
            # Simple keyword-based search
            retrieved_docs = []
            query_terms = request.query.lower().split()
            scored_docs = []
            
            for i, doc in enumerate(collection['documents']):
                doc_lower = doc.lower()
                score = 0
                for term in query_terms:
                    if term in doc_lower:
                        score += 1
                if score > 0:  # Only include documents that match at least one term
                    scored_docs.append((i, score, doc))
            
            # Sort by score (highest first) and take top_k
            scored_docs.sort(key=lambda x: x[1], reverse=True)
            top_docs = scored_docs[:request.top_k]
            
            for rank, (doc_idx, score, doc) in enumerate(top_docs):
                retrieved_docs.append({
                    "text": doc,
                    "metadata": collection['metadatas'][doc_idx] if doc_idx < len(collection['metadatas']) else {},
                    "similarity_score": score / len(query_terms),  # Normalize score
                    "rank": rank + 1
                })
            
            # If no matches found, return first few documents
            if not retrieved_docs:
                print("🔍 RAG Service Debug: No keyword matches found, returning first few documents")
                for i in range(min(request.top_k, len(collection['documents']))):
                    retrieved_docs.append({
                        "text": collection['documents'][i],
                        "metadata": collection['metadatas'][i] if i < len(collection['metadatas']) else {},
                        "similarity_score": 0.1,  # Low score for non-matching docs
                        "rank": i + 1
                    })
            
            print(f"🔍 RAG Service Debug: Simple collection query successful, found {len(retrieved_docs)} documents")
        except Exception as e:
            print(f"❌ RAG Service Error: Failed to query simple collection: {e}")
            raise e
        
        # Create context from retrieved documents (limit to ~300 tokens to leave room for prompt)
        try:
            print(f"🔍 RAG Service Debug: Creating context from documents")
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
            print(f"🔍 RAG Service Debug: Context created with {len(context)} characters")
        except Exception as e:
            print(f"❌ RAG Service Error: Failed to create context: {e}")
            raise e
        
        # Generate response using model
        try:
            print(f"🔍 RAG Service Debug: Creating prompt for model")
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
            print(f"🔍 RAG Service Debug: Calling model service with model: {request.model_name}")
            
            model_response = await model_service.generate_response(model_request)
            print(f"🔍 RAG Service Debug: Model response received successfully")
            answer = model_response.text if model_response.text.strip() else "I found relevant information in the document, but I'm having trouble generating a detailed response. Please try rephrasing your question."
        except Exception as e:
            print(f"❌ RAG Service Error: Model generation failed: {e}")
            import traceback
            traceback.print_exc()
            answer = "I found relevant information in the document, but encountered an error while generating the response. Please try again."
        
        # Create RAGResponse
        try:
            print(f"🔍 RAG Service Debug: Creating RAGResponse object")
            rag_response = RAGResponse(
                query=request.query,
                answer=answer,
                retrieved_documents=retrieved_docs,
                model_response=ModelResponse(
                    text=answer,
                    model_name=request.model_name or "unknown",
                    provider=request.provider or "huggingface",
                    tokens_used=model_response.tokens_used,
                    input_tokens=model_response.input_tokens,
                    output_tokens=model_response.output_tokens,
                    latency_ms=model_response.latency_ms,
                    finish_reason=model_response.finish_reason
                )
            )
            print(f"🔍 RAG Service Debug: RAGResponse created successfully")
            return rag_response
        except Exception as e:
            print(f"❌ RAG Service Error: Failed to create RAGResponse: {e}")
            import traceback
            traceback.print_exc()
            raise e
    
    async def _extract_text(self, file_path: str) -> str:
        """Extract text from various document formats"""
        print(f"🔍 _extract_text: Starting extraction from {file_path}")
        file_ext = os.path.splitext(file_path)[1].lower()
        print(f"🔍 _extract_text: File extension: {file_ext}")
        
        if file_ext == '.pdf':
            print("🔍 _extract_text: Processing PDF file...")
            return await self._extract_pdf_text(file_path)
        elif file_ext in ['.txt', '.md']:
            print("🔍 _extract_text: Processing text file...")
            return await self._extract_text_file(file_path)
        else:
            print(f"❌ _extract_text: Unsupported file format: {file_ext}")
            raise ValueError(f"Unsupported file format: {file_ext}")
    
    async def _extract_pdf_text(self, file_path: str) -> str:
        """Extract text from PDF file"""
        if not PYMUPDF_AVAILABLE:
            raise ValueError("PDF processing not available - PyMuPDF not installed")
        
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
        """Extract text from text files"""
        print(f"🔍 _extract_text_file: Reading text file: {file_path}")
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
                print(f"🔍 _extract_text_file: Successfully read {len(text)} characters")
                return text
        except Exception as e:
            print(f"❌ _extract_text_file: Failed to read file: {e}")
            raise
    
    def list_collections(self) -> List[CollectionInfo]:
        """List all collections"""
        print("🔍 list_collections: Starting...")
        print(f"🔍 list_collections: chroma_client is None: {self.chroma_client is None}")
        print(f"🔍 list_collections: FAISS_AVAILABLE={FAISS_AVAILABLE}")
        
        # Check if ChromaDB is available, if not use FAISS fallback
        if self.chroma_client is None:
            print("🔍 list_collections: ChromaDB is None, checking FAISS availability...")
            if not FAISS_AVAILABLE:
                print("🔍 list_collections: FAISS not available, checking simple fallback...")
                if self.use_simple_fallback:
                    print("🔍 list_collections: Using simple in-memory fallback")
                    return self._list_collections_simple()
                else:
                    print("⚠️  list_collections: Neither ChromaDB nor FAISS available - returning empty collections list")
                    return []
            else:
                print("🔍 list_collections: Using FAISS fallback")
                # Use FAISS fallback
                return self._list_collections_faiss()
        
        print("🔍 list_collections: Using ChromaDB")
        try:
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
            print(f"🔍 list_collections: Found {len(collections)} ChromaDB collections")
            return collections
        except Exception as e:
            print(f"❌ list_collections: Error listing collections: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def _list_collections_faiss(self) -> List[CollectionInfo]:
        """List all collections using FAISS fallback"""
        try:
            collections = []
            for collection_name, metadata in self.faiss_collection_metadata.items():
                if collection_name in self.faiss_collections:
                    collection = self.faiss_collections[collection_name]
                    collections.append(CollectionInfo(
                        name=collection_name,
                        description=metadata.get("description"),
                        tags=metadata.get("tags", []),
                        document_count=1,  # Simplified - assume 1 document per collection
                        chunk_count=len(collection['documents']),
                        total_size_mb=None,  # TODO: Calculate actual size
                        created_at=metadata.get("created_at", datetime.now().isoformat()),
                        last_updated=metadata.get("last_updated", datetime.now().isoformat()),
                        last_queried=None,  # TODO: Track query timestamps
                        is_public=metadata.get("is_public", False),
                        owner=None  # TODO: Add user management
                    ))
            return collections
        except Exception as e:
            print(f"❌ Error listing FAISS collections: {e}")
            return []
    
    def _list_collections_simple(self) -> List[CollectionInfo]:
        """List all collections using simple in-memory fallback"""
        try:
            collections = []
            for collection_name, metadata in self.simple_collection_metadata.items():
                if collection_name in self.simple_collections:
                    collection = self.simple_collections[collection_name]
                    collections.append(CollectionInfo(
                        name=collection_name,
                        description=metadata.get("description"),
                        tags=metadata.get("tags", []),
                        document_count=len(collection['documents']),
                        chunk_count=len(collection['documents']), # Simple in-memory, no chunk count
                        total_size_mb=None, # No direct size calculation for simple fallback
                        created_at=metadata.get("created_at", datetime.now().isoformat()),
                        last_updated=metadata.get("last_updated", datetime.now().isoformat()),
                        last_queried=None, # No query tracking for simple fallback
                        is_public=metadata.get("is_public", False),
                        owner=None # No user management for simple fallback
                    ))
            return collections
        except Exception as e:
            print(f"❌ Error listing simple collections: {e}")
            return []
    
    def delete_collection(self, collection_name: str) -> bool:
        """Delete a collection"""
        # Check if ChromaDB is available, if not use FAISS fallback
        if self.chroma_client is None:
            if not FAISS_AVAILABLE:
                raise RuntimeError("Neither ChromaDB nor FAISS is available. RAG functionality is disabled.")
            else:
                # Use FAISS fallback
                return self._delete_collection_faiss(collection_name)
        
        try:
            self.chroma_client.delete_collection(collection_name)
            return True
        except Exception:
            return False
    
    def _delete_collection_faiss(self, collection_name: str) -> bool:
        """Delete a collection using FAISS fallback"""
        try:
            if collection_name in self.faiss_collections:
                del self.faiss_collections[collection_name]
            if collection_name in self.faiss_collection_metadata:
                del self.faiss_collection_metadata[collection_name]
            self._save_faiss_collections()
            return True
        except Exception as e:
            print(f"❌ Error deleting FAISS collection: {e}")
            return False
    
    def get_collection_stats(self, collection_name: str) -> Dict[str, Any]:
        """Get statistics for a collection"""
        # Check if ChromaDB is available, if not use FAISS fallback
        if self.chroma_client is None:
            if not FAISS_AVAILABLE:
                raise RuntimeError("Neither ChromaDB nor FAISS is available. RAG functionality is disabled.")
            else:
                # Use FAISS fallback
                return self._get_collection_stats_faiss(collection_name)
        
        try:
            collection = self.chroma_client.get_collection(collection_name)
            return {
                "name": collection_name,
                "document_count": collection.count(),
                "metadata": collection.metadata
            }
        except Exception as e:
            raise ValueError(f"Collection '{collection_name}' not found: {str(e)}")
    
    def _get_collection_stats_faiss(self, collection_name: str) -> Dict[str, Any]:
        """Get statistics for a collection using FAISS fallback"""
        try:
            if collection_name not in self.faiss_collections:
                raise ValueError(f"Collection '{collection_name}' not found in FAISS collections.")
            
            collection = self.faiss_collections[collection_name]
            metadata = self.faiss_collection_metadata.get(collection_name, {})
            
            return {
                "name": collection_name,
                "document_count": len(collection['documents']),
                "metadata": metadata
            }
        except Exception as e:
            raise ValueError(f"Collection '{collection_name}' not found: {str(e)}")

    def update_collection_metadata(self, collection_name: str, description: str = None, 
                                 tags: List[str] = None, is_public: bool = None) -> Dict[str, Any]:
        """Update collection metadata"""
        if self.chroma_client is None:
            raise RuntimeError("ChromaDB is not available. RAG functionality is disabled.")
        
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
        """Merge multiple collections into a target collection"""
        if self.chroma_client is None:
            raise RuntimeError("ChromaDB is not available. RAG functionality is disabled.")
        
        try:
            # Get target collection
            target_collection = self.chroma_client.get_collection(target_collection_name)
            
            # Merge each source collection
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
            
            return {
                "target_collection": target_collection_name,
                "source_collections": source_collection_names,
                "message": "Collections merged successfully"
            }
        except Exception as e:
            raise ValueError(f"Failed to merge collections: {str(e)}")

    def bulk_delete_collections(self, collection_names: List[str]) -> Dict[str, Any]:
        """Delete multiple collections"""
        if self.chroma_client is None:
            raise RuntimeError("ChromaDB is not available. RAG functionality is disabled.")
        
        deleted_count = 0
        failed_deletions = []
        
        for collection_name in collection_names:
            try:
                self.chroma_client.delete_collection(collection_name)
                deleted_count += 1
            except Exception as e:
                failed_deletions.append({"collection": collection_name, "error": str(e)})
        
        return {
            "deleted_count": deleted_count,
            "failed_deletions": failed_deletions,
            "total_requested": len(collection_names)
        }

    def export_collection(self, collection_name: str) -> Dict[str, Any]:
        """Export a collection's data"""
        if self.chroma_client is None:
            raise RuntimeError("ChromaDB is not available. RAG functionality is disabled.")
        
        try:
            collection = self.chroma_client.get_collection(collection_name)
            results = collection.get()
            
            return {
                "collection_name": collection_name,
                "documents": results.get('documents', []),
                "metadatas": results.get('metadatas', []),
                "ids": results.get('ids', []),
                "count": collection.count(),
                "metadata": collection.metadata
            }
        except Exception as e:
            raise ValueError(f"Failed to export collection: {str(e)}")

# Global RAG service instance
print("🔍 RAG Service: Creating global instance...")
rag_service = RAGService()
print("🔍 RAG Service: Global instance created successfully") 