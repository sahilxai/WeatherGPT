# 🌦️ WeatherGPT

**WeatherGPT** is a split-screen AI meteorological assistant and disaster safety platform. It pairs an autonomous LangChain agent with a dynamic Leaflet map that smoothly animates (`flyTo`) directly to any city you inquire about.

---

## 🚀 Quick Start (Local Setup)

You will need **two terminal windows** running simultaneously: one for the **Backend** and one for the **Frontend**.

---

### Step 1: Environment Variables Setup

In the root project folder, ensure you have a `.env` file with your API keys:

```bash
# Copy template if .env does not exist yet
cp .env.example .env
```

Open `.env` and enter your keys:
```env
# Groq Cloud API Key (Get free key from https://console.groq.com/keys)
GROQ_API_KEY=your_groq_api_key_here

# Weather API Key (Get free key from https://www.weatherapi.com or OpenWeatherMap)
WEATHER_API_KEY=your_weatherapi_key_here

# Groq Model (default: openai/gpt-oss-120b)
GROQ_MODEL=openai/gpt-oss-120b

# ChromaDB vector store directory
CHROMA_PERSIST_DIR=./chroma_db

PORT=8000
HOST=0.0.0.0

# Optional: Supabase (Cloud Storage & PostgreSQL Database)
# (Get from Supabase Dashboard -> Project Settings -> API)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your_supabase_anon_or_service_role_key
SUPABASE_STORAGE_BUCKET=weathergpt-storage
```

> **Supabase 1-Click Database & Storage Setup:**
> Run the provided [supabase_schema.sql](file:///c:/Users/sahil/OneDrive/Desktop/WeatherGPT/supabase_schema.sql) in your **Supabase Dashboard -> SQL Editor** to automatically create the `weathergpt-storage` bucket (with public access policies) and tables for `chat_logs`, `weather_searches`, and `disaster_reports`.

---

### Step 2: Terminal 1 — Backend (FastAPI Server)

Open your terminal or PowerShell in the root `WeatherGPT` folder:

#### 1. Create and Activate Virtual Environment
```powershell
# In Windows PowerShell:
python -m venv venv
.\venv\Scripts\Activate.ps1

# (If using Windows Command Prompt / CMD):
# .\venv\Scripts\activate.bat

# (If using macOS / Linux):
# source venv/bin/activate
```

#### 2. Install Python Dependencies
```bash
pip install --upgrade pip
pip install -r backend/requirements.txt
```

#### 3. (Optional) Index Disaster Documents into ChromaDB
```bash
python -m backend.rag.ingest
```
*(Embeds local emergency documents from `backend/data/disaster_docs/` into ChromaDB with Hugging Face embeddings).*

#### 4. Run the Backend Server
```powershell
python -m uvicorn backend.main:app --reload --port 8000
```
- **Backend API:** [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

---

### Step 3: Terminal 2 — Frontend (React + Vite)

Open a **new, second terminal window** in the root `WeatherGPT` folder:

#### 1. Navigate to the Frontend Directory
```bash
cd frontend
```

#### 2. Install Node Dependencies
```bash
npm install
```

#### 3. Run the Frontend Development Server
```bash
npm run dev
```
- **Web App:** [http://localhost:5173](http://localhost:5173)

---

## 🖥️ How to Use WeatherGPT

1. Open **[http://localhost:5173](http://localhost:5173)** in your browser.
2. **Weather Inquiries:**
   - Type *"What is the weather in Pune right now?"* or *"Weather in Tokyo"*.
   - The agent provides a concise, straight response (Condition, Temperature, Humidity, Wind).
   - The interactive Leaflet map automatically executes a smooth **`flyTo`** camera glide to the city and places an active weather marker.
3. **Disaster & Emergency Protocols:**
   - Type *"Flash flood emergency safety rules"* or *"Cyclone precautions"*.
   - The agent retrieves verified procedures from the local ChromaDB RAG database.
4. **User Analysis Report:**
   - Click the **User Report** button in the top header to view session statistics, searched locations, and safety readiness scores.

---

## 📂 Project Architecture

```
WeatherGPT/
├── .env                             # Environment variables & API keys (Git ignored)
├── .env.example                     # Environment template
├── .gitignore                       # Git ignore rules (.env, venv, chroma_db, node_modules)
├── README.md                        # Project documentation & run commands
├── backend/
│   ├── main.py                      # FastAPI application with CORS & /api/chat endpoints
│   ├── config.py                    # Environment variable loader
│   ├── agent.py                     # Groq LLM tool-calling agent with concise response logic
│   ├── requirements.txt             # Python backend dependencies
│   ├── tools/
│   │   ├── __init__.py
│   │   └── weather.py               # WeatherAPI.com + OpenWeatherMap tool with coordinates
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── ingest.py                # ChromaDB document ingestion pipeline
│   │   └── retriever.py             # Chroma retriever & disaster guidelines search tool
│   └── data/
│       └── disaster_docs/           # Directory for local emergency manuals (PDF, TXT, MD)
│           └── disaster_management_guide.txt
└── frontend/
    ├── package.json                 # React, Vite, Tailwind CSS, Leaflet dependencies
    ├── vite.config.js               # Dev server configuration with localhost:8000 proxy
    ├── tailwind.config.js           # Theme styling configuration
    ├── index.html                   # HTML template & Leaflet stylesheets
    └── src/
        ├── index.css                # Custom glassmorphism & map styling
        ├── main.jsx                 # React entry point
        ├── App.jsx                  # Main split layout coordinator
        ├── services/
        │   └── api.js               # Axios client connecting to FastAPI backend
        └── components/
            ├── Header.jsx           # Clean minimal branding & report toggle
            ├── ChatInterface.jsx    # Clean message feed & prompt suggestions
            ├── MapComponent.jsx     # Leaflet map with smooth flyTo animation
            └── AnalysisModal.jsx    # User session report modal
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Python, FastAPI, Uvicorn |
| **LLM Engine** | Groq Cloud (`openai/gpt-oss-120b`) via LangChain |
| **Weather Feed** | WeatherAPI.com / OpenWeatherMap |
| **RAG & Vectors** | ChromaDB, Hugging Face (`all-MiniLM-L6-v2`) |
| **Frontend** | React 18, Vite, Tailwind CSS |
| **Interactive Map** | Leaflet.js (`react-leaflet`) with smooth `flyTo` camera controls |
