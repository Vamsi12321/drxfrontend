"use client";
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/drx";

// Fix Leaflet default marker icons (break in bundlers)
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// ── Geocode helpers (use existing server proxy) ──
async function searchLocation(query) {
  const res = await fetch(`${BASE_PATH}/api/v1/geocode?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

async function reverseGeocode(lat, lng) {
  const res = await fetch(`${BASE_PATH}/api/v1/geocode?lat=${lat}&lng=${lng}`);
  if (!res.ok) throw new Error("Reverse geocode failed");
  return res.json();
}

function buildData(lat, lng, geo) {
  const s = geo?.structured || {};
  return {
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6)),
    address: geo?.display_name || "",
    area: s.area || "",
    city: s.city || "",
    district: s.district || "",
    state: s.state || "",
    country: s.country || "",
    postcode: s.postcode || "",
  };
}

// Recenter map when position changes
function MapUpdater({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 15, { animate: true });
  }, [map, position]);
  return null;
}

// Handle map clicks
function ClickHandler({ onChange }) {
  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;
      try {
        const geo = await reverseGeocode(lat, lng);
        onChange(lat, lng, buildData(lat, lng, geo));
      } catch {
        onChange(lat, lng, { latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) });
      }
    },
  });
  return null;
}

// Draggable marker
function DraggableMarker({ position, onChange }) {
  const ref = useRef(null);
  return (
    <Marker
      position={position}
      icon={markerIcon}
      draggable
      ref={ref}
      eventHandlers={{
        async dragend() {
          const { lat, lng } = ref.current.getLatLng();
          try {
            const geo = await reverseGeocode(lat, lng);
            onChange(lat, lng, buildData(lat, lng, geo));
          } catch {
            onChange(lat, lng, { latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) });
          }
        },
      }}
    />
  );
}

/**
 * LocationPicker — map + GPS + search. Calls onChange(lat, lng, data) whenever
 * the location is set by any of the three methods.
 */
export default function LocationPicker({ position, onChange }) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const debounceRef = useRef(null);
  const defaultCenter = [17.385, 78.4867]; // Hyderabad

  useEffect(() => { setMounted(true); }, []);

  // Debounced search
  const handleType = (val) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 3) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try { setResults(await searchLocation(val)); } catch { setResults([]); }
      setSearching(false);
    }, 400);
  };

  const selectResult = (r) => {
    const lat = parseFloat(r.lat), lng = parseFloat(r.lon);
    onChange(lat, lng, buildData(lat, lng, r));
    setResults([]);
    setQuery(r.display_name.split(",")[0]);
  };

  const detectGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const geo = await reverseGeocode(latitude, longitude);
          onChange(latitude, longitude, buildData(latitude, longitude, geo));
        } catch {
          onChange(latitude, longitude, { latitude: Number(latitude.toFixed(6)), longitude: Number(longitude.toFixed(6)) });
        }
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-2">
      {/* Search + GPS row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={query} onChange={(e) => handleType(e.target.value)}
            placeholder="Search hospital, clinic or address..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#5b2bce]/20 focus:border-[#5b2bce]" />
          {searching && (
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin w-3.5 h-3.5 text-[#5b2bce]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          )}
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[1000] max-h-52 overflow-y-auto">
              {results.map((r, i) => (
                <button key={r.place_id || i} type="button" onClick={() => selectResult(r)}
                  className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-0">
                  <svg className="w-3.5 h-3.5 text-[#5b2bce] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="text-[11px] text-gray-700 leading-snug">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" onClick={detectGPS} disabled={gpsLoading}
          className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 border border-purple-200 text-[#5b2bce] rounded-xl text-xs font-semibold hover:bg-purple-100 transition-all disabled:opacity-60 flex-shrink-0">
          {gpsLoading ? (
            <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          )}
          <span className="hidden sm:inline">{gpsLoading ? "Locating..." : "Current Location"}</span>
        </button>
      </div>

      {/* Map */}
      <div className="h-52 rounded-xl overflow-hidden border border-gray-200 relative z-0">
        {mounted ? (
          <MapContainer center={position || defaultCenter} zoom={position ? 15 : 5} scrollWheelZoom className="h-full w-full">
            <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapUpdater position={position} />
            <ClickHandler onChange={onChange} />
            {position && <DraggableMarker position={position} onChange={onChange} />}
          </MapContainer>
        ) : (
          <div className="h-full w-full bg-gray-100 animate-pulse" />
        )}
      </div>
      <p className="text-[10px] text-gray-400">Tap the map or drag the pin to set exact location. All fields stay editable below.</p>
    </div>
  );
}
