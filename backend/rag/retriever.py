import os
from typing import Optional
from langchain_core.tools import tool

try:
    from langchain_huggingface import HuggingFaceEmbeddings
except ImportError:
    from langchain_community.embeddings import HuggingFaceEmbeddings

try:
    from langchain_chroma import Chroma
except ImportError:
    from langchain_community.vectorstores import Chroma

from backend.config import CHROMA_PERSIST_DIR, EMBEDDING_MODEL_NAME
from backend.rag.ingest import ingest_disaster_documents, get_embedding_function

_vectorstore_instance: Optional[Chroma] = None

def get_vectorstore() -> Chroma:
    """
    Returns an initialized Chroma vectorstore. If the vector store does not exist,
    triggers document ingestion automatically from the disaster documents folder.
    """
    global _vectorstore_instance
    if _vectorstore_instance is not None:
        return _vectorstore_instance

    embeddings = get_embedding_function()

    # Check if database directory exists and has files
    if not os.path.exists(CHROMA_PERSIST_DIR) or not os.listdir(CHROMA_PERSIST_DIR):
        print("[RAG Retriever] ChromaDB directory empty. Running initial ingestion...")
        ingest_disaster_documents()

    _vectorstore_instance = Chroma(
        persist_directory=CHROMA_PERSIST_DIR,
        embedding_function=embeddings,
        collection_name="disaster_management_docs"
    )
    return _vectorstore_instance

def get_disaster_retriever(k: int = 4):
    """Returns a retriever interface for Chroma vectorstore with top-k results."""
    vectorstore = get_vectorstore()
    return vectorstore.as_retriever(search_kwargs={"k": k})

@tool
def search_disaster_guidelines(query: str) -> str:
    """
    Search official disaster management documents and emergency preparedness guidelines.
    Use this tool whenever a user asks about:
    - Flood safety protocols, waterlogging, or flash flood evacuation
    - Cyclone, typhoon, or hurricane emergency procedures
    - Earthquake response ("Drop, Cover, Hold on")
    - Severe heatwave safety and heatstroke prevention
    - Emergency supply kits, 72-hour survival essentials, and family safety plans
    - Emergency rescue hotlines, disaster helpline numbers, or first-aid protocols.
    
    Args:
        query: Specific disaster or emergency topic to search (e.g. 'flood evacuation steps', 'cyclone kit essentials').
    """
    try:
        retriever = get_disaster_retriever(k=4)
        docs = retriever.invoke(query)

        if not docs:
            return "No specific disaster guidelines found matching this query in the local knowledge base."

        results = []
        for i, doc in enumerate(docs, 1):
            source = doc.metadata.get("source", "Disaster Manual")
            page = doc.metadata.get("page", None)
            loc = f" (Page {page + 1})" if page is not None else ""
            cleaned_content = doc.page_content.strip()
            results.append(f"[Excerpt {i} from {os.path.basename(source)}{loc}]:\n{cleaned_content}")

        return "\n\n".join(results)
    except Exception as e:
        return f"Error retrieving disaster management guidelines: {str(e)}"
