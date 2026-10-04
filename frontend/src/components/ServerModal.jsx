import React, { useState, useEffect } from 'react';
import { 
  X, 
  Server, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { getActiveApiUrl, setActiveApiUrl, checkBackendHealth, sanitizeApiUrl } from '../services/api';

export function ServerModal({ isOpen, onClose, onServerUpdated }) {
  const [apiUrl, setApiUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setApiUrl(getActiveApiUrl());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async (e) => {
    e?.preventDefault();
    setTesting(true);
    setTestResult(null);

    const targetUrl = sanitizeApiUrl(apiUrl);
    setApiUrl(targetUrl); // Auto-update input field to show cleaned base URL!
    try {
      const health = await checkBackendHealth(targetUrl);
      if (health && health.status === 'healthy') {
        setActiveApiUrl(targetUrl);
        setTestResult({
          success: true,
          message: `Connected successfully! Active model: ${health.active_model || 'Groq'}`
        });
        onServerUpdated?.(health);
      } else {
        setTestResult({
          success: false,
          message: health?.error || 'Backend responded, but reported offline or unconfigured status.'
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'Could not connect to backend server at this address.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleReset = () => {
    setActiveApiUrl('');
    setApiUrl('');
    setTestResult({
      success: true,
      message: 'Reset to default relative API path (/api).'
    });
    checkBackendHealth('').then(health => onServerUpdated?.(health));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-5 text-slate-100 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Backend Server Connection</h3>
              <p className="text-[11px] text-slate-400">Configure your deployed WeatherGPT API</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informational callout */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-1">
          <p className="font-semibold text-cyan-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Deployment Note</span>
          </p>
          <p className="text-[11px] text-slate-400">
            If frontend is on Vercel and backend is on Render/Railway, paste your backend URL below (e.g. <span className="font-mono text-cyan-300">https://your-backend.onrender.com</span>).
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleTestAndSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Backend API Base URL
            </label>
            <input 
              type="url"
              placeholder="https://your-backend.onrender.com (or leave empty for local /api)"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
            />
          </div>

          {/* Test Status Feedback */}
          {testResult && (
            <div className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
              testResult.success 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <span className="text-[11px] leading-tight">{testResult.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={testing}
              className="flex-1 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 active:scale-95 shadow-md shadow-cyan-900/30"
            >
              {testing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Testing Connection...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Test & Save Connection</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default ServerModal;
