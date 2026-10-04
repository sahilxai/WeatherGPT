import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ChatInterface from './components/ChatInterface';
import MapComponent from './components/MapComponent';
import AnalysisModal from './components/AnalysisModal';
import ServerModal from './components/ServerModal';
import { sendChatMessage, checkBackendHealth, getActiveApiUrl } from './services/api';
import { MessageSquare, Map as MapIcon, Split } from 'lucide-react';

export function App() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isServerOpen, setIsServerOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState({
    status: 'healthy',
    groq_configured: true,
    weather_api_configured: true
  });
  
  // Mobile responsive layout mode: 'dual' (Default: Top Map + Bottom Chat), 'chat' (Full Chat), 'map' (Full Map)
  const [mobileMode, setMobileMode] = useState('dual');

  useEffect(() => {
    // Initial backend health check
    checkBackendHealth().then((status) => {
      if (status) {
        setSystemStatus(status);
      }
    }).catch(console.warn);
  }, []);

  const handleSendMessage = async (userText) => {
    if (!userText.trim()) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const data = await sendChatMessage(userText, messages);
      
      const assistantMsg = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.response || 'No response returned from agent.',
        tools_used: data.tools_used || [],
        location: data.location || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);

      // If location is returned, update coordinates and history
      if (data.location && typeof data.location.lat === 'number' && typeof data.location.lon === 'number') {
        setCurrentLocation(data.location);
        setLocationHistory(prev => {
          const exists = prev.some(l => l.city.toLowerCase() === data.location.city.toLowerCase());
          if (!exists) {
            return [...prev, data.location];
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Chat execution failed:', err);
      const activeUrl = getActiveApiUrl();
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Unable to retrieve meteorological intelligence**:\n\n${err.message || 'Failed to communicate with WeatherGPT backend.'}\n\n*If you recently deployed, please verify your backend server address${activeUrl ? ` (${activeUrl})` : ''} or configure it in Server Settings.*`,
        tools_used: [],
        location: null,
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLocation = (loc) => {
    setCurrentLocation(loc);
    // If user was in chat-only view on mobile, open dual view so map is instantly visible
    if (window.innerWidth < 768 && mobileMode === 'chat') {
      setMobileMode('dual');
    }
  };

  const handleServerUpdated = (health) => {
    if (health) {
      setSystemStatus(health);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-dark-950 font-sans text-slate-100 select-none">
      {/* Top Command Flight Navigation Bar */}
      <Header
        onOpenAnalysis={() => setIsAnalysisOpen(true)}
        onOpenServer={() => setIsServerOpen(true)}
        locationCount={locationHistory.length}
        systemStatus={systemStatus}
      />

      {/* Modern High-Tech Mobile View Switcher */}
      <div className="md:hidden px-3 py-1.5 bg-slate-950/95 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-semibold">
          <button
            onClick={() => setMobileMode('dual')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mobileMode === 'dual'
                ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>Dual View</span>
          </button>

          <button
            onClick={() => setMobileMode('chat')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mobileMode === 'chat'
                ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat Only</span>
          </button>

          <button
            onClick={() => setMobileMode('map')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mobileMode === 'map'
                ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Map Only</span>
          </button>
        </div>
      </div>

      {/* Main Command Center: Dual Split on Mobile (Top Map + Bottom Chat), Side-by-Side on Desktop */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* On Mobile: Top Map Section | On Desktop: Right Map Panel */}
        <section 
          id="weathergpt-map-section"
          className={`relative border-slate-800/80 transition-all ${
            /* Mobile layout classes */
            mobileMode === 'dual' 
              ? 'w-full h-[36vh] sm:h-[38vh] border-b order-1 md:order-2 shrink-0 md:h-full md:border-b-0 md:border-l md:w-[60%] xl:w-[64%] flex' 
              : mobileMode === 'map' 
                ? 'w-full flex-1 h-full order-1 md:order-2 md:border-l md:w-[60%] xl:w-[64%] flex' 
                : 'hidden md:flex md:order-2 md:border-l md:w-[60%] xl:w-[64%] md:h-full'
          }`}
        >
          <MapComponent
            currentLocation={currentLocation}
            locationHistory={locationHistory}
            onSelectHistoryCity={handleSelectLocation}
          />
        </section>

        {/* On Mobile: Bottom Chat Section | On Desktop: Left Chat Panel */}
        <section 
          id="weathergpt-chat-section"
          className={`flex-col overflow-hidden transition-all ${
            /* Mobile layout classes */
            mobileMode === 'dual' 
              ? 'w-full flex-1 order-2 md:order-1 md:w-[40%] xl:w-[36%] md:h-full flex' 
              : mobileMode === 'chat' 
                ? 'w-full flex-1 h-full order-2 md:order-1 md:w-[40%] xl:w-[36%] flex' 
                : 'hidden md:flex md:order-1 md:w-[40%] xl:w-[36%] md:h-full'
          }`}
        >
          <ChatInterface
            messages={messages}
            loading={loading}
            onSendMessage={handleSendMessage}
            onClearHistory={() => setMessages([])}
            onFocusLocation={handleSelectLocation}
            onOpenServer={() => setIsServerOpen(true)}
          />
        </section>
      </main>

      {/* Executive Meteorological & Disaster Intelligence Report Modal */}
      <AnalysisModal
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
        messages={messages}
        locationHistory={locationHistory}
      />

      {/* Backend Server Connection Settings Modal */}
      <ServerModal
        isOpen={isServerOpen}
        onClose={() => setIsServerOpen(false)}
        onServerUpdated={handleServerUpdated}
      />
    </div>
  );
}
export default App;
