# ==============================================================================
# WeatherGPT Backend Dockerfile (Python 3.11 Slim)
# Optimized for FastAPI, LangChain, and ChromaDB Vector Search
# ==============================================================================

FROM python:3.11-slim

# Prevent Python from writing bytecode (.pyc) and ensure unbuffered real-time logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Install essential system dependencies (curl for health check, C++ compilers for vector libraries)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cache dependencies layer
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source code and local disaster documentation
COPY backend ./backend

# Expose internal port
EXPOSE 8000

# Health check to ensure service readiness
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Launch Uvicorn server using shell form to dynamically bind to cloud $PORT
CMD sh -c "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"
