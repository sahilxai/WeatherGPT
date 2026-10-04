import React from 'react';
import { CloudRain, ShieldCheck, Server, Wifi, WifiOff } from 'lucide-react';

export function Header({ 
  onOpenAnalysis, 
  onOpenServer,
  systemStatus = { status: 'healthy' },
  locationCount = 0 
}) {
  const isHealthy = systemStatus?.status === 'healthy';

  return (
    <header className="h-14 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md px-3.5 sm:px-5 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Brand */}
      <div className="flex items-center gap-2.5 sm:gap-3">
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
      <div className="flex items-center gap-2">
        {/* Backend Server Status / Config */}
        <button
          onClick={onOpenServer}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border transition-all active:scale-95 ${
            isHealthy
              ? 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              : 'bg-rose-950/30 text-rose-300 border-rose-500/40 hover:bg-rose-950/50'
          }`}
          title={isHealthy ? 'Backend Connected (Click to view server settings)' : 'Backend Offline (Click to configure URL)'}
        >
          <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-rose-500 animate-pulse'}`} />
          <span className="hidden xs:inline text-[11px]">
            {isHealthy ? 'Server' : 'Connect'}
          </span>
        </button>

        {/* Safety & Analytics Report */}
        <button
          onClick={onOpenAnalysis}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 hover:text-white border border-slate-800 transition-all active:scale-95"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] sm:text-xs">Report</span>
          {locationCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 font-mono font-bold">
              {locationCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
export default Header;
