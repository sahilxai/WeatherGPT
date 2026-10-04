import axios from 'axios';

/**
 * Resolves the active backend API URL.
 * Priority:
 * 1. User-configured custom URL in localStorage (useful for deployed Vercel frontend pointing to Render)
 * 2. Vite build-time environment variable VITE_API_URL
 * 3. Empty string (falls back to relative path / proxy in local dev)
 */
export const getActiveApiUrl = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('weathergpt_custom_api_url');
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  }
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return '';
};

export const setActiveApiUrl = (url) => {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      const clean = url.trim().replace(/\/+$/, '');
      localStorage.setItem('weathergpt_custom_api_url', clean);
    } else {
      localStorage.removeItem('weathergpt_custom_api_url');
    }
  }
};

const apiClient = axios.create({
  timeout: 60000, // 60s timeout to allow cold-start on free-tier backends (Render)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dynamic interceptor to ensure requests always use current active backend URL
apiClient.interceptors.request.use((config) => {
  const currentBase = getActiveApiUrl();
  config.baseURL = currentBase;
  return config;
});

/**
 * Send query to the WeatherGPT Agent endpoint.
 * @param {string} message - User query
 * @param {Array} chatHistory - Previous conversation messages [{role, content}]
 * @returns {Promise<{response: string, tools_used: string[], status: string, location?: object}>}
 */
export const sendChatMessage = async (message, chatHistory = []) => {
  try {
    const res = await apiClient.post('/api/chat', {
      message,
      chat_history: chatHistory.map(m => ({
        role: m.role,
        content: m.content
      }))
    });

    // Detect if Vercel returned index.html due to missing backend rewrite or wrong base URL
    if (typeof res.data === 'string' && (res.data.includes('<!doctype') || res.data.includes('<html'))) {
      const activeBase = getActiveApiUrl();
      throw new Error(
        `Backend API endpoint returned static HTML instead of JSON. ` +
        (activeBase ? `Please verify backend server at: ${activeBase}` : `Please configure your deployed backend URL in Server Settings.`)
      );
    }

    if (!res.data || typeof res.data !== 'object') {
      throw new Error('Invalid response format received from backend server.');
    }

    return res.data;
  } catch (error) {
    console.error('API Chat Error:', error);
    const activeBase = getActiveApiUrl();

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new Error('Connection timed out. If your backend is hosted on a free cloud tier (like Render), it may be waking up from sleep mode (~50s). Please retry in a moment.');
    }

    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }

    if (error.message?.includes('Network Error')) {
      throw new Error(
        `Network error: Unable to reach backend server${activeBase ? ` at ${activeBase}` : ''}. Please check if your backend is running or configure the Server URL.`
      );
    }

    throw new Error(
      error.message || 'Failed to communicate with WeatherGPT backend.'
    );
  }
};

/**
 * Fetch health status of backend, API keys, and ChromaDB state.
 */
export const checkBackendHealth = async (overrideUrl = null) => {
  try {
    const base = overrideUrl !== null ? overrideUrl.replace(/\/+$/, '') : getActiveApiUrl();
    const res = await axios.get(`${base}/health`, { timeout: 15000 });
    return res.data;
  } catch (error) {
    console.warn('Backend Health Check Failed:', error.message);
    return { status: 'offline', groq_configured: false, weather_api_configured: false, error: error.message };
  }
};

/**
 * Trigger re-indexing of documents in ChromaDB on demand.
 */
export const triggerDocumentIngestion = async () => {
  const res = await apiClient.post('/api/ingest');
  return res.data;
};

// -----------------------------------------------------------------------------
// Supabase Cloud Storage & Database API Services
// -----------------------------------------------------------------------------

/**
 * Fetch Supabase integration status and active storage bucket.
 */
export const getSupabaseStatus = async () => {
  try {
    const res = await apiClient.get('/api/supabase/status');
    return res.data;
  } catch (error) {
    console.warn('Supabase status check failed:', error);
    return { configured: false, storage_bucket: 'weathergpt-storage' };
  }
};

/**
 * Upload a document (PDF, TXT, MD) to Supabase Storage bucket.
 * @param {File} file - The file to upload
 * @param {boolean} autoIngest - Whether to automatically index the file into ChromaDB RAG
 */
export const uploadDocumentToSupabase = async (file, autoIngest = true) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('auto_ingest', autoIngest ? 'true' : 'false');

  const res = await apiClient.post('/api/supabase/storage/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

/**
 * List files stored in the Supabase Storage bucket.
 */
export const getSupabaseStorageFiles = async () => {
  const res = await apiClient.get('/api/supabase/storage/files');
  return res.data;
};

/**
 * Delete a file from the Supabase Storage bucket.
 */
export const deleteSupabaseStorageFile = async (fileName) => {
  const res = await apiClient.delete(`/api/supabase/storage/files/${encodeURIComponent(fileName)}`);
  return res.data;
};

/**
 * Save session analysis report to Supabase PostgreSQL database.
 */
export const saveAnalysisReportToSupabase = async (reportData) => {
  const res = await apiClient.post('/api/supabase/reports', reportData);
  return res.data;
};

/**
 * Retrieve saved reports from Supabase.
 */
export const getSavedReportsFromSupabase = async () => {
  const res = await apiClient.get('/api/supabase/reports');
  return res.data;
};
