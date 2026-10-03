import os
from pathlib import Path
from dotenv import load_dotenv

# Base directories
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent

# Load .env from backend or root if present
dotenv_paths = [
    PROJECT_ROOT / ".env",
    BACKEND_DIR / ".env"
]

for p in dotenv_paths:
    if p.exists():
        load_dotenv(dotenv_path=p, override=True)
        break
else:
    load_dotenv()  # Fallback to system env / default search

# Environment Variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip()

# ChromaDB and Data Paths
CHROMA_PERSIST_DIR = os.getenv(
    "CHROMA_PERSIST_DIR",
    str(BACKEND_DIR / "chroma_db")
)
if not os.path.isabs(CHROMA_PERSIST_DIR):
    CHROMA_PERSIST_DIR = str(BACKEND_DIR / CHROMA_PERSIST_DIR)

DATA_DIR = BACKEND_DIR / "data" / "disaster_docs"

# Hugging Face Embedding Model
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# Supabase Storage & Database Settings
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY", os.getenv("SUPABASE_ANON_KEY", os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""))).strip()
SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "weathergpt-storage").strip()
