import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  MapPin, 
  FileText, 
  Calendar, 
  Thermometer, 
  Droplets, 
  Wind, 
  ShieldAlert,
  Compass
} from 'lucide-react';

export function AnalysisModal({ 
  isOpen, 
  onClose, 
  messages = [], 
  locationHistory = [] 
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Group messages into paired Q&A turns
  const qaPairs = [];
  let currentPair = null;

  messages.forEach((msg) => {
    if (msg.role === 'user') {
      currentPair = {
        question: msg.content,
        timestamp: msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        answers: []
      };
      qaPairs.push(currentPair);
    } else if (msg.role === 'assistant' && currentPair) {
      currentPair.answers.push({
        content: msg.content,
        location: msg.location,
        tools_used: msg.tools_used || [],
        timestamp: msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
  });

  const uniqueCities = Array.from(new Set(locationHistory.map(l => l.city)));
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopyAll = () => {
    let reportText = `WEATHERGPT SESSION BRIEFING & REPORT\nDate: ${currentDate}\nTotal Queries: ${qaPairs.length}\nRegions Mapped: ${uniqueCities.join(', ') || 'None'}\n\n`;
    reportText += `====================================================\n\n`;

    qaPairs.forEach((pair, idx) => {
      reportText += `[Q${idx + 1}] (${pair.timestamp}): ${pair.question}\n`;
      pair.answers.forEach((ans) => {
        if (ans.location) {
          reportText += `--> Station: ${ans.location.city}${ans.location.country ? `, ${ans.location.country}` : ''}\n`;
          reportText += `--> Telemetry: ${ans.location.temp ?? 'N/A'}°C | ${ans.location.condition || ans.location.description} | Humidity: ${ans.location.humidity ?? 'N/A'}% | Wind: ${ans.location.wind_speed ?? 'N/A'} m/s\n`;
        }
        reportText += `--> Response: ${ans.content}\n\n`;
      });
      reportText += `----------------------------------------------------\n\n`;
    });

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div 
        id="weathergpt-printable-report"
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 flex flex-col print:max-h-none print:shadow-none print:border-none print:bg-white print:text-black print:rounded-none"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 sticky top-0 backdrop-blur-md z-10 print:static print:bg-transparent print:border-b-2 print:border-black">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 print:hidden">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight print:text-black">
                WeatherGPT Session Briefing & Q&A Report
              </h2>
              <p className="text-[11px] text-slate-400 print:text-gray-600 flex items-center gap-2 mt-0.5">
                <Calendar className="w-3 h-3 text-cyan-400 print:hidden" />
                <span>{currentDate}</span>
                <span>•</span>
                <span>{qaPairs.length} Inquiries Answered</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors print:hidden"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Content */}
        <div className="p-4 sm:p-6 space-y-4 select-text print:p-2">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs print:bg-gray-100 print:border-gray-300 print:text-black">
            <div>
              <span className="text-[10px] text-slate-400 block print:text-gray-500">Inquiries Answered</span>
              <strong className="text-sm sm:text-base text-cyan-400 font-mono print:text-black">{qaPairs.length}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block print:text-gray-500">Stations Monitored</span>
              <strong className="text-sm sm:text-base text-cyan-400 font-mono print:text-black">{uniqueCities.length}</strong>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 block print:text-gray-500">Session Status</span>
              <strong className="text-xs text-emerald-400 font-medium flex items-center gap-1 mt-0.5 print:text-green-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 print:hidden" />
                Complete Transcript
              </strong>
            </div>
          </div>

          {/* Q&A List */}
          {qaPairs.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-300">No questions asked in this session yet.</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Ask about current weather in any city or emergency guidelines in the chat, and your questions and answers will automatically appear here!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {qaPairs.map((pair, idx) => (
                <div 
                  key={idx}
                  className="rounded-xl p-3.5 sm:p-4 bg-slate-950/40 border border-slate-800 space-y-3 print:bg-transparent print:border-b print:border-gray-300 print:p-2"
                >
                  {/* User Question */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-2 print:border-gray-200">
                    <div className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 font-mono print:bg-gray-200 print:text-black shrink-0">
                        Q{idx + 1}
                      </span>
                      <h3 className="text-xs sm:text-sm font-semibold text-white tracking-tight print:text-black">
                        {pair.question}
                      </h3>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0 print:text-gray-500">
                      {pair.timestamp}
                    </span>
                  </div>

                  {/* Assistant Answer(s) */}
                  {pair.answers.map((ans, aIdx) => (
                    <div key={aIdx} className="space-y-2 pl-1 sm:pl-2">
                      {/* If Weather Station Data present, show clean metadata strip */}
                      {ans.location && (
                        <div className="p-2 sm:p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] flex flex-wrap items-center justify-between gap-2 print:bg-gray-50 print:border-gray-300 print:text-black">
                          <div className="flex items-center gap-1.5 font-bold text-white print:text-black">
                            <MapPin className="w-3.5 h-3.5 text-cyan-400 print:hidden" />
                            <span>{ans.location.city}{ans.location.country ? `, ${ans.location.country}` : ''}</span>
                          </div>
                          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-300 print:text-black">
                            {ans.location.temp !== null && ans.location.temp !== undefined && (
                              <span className="text-cyan-400 font-bold print:text-black">{ans.location.temp}°C</span>
                            )}
                            {ans.location.condition && (
                              <span className="text-slate-400 capitalize print:text-black">{ans.location.condition}</span>
                            )}
                            {ans.location.humidity !== null && (
                              <span className="hidden sm:inline">Hum: {ans.location.humidity}%</span>
                            )}
                            {ans.location.wind_speed !== null && (
                              <span className="hidden sm:inline">Wind: {ans.location.wind_speed} m/s</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Warnings if any */}
                      {ans.location?.warnings && ans.location.warnings.length > 0 && (
                        <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs space-y-1 print:text-red-700 print:border-red-400">
                          {ans.location.warnings.map((w, wI) => (
                            <p key={wI} className="leading-snug">{w}</p>
                          ))}
                        </div>
                      )}

                      {/* Answer Narrative / Text */}
                      <div className="prose prose-invert prose-xs sm:prose-sm max-w-none text-slate-300 leading-relaxed font-sans print:text-black print:prose">
                        <ReactMarkdown>{ans.content}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/90 backdrop-blur-md flex items-center justify-between gap-2 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={qaPairs.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-cyan-950"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={handleCopyAll}
              disabled={qaPairs.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
export default AnalysisModal;
