import React from 'react';
import { CloudRain, ShieldCheck, Database } from 'lucide-react';

export function Header({ 
  onOpenAnalysis, 
  onOpenSupabase,
  supabaseConfigured = false,
  locationCount = 0 
}) {
  return (
    <header className="h-14 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-5 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
          <CloudRain className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-tight text-white">WeatherGPT</span>
          <span className="hidden sm:inline-block text-[11px] text-slate-400 font-medium">
            Meteorological Intelligence
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Supabase Cloud Storage */}
        <button
          onClick={onOpenSupabase}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors active:scale-95 ${
            supabaseConfigured
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-950/60'
              : 'bg-slate-900 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white'
          }`}
          title="Supabase Cloud Storage & Database"
        >
          <Database className={`w-3.5 h-3.5 ${supabaseConfigured ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span className="hidden sm:inline">Supabase</span>
          <span className={`w-1.5 h-1.5 rounded-full ${supabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        </button>

        {/* Safety & Analytics Report */}
        <button
          onClick={onOpenAnalysis}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 hover:text-white border border-slate-700/60 transition-colors active:scale-95"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Safety Report</span>
          {locationCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 font-mono font-bold">
              {locationCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
export default Header;
