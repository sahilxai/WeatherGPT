import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ChatInterface from './components/ChatInterface';
import MapComponent from './components/MapComponent';
import AnalysisModal from './components/AnalysisModal';
import SupabaseModal from './components/SupabaseModal';
import { sendChatMessage, checkBackendHealth } from './services/api';
import { MessageSquare, Map as MapIcon, ShieldAlert } from 'lucide-react';

export function App() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState({
    status: 'healthy',
    groq_configured: true,
    weather_api_configured: true,
    supabase_configured: false
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
        content: data.response,
        tools_used: data.tools_used || [],
        location: data.location || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);

      if (data.location && typeof data.location.lat === 'number' && typeof data.location.lon === 'number') {
        setCurrentLocation(data.location);
        setLocationHistory(prev => {
          const exists = prev.some(l => l.city.toLowerCase() === data.location.city.toLowerCase());
          if (!exists) {
            return [...prev, data.location];
          }
          return prev;
        });

        if (window.innerWidth < 768) {
          setMobileTab('map');
        }
      }
    } catch (err) {
      console.error(err);
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Could not retrieve weather information right now. Please try again or verify your query.`,
        tools_used: [],
        location: null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLocation = (loc) => {
    setCurrentLocation(loc);
    if (window.innerWidth < 768) {
      setMobileTab('map');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-dark-950 font-sans text-slate-100">
      {/* Top Command Flight Navigation Bar */}
      <Header
        onOpenAnalysis={() => setIsAnalysisOpen(true)}
        onOpenSupabase={() => setIsSupabaseOpen(true)}
        supabaseConfigured={Boolean(systemStatus.supabase_configured)}
        locationCount={locationHistory.length}
        onSelectCity={handleSendMessage}
        systemStatus={systemStatus}
      />

      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex items-center border-b border-slate-800 bg-dark-900 text-xs font-semibold">
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            mobileTab === 'chat'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat Telemetry</span>
        </button>
        <button
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            mobileTab === 'map'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>Geospatial Map</span>
          {currentLocation && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
        </button>
      </div>

      {/* Main Split Screen Command Center */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Panel: AI Weather & Disaster Assistant (40% on desktop) */}
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
          />
        </section>

        {/* Right Panel: Interactive Leaflet Command Map (60% on desktop) */}
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

      {/* Supabase Cloud Storage & Database Sync Modal */}
      <SupabaseModal
        isOpen={isSupabaseOpen}
        onClose={() => setIsSupabaseOpen(false)}
      />
    </div>
  );
}
export default App;
