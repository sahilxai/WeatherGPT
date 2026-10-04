import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Trash2,
  Navigation,
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  Sun,
  CloudSun,
  CloudLightning,
  Snowflake,
  ShieldAlert,
  MapPin,
  Sparkles,
  ArrowUpRight,
  Server,
  AlertTriangle,
  RefreshCw,
  Compass
} from 'lucide-react';

const STARTER_PROMPTS = [
  { 
    title: "Pune Weather", 
    desc: "Current temperature, rain & wind telemetry",
    prompt: "What is the weather in Pune right now?",
    icon: CloudRain,
    iconColor: "text-cyan-400"
  },
  { 
    title: "Tokyo Weather", 
    desc: "Live atmospheric conditions in Tokyo, Japan",
    prompt: "What is the weather in Tokyo right now?",
    icon: CloudSun,
    iconColor: "text-amber-400"
  },
  { 
    title: "Flash Flood Protocol", 
    desc: "Immediate safety & evacuation guidelines",
    prompt: "What are the immediate safety steps during a flash flood?",
    icon: ShieldAlert,
    iconColor: "text-blue-400"
  },
  { 
    title: "Cyclone Checklist", 
    desc: "Emergency supplies and pre-landfall precautions",
    prompt: "What emergency precautions should I take before a cyclone hits?",
    icon: Wind,
    iconColor: "text-teal-400"
  }
];

function getWeatherIcon(conditionText = '') {
  const text = (conditionText || '').toLowerCase();
  if (text.includes('rain') || text.includes('drizzle') || text.includes('shower')) {
    return <CloudRain className="w-6 h-6 text-cyan-400" />;
  }
  if (text.includes('thunder') || text.includes('storm')) {
    return <CloudLightning className="w-6 h-6 text-amber-400" />;
  }
  if (text.includes('snow') || text.includes('ice') || text.includes('sleet')) {
    return <Snowflake className="w-6 h-6 text-blue-200" />;
  }
  if (text.includes('clear') || text.includes('sunny')) {
    return <Sun className="w-6 h-6 text-amber-400" />;
  }
  return <CloudSun className="w-6 h-6 text-cyan-300" />;
}

// Remove duplicated weather bullet points if the card already shows them
function extractNarrative(content = '') {
  if (!content) return '';
  const lines = content.split('\n');
  const filtered = lines.filter(line => {
    const l = line.trim().toLowerCase();
    return !(
      l.startsWith('- condition:') ||
      l.startsWith('* condition:') ||
      l.startsWith('condition:') ||
      l.startsWith('- temp:') ||
      l.startsWith('* temp:') ||
      l.startsWith('temp:') ||
      l.startsWith('- humidity:') ||
      l.startsWith('* humidity:') ||
      l.startsWith('humidity:') ||
      l.startsWith('- wind:') ||
      l.startsWith('* wind:') ||
      l.startsWith('wind:')
    );
  });
  return filtered.join('\n').trim();
}

export function ChatInterface({ 
  messages, 
  loading, 
  onSendMessage, 
  onClearHistory,
  onFocusLocation,
  onOpenServer
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const isInitialState = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800/80 overflow-hidden relative select-none">
      {/* Subheader: Minimal 1-line control bar */}
      <div className="h-10 sm:h-11 px-3.5 sm:px-4 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">Meteorological Assistant</span>
          <span className="text-[10px] text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>

        {messages.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-900 px-2 py-1 rounded transition-colors"
          >
            Clear conversation
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 select-text">
        {/* If in starter state, display clean starter cards */}
        {isInitialState && (
          <div className="py-4 sm:py-6 px-1 space-y-4 sm:space-y-6 animate-fade-in select-none">
            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Atmospheric Intelligence
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inquire about current weather anywhere in the world, or ask for disaster safety protocols. Tap any preset below to begin:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              {STARTER_PROMPTS.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(item.prompt)}
                    disabled={loading}
                    className="text-left p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all group active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <IconComponent className={`w-4 h-4 ${item.iconColor}`} />
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                    </div>
                    <h3 className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {item.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Render Conversation Turns */}
        {!isInitialState && messages.map((msg) => {
          const isUser = msg.role === 'user';
          const hasLocation = Boolean(msg.location && typeof msg.location.lat === 'number');
          const isError = Boolean(msg.isError || msg.content?.includes('⚠️ Connection Issue') || msg.content?.includes('Could not retrieve weather'));
          const isEmergency = !isUser && msg.content && (
            msg.content.toLowerCase().includes('disaster') ||
            msg.content.toLowerCase().includes('flood') ||
            msg.content.toLowerCase().includes('cyclone') ||
            msg.content.toLowerCase().includes('evacuat') ||
            msg.content.toLowerCase().includes('safety')
          );
          
          const narrative = extractNarrative(msg.content);

          return (
            <div
              key={msg.id}
              className={`flex gap-2 sm:gap-3 animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[92%] sm:max-w-[84%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                {isUser ? (
                  <div className="rounded-2xl rounded-tr-sm px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm bg-cyan-600 text-white font-medium shadow-sm">
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ) : isError ? (
                  /* Dedicated Connection / Diagnostic Error Card */
                  <div className="w-full rounded-2xl rounded-tl-sm p-3.5 sm:p-4 bg-rose-950/30 border border-rose-500/40 text-rose-200 text-xs sm:text-sm leading-relaxed shadow-md space-y-2.5">
                    <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs pb-1.5 border-b border-rose-500/20">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Connection Telemetry Notice</span>
                    </div>
                    <div className="prose prose-invert prose-xs text-rose-100/90 leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    {onOpenServer && (
                      <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-rose-500/20">
                        <button
                          onClick={onOpenServer}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-900 border border-rose-500/40 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors active:scale-95"
                        >
                          <Server className="w-3.5 h-3.5 text-cyan-300" />
                          <span>Configure Server URL</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full space-y-2.5">
                    {/* If location weather data is present, render single unified clean card */}
                    {hasLocation ? (
                      <div className="rounded-2xl rounded-tl-sm p-3.5 sm:p-4 bg-slate-900 border border-slate-800 text-slate-100 shadow-md space-y-3">
                        {/* Header: City & Fly button */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                            <h3 className="text-sm font-bold text-white tracking-tight truncate">
                              {msg.location.city}
                              {msg.location.country ? `, ${msg.location.country}` : ''}
                            </h3>
                          </div>

                          <button
                            onClick={() => onFocusLocation?.(msg.location)}
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-950/50 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 transition-all active:scale-95 shadow-sm"
                            title="Fly to this city on the interactive map"
                          >
                            <span>View on Map</span>
                            <Compass className="w-3 h-3 text-cyan-400 animate-spin-slow" />
                          </button>
                        </div>

                        {/* Temperature & Condition hero */}
                        <div className="flex items-center justify-between py-1 bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-800/60">
                          <div className="flex items-center gap-2.5">
                            {getWeatherIcon(msg.location.condition || msg.location.description)}
                            <div>
                              <div className="text-2xl sm:text-3xl font-black text-white font-mono leading-none">
                                {msg.location.temp !== null && msg.location.temp !== undefined ? `${msg.location.temp}°C` : 'N/A'}
                              </div>
                              <span className="text-[11px] sm:text-xs text-slate-400 capitalize mt-0.5 block">
                                {msg.location.condition || msg.location.description || 'Current condition'}
                              </span>
                            </div>
                          </div>

                          {msg.location.feels_like !== null && (
                            <div className="text-right border-l border-slate-800 pl-3">
                              <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Feels</span>
                              <span className="text-xs sm:text-sm font-semibold text-slate-200 font-mono">
                                {msg.location.feels_like}°C
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Hazard Warnings if present */}
                        {msg.location.warnings && msg.location.warnings.length > 0 && (
                          <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-1">
                            {msg.location.warnings.map((w, wIdx) => (
                              <p key={wIdx} className="leading-snug">{w}</p>
                            ))}
                          </div>
                        )}

                        {/* 3 Metrics Strip */}
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-1 border-t border-slate-800/80 text-xs font-mono">
                          <div className="bg-slate-950/60 p-1.5 sm:p-2 rounded-lg border border-slate-800/60 text-center">
                            <span className="text-[9px] sm:text-[10px] text-slate-400 block">Humidity</span>
                            <span className="font-bold text-slate-200 text-xs sm:text-sm">
                              {msg.location.humidity ?? 'N/A'}%
                            </span>
                          </div>
                          <div className="bg-slate-950/60 p-1.5 sm:p-2 rounded-lg border border-slate-800/60 text-center">
                            <span className="text-[9px] sm:text-[10px] text-slate-400 block">Wind</span>
                            <span className="font-bold text-slate-200 text-xs sm:text-sm">
                              {msg.location.wind_speed ?? 'N/A'} m/s
                            </span>
                          </div>
                          <div className="bg-slate-950/60 p-1.5 sm:p-2 rounded-lg border border-slate-800/60 text-center">
                            <span className="text-[9px] sm:text-[10px] text-slate-400 block">Coords</span>
                            <span className="font-bold text-cyan-400 text-[10px] sm:text-xs block truncate">
                              {msg.location.lat.toFixed(1)}°, {msg.location.lon.toFixed(1)}°
                            </span>
                          </div>
                        </div>

                        {/* If there's narrative text, render cleanly */}
                        {narrative && (
                          <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-300 leading-relaxed font-sans">
                            <ReactMarkdown>{narrative}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Non-weather / Disaster Emergency response bubble */
                      <div className="rounded-2xl rounded-tl-sm p-3.5 sm:p-4 bg-slate-900 border border-slate-800 text-slate-200 text-xs sm:text-sm leading-relaxed shadow-sm space-y-2">
                        {isEmergency && (
                          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 pb-1 border-b border-slate-800">
                            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>Emergency Preparedness Directives</span>
                          </div>
                        )}
                        <div className="prose prose-invert prose-xs sm:prose-sm max-w-none prose-p:my-1 prose-headings:text-cyan-300 prose-headings:font-bold prose-headings:my-1.5 prose-strong:text-cyan-200 prose-ul:my-1.5 prose-li:my-0.5">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Timestamp */}
                <span className="text-[10px] text-slate-500 px-1 mt-1 font-mono">
                  {msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}

        {/* Minimal loading indicator */}
        {loading && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-cyan-400 animate-fade-in bg-cyan-950/20 border border-cyan-500/20 rounded-xl w-fit">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Analyzing atmospheric telemetry & querying AI...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Dock: Clean, touch-optimized, safe-area padded */}
      <div className="p-2.5 sm:p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-800/80 bg-slate-950 shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask about weather anywhere or disaster protocols..."
            className="w-full bg-slate-900 text-slate-100 text-base sm:text-sm rounded-xl pl-3.5 sm:pl-4 pr-11 py-2.5 border border-slate-800 focus:outline-none focus:border-cyan-500 placeholder-slate-500 disabled:opacity-60 transition-colors shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="Send query"
            className="absolute right-1.5 p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md shadow-cyan-900/30"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
export default ChatInterface;
