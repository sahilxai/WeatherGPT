import React, { useState } from 'react';
import { 
  X, 
  BarChart3, 
  MapPin, 
  AlertTriangle, 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  Sparkles,
  TrendingUp,
  Download,
  Share2,
  Wind,
  Thermometer,
  Shield,
  Activity,
  Database,
  Check,
  RefreshCw
} from 'lucide-react';
import { saveAnalysisReportToSupabase } from '../services/api';

export function AnalysisModal({ 
  isOpen, 
  onClose, 
  messages = [], 
  locationHistory = [] 
}) {
  const [savingSupabase, setSavingSupabase] = useState(false);
  const [supabaseMsg, setSupabaseMsg] = useState(null);

  if (!isOpen) return null;

  // Calculate statistics from user session
  const userMessages = messages.filter(m => m.role === 'user');
  const totalQueries = userMessages.length;
  
  // Categorize queries
  const weatherQueries = userMessages.filter(m => 
    /weather|temperature|temp|rain|wind|forecast|climate|humid/i.test(m.content)
  ).length;

  const disasterQueries = userMessages.filter(m => 
    /disaster|flood|cyclone|hurricane|earthquake|emergency|evacuate|safety|kit|tsunami|hazard/i.test(m.content)
  ).length;

  // Collect all warnings from location history
  const allWarnings = locationHistory.flatMap(loc => loc.warnings || []);
  const uniqueCities = Array.from(new Set(locationHistory.map(l => l.city)));

  // Calculate preparedness score (0 - 100)
  const baseScore = 75;
  const bonusRAG = Math.min(disasterQueries * 8, 15);
  const bonusExploration = Math.min(uniqueCities.length * 5, 10);
  const preparednessScore = Math.min(baseScore + bonusRAG + bonusExploration, 100);

  const handlePrint = () => {
    window.print();
  };

  const handleSaveToSupabase = async () => {
    setSavingSupabase(true);
    setSupabaseMsg(null);
    try {
      const payload = {
        session_id: `session-${Date.now()}`,
        preparedness_score: preparednessScore,
        total_queries: totalQueries,
        disaster_queries: disasterQueries,
        unique_cities: uniqueCities,
        all_warnings: allWarnings,
        report_metadata: {
          timestamp: new Date().toISOString(),
          weather_queries: weatherQueries
        }
      };
      await saveAnalysisReportToSupabase(payload);
      setSupabaseMsg({ type: 'success', text: 'Saved to Supabase!' });
      setTimeout(() => setSupabaseMsg(null), 4000);
    } catch (err) {
      setSupabaseMsg({
        type: 'error',
        text: err.response?.data?.detail || err.message || 'Supabase credentials needed in .env'
      });
      setTimeout(() => setSupabaseMsg(null), 5000);
    } finally {
      setSavingSupabase(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-panel-elevated rounded-2xl shadow-2xl border border-cyan-500/40 text-slate-100 flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-700/60 flex items-center justify-between bg-dark-900/80 sticky top-0 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-glow-cyan">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2 tracking-tight">
                Meteorological & Disaster Intelligence Briefing
              </h2>
              <p className="text-xs text-slate-400">
                Session telemetry, atmospheric monitoring, and disaster risk index
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 select-text">
          {/* Top Score & Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Queries */}
            <div className="glass-card p-3.5 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-slate-400 font-medium block">Total Inquiries</span>
              <span className="text-2xl font-black text-cyan-400 font-mono">{totalQueries}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Session prompts</span>
            </div>

            {/* Explored Locations */}
            <div className="glass-card p-3.5 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-slate-400 font-medium block">Geocoded Stations</span>
              <span className="text-2xl font-black text-blue-400 font-mono">{uniqueCities.length}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Mapped on Leaflet</span>
            </div>

            {/* RAG Protocols */}
            <div className="glass-card p-3.5 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-slate-400 font-medium block">Disaster Protocols</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">{disasterQueries}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Vector RAG retrieved</span>
            </div>

            {/* Preparedness Score */}
            <div className="glass-card p-3.5 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-slate-400 font-medium block">Preparedness Index</span>
              <span className="text-2xl font-black text-purple-400 font-mono">{preparednessScore}%</span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 mt-0.5 font-medium">
                <TrendingUp className="w-2.5 h-2.5" /> High Readiness
              </span>
            </div>
          </div>

          {/* AI Executive Summary Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-dark-900 to-blue-950/30 border border-cyan-500/30 shadow-inner">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 mb-2">
              <Sparkles className="w-4 h-4 text-cyan-300" />
              AI Synthesized Mission Assessment
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {totalQueries === 0 ? (
                "Session active. Inquire about city weather (e.g. 'Weather in Pune') or emergency safety protocols to populate real-time regional telemetry and build your disaster risk profile."
              ) : (
                `Session has monitored ${totalQueries} interactions (${weatherQueries} weather observations, ${disasterQueries} disaster emergency protocols). The system has geocoded and rendered ${uniqueCities.length} meteorological regions with dynamic Leaflet coordinate mapping. Current emergency readiness score: ${preparednessScore}%.`
              )}
            </p>
          </div>

          {/* Explored Locations Breakdown */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                Active Target Stations ({uniqueCities.length})
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Real-Time Coordinates</span>
            </h4>
            {locationHistory.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-dark-950/60 p-3 rounded-xl border border-slate-800 text-center">
                No stations mapped yet. Ask about any city in the chat interface!
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {locationHistory.map((loc, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-2.5 rounded-xl bg-dark-950/70 border border-slate-800 text-xs hover:border-cyan-500/40 transition-colors"
                  >
                    <span className="font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-glow-cyan" />
                      {loc.city} {loc.country ? `(${loc.country})` : ''}
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {loc.lat.toFixed(2)}° N, {loc.lon.toFixed(2)}° E
                    </span>
                    <span className="text-cyan-300 font-mono font-bold">
                      {loc.temp !== null && loc.temp !== undefined ? `${loc.temp}°C` : 'Indexed'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Hazards / Warnings Section */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Atmospheric Hazard & Disaster Alert Matrix
            </h4>
            {allWarnings.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>No severe atmospheric hazards (gale winds, heatwave warnings, or flash flood advisories) currently active in probed zones.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {allWarnings.map((warn, i) => (
                  <div key={i} className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 shadow-md">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{warn}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actionable Preparedness Checklist */}
          <div className="p-4 rounded-xl bg-dark-950/80 border border-slate-800/80 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-cyan-400" />
              Disaster Preparedness Protocol Directives
            </h4>
            <ul className="text-xs text-slate-300 space-y-2 font-sans">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span><strong>72-Hour Survival Kit:</strong> Keep 4 liters of clean potable water per person/day, non-perishable rations, flashlight, and medical pack.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span><strong>Flood Hazard Protocol:</strong> Never drive or wade through standing floodwaters (&quot;Turn Around, Don&apos;t Drown&quot;). De-energize main electrical breaker if water enters premises.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span><strong>Cyclone Preparedness:</strong> Secure or shutter all loose windows and external fixtures; remain in an interior ground-floor room away from glass.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-dark-950/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Print Briefing</span>
            </button>
            <button
              onClick={handleSaveToSupabase}
              disabled={savingSupabase}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-300 hover:text-white bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 transition-colors"
            >
              {savingSupabase ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <Database className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>{savingSupabase ? 'Saving...' : 'Sync to Supabase'}</span>
            </button>
            {supabaseMsg && (
              <span className={`text-[11px] font-medium ${supabaseMsg.type === 'success' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {supabaseMsg.text}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all shadow-md shadow-cyan-500/20 active:scale-95"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
export default AnalysisModal;
