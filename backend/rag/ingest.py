import os
import glob
from pathlib import Path
from typing import List, Dict, Any

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_core.documents import Document

try:
    from langchain_huggingface import HuggingFaceEmbeddings
except ImportError:
    from langchain_community.embeddings import HuggingFaceEmbeddings

try:
    from langchain_chroma import Chroma
except ImportError:
    from langchain_community.vectorstores import Chroma

from backend.config import (
    CHROMA_PERSIST_DIR,
    DATA_DIR,
    EMBEDDING_MODEL_NAME
)

def get_embedding_function():
    """Initializes and returns the HuggingFace embedding function."""
    return HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL_NAME,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True}
    )

def load_all_documents(data_dir: Path) -> List[Document]:
    """
    Loads all PDF, TXT, and Markdown documents from the disaster documents directory.
    """
    docs: List[Document] = []
    if not data_dir.exists():
        data_dir.mkdir(parents=True, exist_ok=True)
        print(f"[RAG Ingest] Created data directory at {data_dir}")
        return docs

    # Supported document extensions
    supported_extensions = ["*.pdf", "*.txt", "*.md"]
    found_files = []

    for ext in supported_extensions:
        found_files.extend(list(data_dir.glob(ext)))
        found_files.extend(list(data_dir.glob(f"**/{ext}")))

    # Deduplicate paths
    unique_files = list(dict.fromkeys(found_files))

    if not unique_files:
        print(f"[RAG Ingest] No documents found in {data_dir}. Place PDFs or text files there.")
        return docs

    print(f"[RAG Ingest] Found {len(unique_files)} document(s) to process.")

    for file_path in unique_files:
        try:
            if file_path.suffix.lower() == ".pdf":
                loader = PyPDFLoader(str(file_path))
                loaded = loader.load()
                print(f"  [OK] Loaded PDF: {file_path.name} ({len(loaded)} pages)")
                docs.extend(loaded)
            elif file_path.suffix.lower() in [".txt", ".md"]:
                loader = TextLoader(str(file_path), encoding="utf-8")
                loaded = loader.load()
                print(f"  [OK] Loaded Text file: {file_path.name}")
                docs.extend(loaded)
        except Exception as e:
            print(f"  [FAIL] Error loading {file_path.name}: {str(e)}")

    return docs

def ingest_disaster_documents() -> Dict[str, Any]:
    """
    Reads local disaster documents, chunks them, computes Hugging Face embeddings,
    and stores them persistently in ChromaDB.
    """
    data_path = Path(DATA_DIR)
    raw_docs = load_all_documents(data_path)

    if not raw_docs:
        return {
            "status": "warning",
            "message": f"No documents found in {data_path}. Added 0 documents to vector store.",
            "total_documents": 0,
            "total_chunks": 0
        }

    # Split documents into overlapping semantic chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
        separators=["\n\n", "\n", " ", ""]
    )
    chunks = text_splitter.split_documents(raw_docs)
    print(f"[RAG Ingest] Split {len(raw_docs)} document(s) into {len(chunks)} chunks.")

    # Generate Embeddings & Store in ChromaDB
    embeddings = get_embedding_function()
    
    # Ensure persistence folder exists
    os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)

    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=CHROMA_PERSIST_DIR,
        collection_name="disaster_management_docs"
    )

    # In Chroma 0.4+, persistence is handled automatically, but call persist() if exists
    if hasattr(vectorstore, "persist"):
        vectorstore.persist()

    print(f"[RAG Ingest] Successfully indexed {len(chunks)} chunks into ChromaDB at {CHROMA_PERSIST_DIR}")

    return {
        "status": "success",
        "message": f"Successfully ingested {len(raw_docs)} file(s) into {len(chunks)} vector chunks.",
        "total_documents": len(raw_docs),
        "total_chunks": len(chunks),
        "persist_directory": CHROMA_PERSIST_DIR
    }

if __name__ == "__main__":
    print("==================================================")
    print(" WeatherGPT - ChromaDB RAG Document Ingestion")
    print("==================================================")
    result = ingest_disaster_documents()
    print(f"Result: {result}")
