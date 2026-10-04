import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  CloudSun, 
  Droplets, 
  Wind, 
  Layers, 
  Thermometer,
  Navigation,
  Crosshair,
  Plus,
  Minus,
  Radar,
  Radio,
  Clock,
  Sparkles,
  Compass,
  MapPin
} from 'lucide-react';

const TILE_LAYERS = {
  dark: {
    name: "Dark Matter (High-Res)",
    base: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    labels: null,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    isDark: false
  },
  satellite: {
    name: "Satellite Imagery",
    base: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    labels: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    isDark: false
  },
  osm: {
    name: "Street Navigation",
    base: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    labels: null,
    attribution: '&copy; OpenStreetMap contributors',
    isDark: false
  }
};

/**
 * Automatically invalidates Leaflet map size on container resize or layout shift
 */
function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const handleResize = () => {
      try {
        map.invalidateSize();
      } catch (e) {
        // Safe catch
      }
    };
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 250);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [map]);
  return null;
}

/**
 * Controller component inside MapContainer to execute smooth flyTo animations safely
 */
function MapController({ location, zoomLevel = 11 }) {
  const map = useMap();

  useEffect(() => {
    if (location && typeof location.lat === 'number' && typeof location.lon === 'number') {
      try {
        map.invalidateSize();
        map.flyTo([location.lat, location.lon], zoomLevel, {
          duration: 1.8,
          easeLinearity: 0.25
        });
      } catch (err) {
        console.warn('Map flyTo warning:', err);
      }
    }
  }, [location, zoomLevel, map]);

  return null;
}

/**
 * Custom Zoom & Target Controller
 */
function CustomMapControls({ onZoomIn, onZoomOut, onResetView }) {
  return (
    <div className="flex flex-col gap-1.5 shadow-2xl">
      <button
        onClick={onZoomIn}
        title="Zoom In"
        className="w-8 h-8 rounded-xl glass-panel hover:bg-slate-800 text-slate-200 hover:text-cyan-300 flex items-center justify-center border border-slate-700/70 transition-all active:scale-95 shadow-md"
      >
        <Plus className="w-4 h-4" />
      </button>
      <button
        onClick={onZoomOut}
        title="Zoom Out"
        className="w-8 h-8 rounded-xl glass-panel hover:bg-slate-800 text-slate-200 hover:text-cyan-300 flex items-center justify-center border border-slate-700/70 transition-all active:scale-95 shadow-md"
      >
        <Minus className="w-4 h-4" />
      </button>
      <button
        onClick={onResetView}
        title="Center Active Target"
        className="w-8 h-8 rounded-xl glass-panel hover:bg-slate-800 text-slate-200 hover:text-cyan-300 flex items-center justify-center border border-slate-700/70 transition-all active:scale-95 shadow-md"
      >
        <Crosshair className="w-4 h-4 text-cyan-400" />
      </button>
    </div>
  );
}

function createCustomMarker(temp = null, city = '') {
  const tempBadge = temp !== null && temp !== undefined ? `${Math.round(temp)}°` : '📍';

  return L.divIcon({
    className: 'custom-weather-marker-wrapper',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="pulse-marker-ring"></div>
        <div class="pulse-marker-ring-inner"></div>
        <div class="relative z-10 px-2.5 py-1 rounded-full bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 border-2 border-white shadow-glow-cyan flex items-center gap-1.5 text-white font-mono font-extrabold text-xs cursor-pointer hover:scale-110 transition-transform">
          <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
          <span>${tempBadge}</span>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -22]
  });
}

export function MapComponent({ 
  currentLocation, 
  locationHistory = [], 
  onSelectHistoryCity 
}) {
  const [selectedLayer, setSelectedLayer] = useState('dark');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [radarActive, setRadarActive] = useState(false);
  const mapRef = useRef(null);

  const defaultCenter = [18.5204, 73.8567]; // Pune default center
  const activePosition = currentLocation 
    ? [currentLocation.lat, currentLocation.lon] 
    : defaultCenter;

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  const handleResetView = () => {
    if (mapRef.current && currentLocation) {
      mapRef.current.flyTo([currentLocation.lat, currentLocation.lon], 11, { duration: 1.5 });
    }
  };

  const activeLayerConfig = TILE_LAYERS[selectedLayer] || TILE_LAYERS.dark;

  return (
    <div className="relative w-full h-full bg-dark-950 overflow-hidden select-none">
      <MapContainer
        ref={mapRef}
        center={defaultCenter}
        zoom={6}
        zoomControl={false}
        scrollWheelZoom={true}
        className="w-full h-full z-10"
      >
        {/* Base Layer */}
        <TileLayer
          key={selectedLayer}
          url={activeLayerConfig.base}
          attribution={activeLayerConfig.attribution}
          className={activeLayerConfig.isDark ? 'osm-dark-tiles' : ''}
          maxZoom={19}
        />

        {/* Labels Overlay if configured (e.g. for Dark Canvas and Satellite) */}
        {activeLayerConfig.labels && (
          <TileLayer
            url={activeLayerConfig.labels}
            opacity={0.9}
            maxZoom={19}
            pane="overlayPane"
          />
        )}

        {/* Dynamic Simulated Radar Weather Layer */}
        {radarActive && (
          <TileLayer
            url={
              import.meta.env.VITE_WEATHER_API_KEY
                ? `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${import.meta.env.VITE_WEATHER_API_KEY}`
                : "https://tilecache.rainviewer.com/v2/radar/nowcast_0/256/{z}/{x}/{y}/2/1_1.png"
            }
            attribution="&copy; Weather Radar Network"
            opacity={0.65}
            maxZoom={18}
            pane="overlayPane"
          />
        )}

        <MapResizeHandler />
        <MapController location={currentLocation} />

        {/* Current Active Location Marker */}
        {currentLocation && (
          <Marker
            position={activePosition}
            icon={createCustomMarker(currentLocation.temp, currentLocation.city)}
          >
            <Popup className="weather-popup">
              <div className="p-1 min-w-[200px]">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                    <h3 className="font-bold text-sm text-cyan-300">
                      {currentLocation.city}, {currentLocation.country || ''}
                    </h3>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4 text-amber-400" />
                    <span className="text-xl font-extrabold text-white font-mono">
                      {currentLocation.temp !== null && currentLocation.temp !== undefined ? `${currentLocation.temp}°C` : 'N/A'}
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 capitalize">
                    {currentLocation.condition || 'Live'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300 bg-dark-950/80 p-2 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-blue-400" />
                    <span>Hum: <strong className="text-white font-mono">{currentLocation.humidity ?? 'N/A'}%</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Wind className="w-3 h-3 text-teal-400" />
                    <span>Wind: <strong className="text-white font-mono">{currentLocation.wind_speed ?? 'N/A'} m/s</strong></span>
                  </div>
                </div>

                <div className="mt-2 text-[10px] text-slate-400 text-center font-mono">
                  Coordinates: {currentLocation.lat.toFixed(2)}°, {currentLocation.lon.toFixed(2)}°
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Recently Geocoded History Markers */}
        {locationHistory.map((loc, idx) => {
          if (currentLocation && loc.city.toLowerCase() === currentLocation.city.toLowerCase()) {
            return null;
          }
          return (
            <Marker
              key={`${loc.city}-${idx}`}
              position={[loc.lat, loc.lon]}
              icon={L.divIcon({
                className: 'history-marker',
                html: `
                  <div class="px-2 py-0.5 rounded-md bg-dark-900/90 border border-cyan-400/50 text-[10px] text-slate-200 font-mono font-bold shadow-lg hover:scale-125 hover:border-cyan-300 transition-all flex items-center gap-1 cursor-pointer">
                    <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    <span>${loc.city}</span>
                  </div>
                `,
                iconSize: [60, 24],
                iconAnchor: [30, 12]
              })}
              eventHandlers={{
                click: () => onSelectHistoryCity?.(loc)
              }}
            >
              <Popup>
                <div className="text-xs p-1">
                  <strong className="text-cyan-400 text-sm block mb-1">{loc.city}</strong>
                  <p className="text-slate-300">{loc.temp ? `${loc.temp}°C — ${loc.condition}` : 'Historical Observation Point'}</p>
                  <button 
                    onClick={() => onSelectHistoryCity?.(loc)}
                    className="mt-2 text-[10px] font-bold text-cyan-300 hover:text-cyan-200 underline block"
                  >
                    Focus Station &rarr;
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Station HUD: Compact Pill on Mobile, Full Card on Desktop */}
      {currentLocation ? (
        <>
          {/* Mobile Split Pill */}
          <div className="md:hidden absolute top-2.5 left-2.5 z-20 pointer-events-auto max-w-[calc(100%-85px)] animate-fade-in">
            <div className="glass-hud rounded-xl px-2.5 py-1.5 shadow-lg border border-slate-700/80 flex items-center gap-2 text-xs text-white">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="font-bold truncate">{currentLocation.city}</span>
              <span className="font-mono text-cyan-400 font-bold shrink-0">{currentLocation.temp !== null ? `${currentLocation.temp}°C` : ''}</span>
            </div>
          </div>

          {/* Desktop Full HUD */}
          <div className="hidden md:block absolute top-4 left-4 z-20 pointer-events-auto">
            <div className="glass-hud rounded-2xl p-4 shadow-2xl border border-slate-700/80 max-w-xs transition-all animate-fade-in">
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <div className="min-w-0">
                    <h2 className="text-sm font-extrabold text-white tracking-tight leading-none truncate">
                      {currentLocation.city}
                    </h2>
                    <span className="text-[10px] text-slate-400 font-medium font-mono truncate block">
                      {currentLocation.country || 'Target Region'}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px] font-semibold uppercase tracking-wider">
                  Telemetry
                </span>
              </div>

              <div className="flex items-center justify-between bg-dark-950/60 p-2.5 rounded-xl border border-slate-800/80 mb-2.5">
                <div>
                  <span className="text-2xl font-black text-white font-mono tracking-tight flex items-baseline gap-1">
                    {currentLocation.temp !== null && currentLocation.temp !== undefined ? `${currentLocation.temp}°` : 'N/A'}
                    <span className="text-xs text-cyan-400 font-sans font-normal">C</span>
                  </span>
                  <span className="text-[11px] text-cyan-300 font-medium capitalize flex items-center gap-1">
                    <CloudSun className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="truncate">{currentLocation.condition || 'Atmospheric state'}</span>
                  </span>
                </div>
                {currentLocation.feels_like !== null && (
                  <div className="text-right border-l border-slate-800 pl-3 shrink-0">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Feels</span>
                    <span className="text-xs font-bold text-slate-200 font-mono">
                      {currentLocation.feels_like}°C
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-dark-950/50 border border-slate-800/60 text-slate-300">
                  <Droplets className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">Hum: <strong className="text-white">{currentLocation.humidity ?? 'N/A'}%</strong></span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-dark-950/50 border border-slate-800/60 text-slate-300">
                  <Wind className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span className="truncate">Wind: <strong className="text-white">{currentLocation.wind_speed ?? 'N/A'} m/s</strong></span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="absolute top-2.5 left-2.5 md:top-4 md:left-4 z-20 pointer-events-auto max-w-[calc(100%-85px)] md:max-w-xs">
          <div className="glass-hud rounded-xl px-2.5 py-1.5 md:px-3.5 md:py-2 shadow-xl border border-slate-700/80 flex items-center gap-2 text-[10px] md:text-xs text-slate-300 truncate">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
            <span className="truncate">Ask in chat to fly map</span>
          </div>
        </div>
      )}

      {/* Top Right: Map Controls Dock */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex flex-col items-end gap-2 pointer-events-auto">
        {/* Layer Style Selector + Radar Overlay */}
        <div className="flex items-center gap-2">
          {/* Radar Overlay Toggle */}
          <button
            onClick={() => setRadarActive(!radarActive)}
            title="Toggle Live Precipitation Radar"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 active:scale-95 ${
              radarActive
                ? 'bg-cyan-500/25 text-cyan-300 border-cyan-400 shadow-glow-cyan'
                : 'glass-panel text-slate-300 hover:text-white border-slate-700/70 hover:bg-slate-800'
            }`}
          >
            <Radar className={`w-3.5 h-3.5 ${radarActive ? 'text-cyan-400 animate-spin' : 'text-slate-400'}`} />
            <span>Radar</span>
          </button>

          {/* Style Selector Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              title="Change Map Style"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold glass-panel text-slate-300 hover:text-white border border-slate-700/70 hover:bg-slate-800 transition-all active:scale-95"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Theme</span>
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 mt-2 w-44 glass-panel-elevated rounded-xl py-1.5 shadow-2xl border border-cyan-500/30 z-30 animate-fade-in">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-3 py-1 border-b border-slate-800">
                  Select Map Surface
                </span>
                {Object.entries(TILE_LAYERS).map(([key, item]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedLayer(key);
                      setShowLayerMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                      selectedLayer === key 
                        ? 'text-cyan-400 font-bold bg-cyan-950/40 border-l-2 border-cyan-400' 
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Custom Zoom Controls */}
        <CustomMapControls 
          onZoomIn={handleZoomIn} 
          onZoomOut={handleZoomOut} 
          onResetView={handleResetView} 
        />
      </div>

      {/* Bottom Bar: Quick Recent Points Ticker & Geo-HUD */}
      <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none flex items-center justify-between">
        {/* Coordinates HUD */}
        <div className="glass-panel rounded-xl px-3 py-1.5 border border-slate-800 text-[11px] font-mono text-slate-400 pointer-events-auto flex items-center gap-2 shadow-lg">
          <Navigation className="w-3 h-3 text-cyan-400" />
          <span>
            {currentLocation ? `${currentLocation.lat.toFixed(2)}° N, ${currentLocation.lon.toFixed(2)}° E` : 'GLOBAL GRID ACTIVE'}
          </span>
        </div>

        {/* Recent Points Ticker */}
        {locationHistory.length > 0 && (
          <div className="glass-panel rounded-xl p-1.5 max-w-sm sm:max-w-md shadow-xl border border-slate-800 pointer-events-auto hidden sm:flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              History:
            </span>
            <div className="flex items-center gap-1">
              {locationHistory.slice(-5).reverse().map((loc, idx) => (
                <button
                  key={`${loc.city}-${idx}`}
                  onClick={() => onSelectHistoryCity?.(loc)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all active:scale-95 truncate max-w-[120px] ${
                    currentLocation && currentLocation.city.toLowerCase() === loc.city.toLowerCase()
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 font-bold'
                      : 'bg-dark-950/80 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                  }`}
                >
                  {loc.city} {loc.temp !== null && `${Math.round(loc.temp)}°`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default MapComponent;
