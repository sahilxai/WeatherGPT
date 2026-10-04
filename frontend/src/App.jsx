import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ChatInterface from './components/ChatInterface';
import MapComponent from './components/MapComponent';
import AnalysisModal from './components/AnalysisModal';
import ServerModal from './components/ServerModal';
import { sendChatMessage, checkBackendHealth, getActiveApiUrl } from './services/api';
import { MessageSquare, Map as MapIcon, ShieldAlert, Sparkles, Navigation } from 'lucide-react';

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
  
  // Mobile responsive tab view ('chat' or 'map')
  const [mobileTab, setMobileTab] = useState('chat');

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

        // NOTE: We do NOT force setMobileTab('map') here anymore!
        // The user remains in Chat to comfortably read the AI answer,
        // and can tap "View on Map" anytime to fly there!
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
    // When user explicitly clicks "View on Map" or a location chip, switch to Map on mobile
    if (window.innerWidth < 768) {
      setMobileTab('map');
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

      {/* Modern High-Tech Mobile Tab Switcher */}
      <div className="md:hidden px-3 py-2 bg-slate-950/95 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'chat'
                ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>AI Assistant</span>
            {messages.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                mobileTab === 'chat' ? 'bg-cyan-700/60 text-white' : 'bg-slate-800 text-slate-300'
              }`}>
                {messages.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileTab('map')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'map'
                ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Interactive Map</span>
            {currentLocation && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* Main Split Screen Command Center */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Panel: AI Weather & Disaster Assistant */}
        <section 
          id="weathergpt-chat-section"
          className={`w-full md:w-[46%] lg:w-[40%] xl:w-[36%] h-full flex flex-col shrink-0 ${
            mobileTab === 'chat' ? 'flex' : 'hidden md:flex'
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

        {/* Right Panel: Interactive Leaflet Command Map */}
        <section 
          id="weathergpt-map-section"
          className={`w-full md:w-[54%] lg:w-[60%] xl:w-[64%] h-full relative ${
            mobileTab === 'map' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <MapComponent
            currentLocation={currentLocation}
            locationHistory={locationHistory}
            onSelectHistoryCity={handleSelectLocation}
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
