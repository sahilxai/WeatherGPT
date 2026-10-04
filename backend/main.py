import os
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.config import GROQ_API_KEY, WEATHER_API_KEY, GROQ_MODEL, DATA_DIR, CHROMA_PERSIST_DIR, SUPABASE_URL, SUPABASE_STORAGE_BUCKET
from backend.agent import execute_agent_query
from backend.rag.ingest import ingest_disaster_documents
from backend.tools.weather import get_live_weather, get_last_location
from backend.services.supabase_service import supabase_service

import sys
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Initialize FastAPI Application
app = FastAPI(
    title="WeatherGPT API",
    description="Real-time Meteorological Intelligence & Disaster Management AI Agent",
    version="1.0.0"
)

# Enable CORS for frontend connectivity across all environments (Vercel, Render, local)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Request & Response Schemas
# -----------------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the message author: 'user' or 'assistant'")
    content: str = Field(..., description="Message text")

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User prompt or question")
    chat_history: Optional[List[ChatMessage]] = Field(
        default=[],
        description="Previous conversation turns for context"
    )

class LocationInfo(BaseModel):
    city: str
    country: Optional[str] = ""
    lat: float
    lon: float
    temp: Optional[Any] = None
    feels_like: Optional[Any] = None
    condition: Optional[str] = None
    description: Optional[str] = None
    humidity: Optional[Any] = None
    wind_speed: Optional[Any] = None
    warnings: Optional[List[str]] = []

class ChatResponse(BaseModel):
    response: str
    tools_used: List[str]
    status: str
    location: Optional[LocationInfo] = None

class IngestResponse(BaseModel):
    status: str
    message: str
    total_documents: int
    total_chunks: int

class ReportPayload(BaseModel):
    session_id: Optional[str] = "default_session"
    preparedness_score: int
    total_queries: int
    disaster_queries: int
    unique_cities: Optional[List[str]] = []
    all_warnings: Optional[List[str]] = []
    report_metadata: Optional[Dict[str, Any]] = {}

# -----------------------------------------------------------------------------
# API Endpoints
# -----------------------------------------------------------------------------
@app.get("/", tags=["General"])
async def root():
    """Root endpoint providing system overview and status."""
    return {
        "name": "WeatherGPT API",
        "version": "1.0.0",
        "status": "online",
        "description": "AI Agent combining real-time weather data and disaster management RAG",
        "endpoints": {
            "chat": "POST /api/chat",
            "health": "GET /health",
            "ingest": "POST /api/ingest",
            "weather_test": "GET /api/weather/{city}",
            "supabase_status": "GET /api/supabase/status",
            "supabase_upload": "POST /api/supabase/storage/upload",
            "supabase_files": "GET /api/supabase/storage/files",
            "supabase_reports": "GET/POST /api/supabase/reports"
        }
    }

@app.get("/health", tags=["General"])
@app.get("/docs/health", include_in_schema=False)
@app.get("/api/health", include_in_schema=False)
async def health_check():
    """Health check endpoint validating API configurations."""
    groq_ready = bool(GROQ_API_KEY and GROQ_API_KEY != "your_groq_api_key_here")
    weather_ready = bool(WEATHER_API_KEY and WEATHER_API_KEY != "your_openweathermap_api_key_here")
    supabase_ready = supabase_service.is_configured
    vector_db_ready = os.path.exists(CHROMA_PERSIST_DIR) and bool(os.listdir(CHROMA_PERSIST_DIR))

    return {
        "status": "healthy",
        "groq_configured": groq_ready,
        "weather_api_configured": weather_ready,
        "supabase_configured": supabase_ready,
        "vector_db_indexed": vector_db_ready,
        "active_model": GROQ_MODEL,
        "disaster_docs_path": str(DATA_DIR)
    }

@app.post("/api/chat", response_model=ChatResponse, tags=["Agent"])
@app.post("/docs/api/chat", response_model=ChatResponse, include_in_schema=False)
@app.post("/api/api/chat", response_model=ChatResponse, include_in_schema=False)
async def chat_with_agent(payload: ChatRequest):
    """
    Primary endpoint for frontend communication.
    Receives user query, routes dynamically to OpenWeatherMap tool or ChromaDB RAG,
    and returns AI synthesized response with geographic coordinates for Leaflet map animation.
    """
    try:
        history = [msg.model_dump() for msg in payload.chat_history] if payload.chat_history else []
        result = execute_agent_query(payload.message, history)
        
        loc_data = None
        if result.get("location"):
            loc = result["location"]
            loc_data = LocationInfo(
                city=loc.get("city", "Unknown"),
                country=loc.get("country", ""),
                lat=loc.get("lat", 0.0),
                lon=loc.get("lon", 0.0),
                temp=loc.get("temp"),
                feels_like=loc.get("feels_like"),
                condition=loc.get("condition"),
                description=loc.get("description"),
                humidity=loc.get("humidity"),
                wind_speed=loc.get("wind_speed"),
                warnings=loc.get("warnings", [])
            )

        # Non-blocking Supabase logging if configured
        if supabase_service.is_configured:
            try:
                supabase_service.log_chat_interaction(
                    role="user",
                    content=payload.message
                )
                supabase_service.log_chat_interaction(
                    role="assistant",
                    content=result.get("response", ""),
                    tools_used=result.get("tools_used", []),
                    location=result.get("location")
                )
                if result.get("location"):
                    supabase_service.log_weather_search(result["location"])
            except Exception:
                pass

        return ChatResponse(
            response=result["response"],
            tools_used=result["tools_used"],
            status=result["status"],
            location=loc_data
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent execution error: {str(e)}"
        )

@app.post("/api/ingest", response_model=IngestResponse, tags=["RAG"])
async def trigger_ingestion():
    """Triggers on-demand re-indexing of all disaster management documents into ChromaDB."""
    try:
        result = ingest_disaster_documents()
        return IngestResponse(
            status=result.get("status", "success"),
            message=result.get("message", ""),
            total_documents=result.get("total_documents", 0),
            total_chunks=result.get("total_chunks", 0)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion error: {str(e)}"
        )

@app.get("/api/weather/{city_name}", tags=["Tools"])
async def direct_weather_check(city_name: str):
    """Direct diagnostic endpoint to test the OpenWeatherMap tool for any city."""
    res = get_live_weather.invoke({"city_name": city_name})
    return {
        "city": city_name,
        "result": res,
        "location": get_last_location()
    }

# -----------------------------------------------------------------------------
# Supabase Cloud Storage & Database Endpoints
# -----------------------------------------------------------------------------
@app.get("/api/supabase/status", tags=["Supabase"])
async def get_supabase_status():
    """Returns Supabase connection status and active bucket."""
    return {
        "configured": supabase_service.is_configured,
        "project_url": supabase_service.url if supabase_service.is_configured else None,
        "storage_bucket": supabase_service.bucket_name
    }

@app.post("/api/supabase/storage/upload", tags=["Supabase"])
async def upload_document_to_supabase(
    file: UploadFile = File(...),
    auto_ingest: bool = Form(True)
):
    """
    Uploads a document (PDF, TXT, MD) to Supabase Storage bucket.
    Optionally copies to local disaster_docs and triggers ChromaDB vector indexing.
    """
    try:
        content = await file.read()
        res = supabase_service.upload_file(
            file_bytes=content,
            file_name=file.filename,
            content_type=file.content_type or "application/octet-stream",
            sync_local_docs=auto_ingest
        )
        ingest_result = None
        if auto_ingest:
            try:
                ingest_result = ingest_disaster_documents()
            except Exception as ie:
                ingest_result = {
                    "status": "warning", 
                    "message": f"Saved to storage, but vector ingest had warning: {ie}"
                }

        return {
            "status": "success",
            "message": f"Successfully uploaded '{file.filename}' to Supabase Storage",
            "file": res,
            "ingest_result": ingest_result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )

@app.get("/api/supabase/storage/files", tags=["Supabase"])
async def list_supabase_files():
    """Lists all files stored in the Supabase Storage bucket."""
    files = supabase_service.list_files()
    return {
        "status": "success",
        "count": len(files),
        "files": files
    }

@app.delete("/api/supabase/storage/files/{file_name}", tags=["Supabase"])
async def delete_supabase_file(file_name: str):
    """Deletes a file from Supabase Storage."""
    success = supabase_service.delete_file(file_name)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete file or Supabase not configured.")
    return {"status": "success", "message": f"Deleted {file_name}"}

@app.post("/api/supabase/reports", tags=["Supabase"])
async def save_report_to_supabase(payload: ReportPayload):
    """Saves a meteorological intelligence briefing report to Supabase PostgreSQL database."""
    try:
        data = payload.model_dump()
        res = supabase_service.save_analysis_report(data)
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save report: {str(e)}"
        )

@app.get("/api/supabase/reports", tags=["Supabase"])
async def get_supabase_reports():
    """Retrieves saved briefing reports from Supabase database."""
    reports = supabase_service.get_analysis_reports()
    return {
        "status": "success",
        "reports": reports
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
