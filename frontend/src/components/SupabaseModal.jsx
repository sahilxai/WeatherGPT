import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Trash2, 
  RefreshCw, 
  Copy, 
  Check, 
  HardDrive,
  Layers,
  Key
} from 'lucide-react';
import { 
  getSupabaseStatus, 
  getSupabaseStorageFiles, 
  uploadDocumentToSupabase, 
  deleteSupabaseStorageFile 
} from '../services/api';

export function SupabaseModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('storage'); // 'storage', 'database', 'setup'
  const [status, setStatus] = useState({ configured: false, storage_bucket: 'weathergpt-storage' });
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [autoIngest, setAutoIngest] = useState(true);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStatusAndFiles();
    }
  }, [isOpen]);

  const loadStatusAndFiles = async () => {
    try {
      const st = await getSupabaseStatus();
      setStatus(st);
      if (st.configured) {
        setLoadingFiles(true);
        const res = await getSupabaseStorageFiles();
        if (res.files) {
          setFiles(res.files);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch Supabase status/files:', e);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMessage(null);

    try {
      const res = await uploadDocumentToSupabase(file, autoIngest);
      setUploadMessage({ type: 'success', text: res.message || 'File uploaded successfully!' });
      await loadStatusAndFiles();
    } catch (err) {
      setUploadMessage({ 
        type: 'error', 
        text: err.response?.data?.detail || err.message || 'Upload failed.' 
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteFile = async (fileName) => {
    if (!confirm(`Are you sure you want to delete '${fileName}' from Supabase Storage?`)) return;
    try {
      await deleteSupabaseStorageFile(fileName);
      await loadStatusAndFiles();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete file.');
    }
  };

  const handleCopySql = () => {
    const sqlScript = `-- WeatherGPT Supabase Setup Schema
-- Run this in Supabase Project -> SQL Editor -> Run

insert into storage.buckets (id, name, public)
values ('weathergpt-storage', 'weathergpt-storage', true)
on conflict (id) do nothing;

create policy "Allow Public Read on WeatherGPT Storage"
  on storage.objects for select using ( bucket_id = 'weathergpt-storage' );

create policy "Allow Uploads to WeatherGPT Storage"
  on storage.objects for insert with check ( bucket_id = 'weathergpt-storage' );

create table if not exists public.chat_logs (
    id uuid default gen_random_uuid() primary key,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    session_id text default 'default_session',
    role text not null check (role in ('user', 'assistant', 'system')),
    content text not null,
    tools_used text[] default '{}',
    location_data jsonb default '{}'::jsonb
);

create table if not exists public.weather_searches (
    id uuid default gen_random_uuid() primary key,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    city text not null,
    country text,
    lat double precision,
    lon double precision,
    temp text,
    condition text,
    humidity text,
    wind_speed text
);

create table if not exists public.disaster_reports (
    id uuid default gen_random_uuid() primary key,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    session_id text default 'default_session',
    preparedness_score integer default 0,
    total_queries integer default 0,
    disaster_queries integer default 0,
    unique_cities text[] default '{}',
    all_warnings text[] default '{}',
    report_metadata jsonb default '{}'::jsonb
);`;

    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-panel-elevated rounded-2xl shadow-2xl border border-emerald-500/40 text-slate-100 flex flex-col bg-slate-950">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-dark-900/90 sticky top-0 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-glow-emerald">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  Supabase Cloud Integration
                </h2>
                {status.configured ? (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Connected
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    Credentials Needed
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Storage bucket & PostgreSQL synchronization for WeatherGPT
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800/80 px-6 pt-2 bg-slate-900/50">
          <button
            onClick={() => setActiveTab('storage')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'storage'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Storage Bucket ({status.storage_bucket})</span>
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'database'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Database Tables</span>
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'setup'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Setup & Credentials</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-5 select-text">
          
          {/* TAB 1: STORAGE BUCKET */}
          {activeTab === 'storage' && (
            <div className="space-y-5">
              {/* Upload Card */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-emerald-400" />
                    Upload Emergency Manual / Disaster Protocol
                  </span>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoIngest}
                      onChange={(e) => setAutoIngest(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0"
                    />
                    <span>Auto-index into ChromaDB RAG</span>
                  </label>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Files uploaded here will be stored in your Supabase Storage bucket (<code className="text-emerald-400 font-mono">{status.storage_bucket}</code>) and made immediately available to the WeatherGPT AI assistant.
                </p>

                <div className="flex items-center gap-3">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept=".pdf,.txt,.md,.json"
                      onChange={handleFileUpload}
                      disabled={uploading || !status.configured}
                      className="hidden"
                      id="supabase-file-input"
                    />
                    <div className={`w-full py-2.5 px-4 rounded-xl border border-dashed text-xs text-center cursor-pointer transition-colors ${
                      status.configured
                        ? 'border-emerald-500/50 bg-emerald-950/10 text-emerald-300 hover:bg-emerald-950/20'
                        : 'border-slate-700 bg-slate-900/50 text-slate-500 cursor-not-allowed'
                    }`}>
                      {uploading ? (
                        <span className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Uploading to Supabase Storage...
                        </span>
                      ) : status.configured ? (
                        <span>Click to browse & upload (.pdf, .txt, .md)</span>
                      ) : (
                        <span>Configure SUPABASE_URL in .env to enable uploads</span>
                      )}
                    </div>
                  </label>
                </div>

                {uploadMessage && (
                  <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    uploadMessage.type === 'success' 
                      ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40' 
                      : 'bg-rose-950/40 text-rose-300 border border-rose-500/40'
                  }`}>
                    {uploadMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{uploadMessage.text}</span>
                  </div>
                )}
              </div>

              {/* Stored Files Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Files in Supabase Storage ({files.length})
                  </h4>
                  <button
                    onClick={loadStatusAndFiles}
                    className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                    title="Refresh file list"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {loadingFiles ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Loading files from Supabase...
                  </div>
                ) : files.length === 0 ? (
                  <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 text-center text-xs text-slate-400">
                    {status.configured 
                      ? 'No files found in bucket. Upload a PDF or TXT emergency guide above.' 
                      : 'Add your Supabase credentials in .env to connect to your storage bucket.'}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {files.map((file, idx) => (
                      <div
                        key={file.id || idx}
                        className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="font-medium text-slate-200 truncate">{file.name}</span>
                          {file.size && (
                            <span className="text-[10px] text-slate-500">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {file.public_url && (
                            <a
                              href={file.public_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                              title="View / Download file"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteFile(file.name)}
                            className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-slate-800 transition-colors"
                            title="Delete file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DATABASE TABLES */}
          {activeTab === 'database' && (
            <div className="space-y-4 text-xs">
              <p className="text-slate-300">
                WeatherGPT communicates with 3 PostgreSQL tables in your Supabase project:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="font-mono text-emerald-400 font-bold block">public.chat_logs</span>
                  <p className="text-[11px] text-slate-400">
                    Stores user prompts, AI responses, tools used, and session telemetry.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="font-mono text-emerald-400 font-bold block">public.weather_searches</span>
                  <p className="text-[11px] text-slate-400">
                    Tracks geocoded city queries, temperatures, humidity, and wind conditions.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="font-mono text-emerald-400 font-bold block">public.disaster_reports</span>
                  <p className="text-[11px] text-slate-400">
                    Saves saved safety briefings, preparedness scores, and risk assessments.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Supabase SQL Setup Script</span>
                  <button
                    onClick={handleCopySql}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/40 border border-emerald-500/30 transition-colors"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Schema'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  You can also find this file directly at <code className="text-emerald-400">supabase_schema.sql</code> in the project root. Paste it into your Supabase Dashboard SQL Editor to auto-create the tables and bucket.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: SETUP & CREDENTIALS */}
          {activeTab === 'setup' && (
            <div className="space-y-4 text-xs">
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">1</span>
                  <div>
                    <strong className="text-slate-200">Create a Supabase Project:</strong>
                    <p className="text-slate-400 mt-0.5">
                      Head to <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">supabase.com</a>, create a free account, and click <strong>New Project</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">2</span>
                  <div>
                    <strong className="text-slate-200">Run the SQL Schema:</strong>
                    <p className="text-slate-400 mt-0.5">
                      Go to <strong>SQL Editor</strong> in Supabase, paste the contents from <code className="text-emerald-400">supabase_schema.sql</code>, and click <strong>Run</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">3</span>
                  <div>
                    <strong className="text-slate-200">Add Keys to .env:</strong>
                    <p className="text-slate-400 mt-0.5">
                      Go to <strong>Project Settings -&gt; API</strong>, copy your <strong>Project URL</strong> and <strong>anon/public</strong> key, then add them to your root <code className="text-emerald-400">.env</code>:
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300">
                SUPABASE_URL=https://your-project-id.supabase.co<br />
                SUPABASE_KEY=your_supabase_anon_or_service_role_key<br />
                SUPABASE_STORAGE_BUCKET=weathergpt-storage
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-dark-950/90 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            {status.configured ? `Active Project: ${status.project_url}` : 'Status: Offline / Not configured'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
export default SupabaseModal;
