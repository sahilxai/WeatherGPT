import axios from 'axios';

// The Vite proxy redirects /api to http://127.0.0.1:8000
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
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
    return res.data;
  } catch (error) {
    console.error('API Chat Error:', error);
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to communicate with WeatherGPT backend.'
    );
  }
};

/**
 * Fetch health status of backend, API keys, and ChromaDB state.
 */
export const checkBackendHealth = async () => {
  try {
    const res = await apiClient.get('/health');
    return res.data;
  } catch (error) {
    console.warn('Backend Health Check Failed:', error.message);
    return { status: 'offline', groq_configured: false, weather_api_configured: false };
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
