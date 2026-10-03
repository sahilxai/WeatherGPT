import os
import logging
from typing import Optional, List, Dict, Any
from pathlib import Path
from supabase import create_client, Client
from backend.config import (
    SUPABASE_URL,
    SUPABASE_KEY,
    SUPABASE_STORAGE_BUCKET,
    DATA_DIR
)

logger = logging.getLogger("WeatherGPT.Supabase")

class SupabaseService:
    def __init__(self):
        self.url = SUPABASE_URL
        self.key = SUPABASE_KEY
        self.bucket_name = SUPABASE_STORAGE_BUCKET or "weathergpt-storage"
        self._client: Optional[Client] = None
        self._bucket_checked = False

    @property
    def is_configured(self) -> bool:
        """Returns True if valid Supabase credentials are provided."""
        return bool(
            self.url 
            and self.key 
            and not self.url.startswith("your_") 
            and "supabase.co" in self.url
        )

    def get_client(self) -> Optional[Client]:
        """Lazy-loads and returns the Supabase client instance."""
        if not self.is_configured:
            return None
        
        if self._client is None:
            try:
                self._client = create_client(self.url, self.key)
                logger.info(f"Connected to Supabase project: {self.url}")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
                return None
        return self._client

    def ensure_bucket_exists(self) -> bool:
        """Ensures the storage bucket exists in Supabase. Attempts creation if missing."""
        client = self.get_client()
        if not client or self._bucket_checked:
            return True

        try:
            # First check if the bucket is accessible directly
            client.storage.from_(self.bucket_name).list()
            self._bucket_checked = True
            return True
        except Exception:
            pass

        try:
            # Check existing buckets
            buckets = client.storage.list_buckets()
            existing_bucket_names = [b.name for b in buckets] if buckets else []
            
            if self.bucket_name not in existing_bucket_names:
                client.storage.create_bucket(
                    self.bucket_name,
                    options={"public": True}
                )
            self._bucket_checked = True
            return True
        except Exception:
            self._bucket_checked = True
            return False

    # -------------------------------------------------------------------------
    # Storage Operations
    # -------------------------------------------------------------------------
    def upload_file(
        self,
        file_bytes: bytes,
        file_name: str,
        content_type: str = "application/octet-stream",
        sync_local_docs: bool = True
    ) -> Dict[str, Any]:
        """
        Uploads a file (disaster guide, PDF, report) to Supabase Storage bucket.
        Optionally copies it to local disaster_docs directory for ChromaDB indexing.
        """
        client = self.get_client()
        if not client:
            raise RuntimeError("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_KEY in your .env file.")

        self.ensure_bucket_exists()

        try:
            # Clean filename
            safe_name = os.path.basename(file_name)
            
            # Upload with upsert allowed
            res = client.storage.from_(self.bucket_name).upload(
                path=safe_name,
                file=file_bytes,
                file_options={
                    "content-type": content_type,
                    "upsert": "true"
                }
            )

            # Get public URL
            public_url = client.storage.from_(self.bucket_name).get_public_url(safe_name)

            # Sync with local DATA_DIR for ChromaDB RAG if applicable
            local_saved = False
            if sync_local_docs and DATA_DIR.exists():
                local_file_path = DATA_DIR / safe_name
                with open(local_file_path, "wb") as f:
                    f.write(file_bytes)
                local_saved = True

            return {
                "status": "success",
                "filename": safe_name,
                "public_url": public_url,
                "synced_to_rag": local_saved,
                "bucket": self.bucket_name
            }
        except Exception as e:
            logger.error(f"Error uploading file to Supabase Storage: {e}")
            raise RuntimeError(f"Supabase Storage upload failed: {str(e)}")

    def list_files(self, prefix: str = "") -> List[Dict[str, Any]]:
        """Lists all files in the Supabase Storage bucket with their public URLs."""
        client = self.get_client()
        if not client:
            return []

        self.ensure_bucket_exists()
        try:
            files = client.storage.from_(self.bucket_name).list(prefix)
            results = []
            for item in files or []:
                name = item.get("name")
                if not name or name == ".emptyFolderPlaceholder":
                    continue
                url = client.storage.from_(self.bucket_name).get_public_url(name)
                results.append({
                    "name": name,
                    "id": item.get("id"),
                    "created_at": item.get("created_at"),
                    "updated_at": item.get("updated_at"),
                    "size": item.get("metadata", {}).get("size") if item.get("metadata") else None,
                    "mimetype": item.get("metadata", {}).get("mimetype") if item.get("metadata") else None,
                    "public_url": url
                })
            return results
        except Exception as e:
            logger.warning(f"Failed to list files from Supabase Storage: {e}")
            return []

    def download_file(self, file_name: str) -> bytes:
        """Downloads binary file data from Supabase Storage."""
        client = self.get_client()
        if not client:
            raise RuntimeError("Supabase is not configured.")

        try:
            return client.storage.from_(self.bucket_name).download(file_name)
        except Exception as e:
            logger.error(f"Failed to download file '{file_name}' from Supabase: {e}")
            raise RuntimeError(f"Download error: {str(e)}")

    def delete_file(self, file_name: str) -> bool:
        """Deletes a file from Supabase Storage."""
        client = self.get_client()
        if not client:
            return False

        try:
            client.storage.from_(self.bucket_name).remove([file_name])
            return True
        except Exception as e:
            logger.error(f"Failed to delete file '{file_name}': {e}")
            return False

    # -------------------------------------------------------------------------
    # Database Operations (PostgreSQL)
    # -------------------------------------------------------------------------
    def log_chat_interaction(
        self,
        role: str,
        content: str,
        session_id: Optional[str] = None,
        tools_used: Optional[List[str]] = None,
        location: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Saves a chat message turn and metadata to 'chat_logs' table."""
        client = self.get_client()
        if not client:
            return False

        try:
            payload = {
                "role": role,
                "content": content,
                "session_id": session_id or "default_session",
                "tools_used": tools_used or [],
                "location_data": location or {}
            }
            client.table("chat_logs").insert(payload).execute()
            return True
        except Exception as e:
            logger.warning(f"Could not log chat to Supabase database: {e}")
            return False

    def save_analysis_report(self, report_data: Dict[str, Any]) -> Dict[str, Any]:
        """Saves a meteorological safety & session briefing to the 'disaster_reports' table."""
        client = self.get_client()
        if not client:
            raise RuntimeError("Supabase database is not configured. Please check your .env credentials.")

        try:
            res = client.table("disaster_reports").insert(report_data).execute()
            return {
                "status": "success",
                "data": res.data if hasattr(res, "data") else report_data
            }
        except Exception as e:
            logger.error(f"Failed to save analysis report to Supabase: {e}")
            raise RuntimeError(f"Supabase database error: {str(e)}")

    def get_analysis_reports(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Retrieves past briefing reports saved in Supabase."""
        client = self.get_client()
        if not client:
            return []

        try:
            res = client.table("disaster_reports").select("*").order("created_at", desc=True).limit(limit).execute()
            return res.data if hasattr(res, "data") and res.data else []
        except Exception as e:
            logger.warning(f"Could not fetch reports from Supabase: {e}")
            return []

    def log_weather_search(self, weather_info: Dict[str, Any]) -> bool:
        """Logs a geocoded city weather search in the 'weather_searches' table."""
        client = self.get_client()
        if not client:
            return False

        try:
            client.table("weather_searches").insert({
                "city": weather_info.get("city"),
                "country": weather_info.get("country", ""),
                "lat": weather_info.get("lat"),
                "lon": weather_info.get("lon"),
                "temp": weather_info.get("temp"),
                "condition": weather_info.get("condition"),
                "humidity": weather_info.get("humidity"),
                "wind_speed": weather_info.get("wind_speed")
            }).execute()
            return True
        except Exception as e:
            logger.warning(f"Could not log weather search: {e}")
            return False

# Global singleton
supabase_service = SupabaseService()
