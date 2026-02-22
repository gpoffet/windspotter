import { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface GeoAdminResult {
  label: string;
  detail: string;
  lat: number;
  lon: number;
  origin: string;
}

export interface SearchResult {
  lat: number;
  lon: number;
  label: string;
  detail: string;
  origin: string;
}

interface SpotLocationPickerProps {
  lat?: number;
  lon?: number;
  onChange: (lat: number, lon: number) => void;
  onSearchSelect?: (result: SearchResult) => void;
}

const DEFAULT_CENTER: [number, number] = [46.50, 6.60];
const DEFAULT_ZOOM = 10;
const EDIT_ZOOM = 14;

function roundCoord(v: number): number {
  return Math.round(v * 10000) / 10000;
}

const PICKER_ICON = L.divIcon({
  className: '',
  iconSize: [32, 42],
  iconAnchor: [16, 40],
  html: `<svg style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));cursor:grab" width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 2C8.82 2 3 7.82 3 15c0 10 13 25 13 25s13-15 13-25c0-7.18-5.82-13-13-13z" fill="#ea580c" stroke="#9a3412" stroke-width="1.5"/>
    <circle cx="16" cy="15" r="5" fill="white"/>
  </svg>`,
});

// --- Sub-components rendered inside MapContainer ---

function MapRefSetter({ onMap }: { onMap: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onMap(map);
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map, onMap]);
  return null;
}

function DraggableMarker({ lat, lon, onChange }: { lat: number; lon: number; onChange: (lat: number, lon: number) => void }) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const pos = marker.getLatLng();
        onChange(roundCoord(pos.lat), roundCoord(pos.lng));
      }
    },
  };

  return (
    <Marker
      draggable
      position={[lat, lon]}
      icon={PICKER_ICON}
      ref={markerRef}
      eventHandlers={eventHandlers}
    />
  );
}

function MapClickHandler({ onChange }: { onChange: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(roundCoord(e.latlng.lat), roundCoord(e.latlng.lng));
    },
  });
  return null;
}

// --- Main component ---

export function SpotLocationPicker({ lat, lon, onChange, onSearchSelect }: SpotLocationPickerProps) {
  const hasCoords = lat != null && lon != null;
  const center: [number, number] = hasCoords ? [lat, lon] : DEFAULT_CENTER;
  const zoom = hasCoords ? EDIT_ZOOM : DEFAULT_ZOOM;

  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(
    hasCoords ? { lat, lon } : null,
  );

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoAdminResult[]>([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePositionChange = useCallback((newLat: number, newLon: number) => {
    setPos({ lat: newLat, lon: newLon });
    onChange(newLat, newLon);
  }, [onChange]);

  function handleSearchChange(value: string) {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=${encodeURIComponent(trimmed)}&origins=zipcode,gg25&type=locations&limit=8&sr=4326`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.results?.map((r: Record<string, unknown>) => r.attrs as GeoAdminResult) ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  function handleSelectResult(r: GeoAdminResult) {
    const rLat = roundCoord(r.lat);
    const rLon = roundCoord(r.lon);
    mapInstance?.flyTo([rLat, rLon], EDIT_ZOOM);
    setPos({ lat: rLat, lon: rLon });
    setQuery('');
    setResults([]);

    if (onSearchSelect) {
      onSearchSelect({ lat: rLat, lon: rLon, label: r.label, detail: r.detail, origin: r.origin });
    } else {
      onChange(rLat, rLon);
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
        {/* Search overlay */}
        <div className="absolute top-2 left-12 right-2 z-[1000]">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Rechercher un lieu ou NPA..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm shadow-md focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">...</div>
            )}
          </div>

          {results.length > 0 && (
            <div className="mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectResult(r)}
                  className="w-full text-left px-3 py-2 text-sm text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                  dangerouslySetInnerHTML={{ __html: r.label }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom
          className="h-[250px] w-full [&_.leaflet-tile-pane]:dark:brightness-[0.8] [&_.leaflet-tile-pane]:dark:contrast-[1.1]"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRefSetter onMap={setMapInstance} />
          <MapClickHandler onChange={handlePositionChange} />
          {pos && <DraggableMarker lat={pos.lat} lon={pos.lon} onChange={handlePositionChange} />}
        </MapContainer>
      </div>

      {/* Coordinate display */}
      {pos && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {pos.lat.toFixed(4)}, {pos.lon.toFixed(4)}
        </p>
      )}
    </div>
  );
}
