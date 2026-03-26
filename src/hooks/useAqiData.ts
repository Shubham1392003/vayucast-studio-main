import { useState, useEffect, useCallback, useRef } from "react";

export interface WeatherInfo {
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  windDirectionLabel: string;
  dewPoint: number;
}

export interface ExposureInfo {
  riskLevel: string;
  recommendation: string;
  category: string;
}

export interface WindImpact {
  direction: string;
  affectedSector: string;
  affectedZone: string;
  sectorAqiDelta: number;
  zoneAqiDelta: number;
}

export interface Factor {
  name: string;
  value: number;
}

export interface TrendPoint {
  time: string;
  aqi: number;
  pm25: number | null;
}

export interface AqiPayload {
  success: boolean;
  timestamp: string;
  source: string;
  lat: number;
  lon: number;

  currentAqi: number;
  predictedAqi: number;
  aqiChangePct: number;
  confidence: number;
  predictionMethod: string;
  dominant: string;
  category: string;
  recommendation: string;

  currentPm25: number;
  predictedPm25: number;
  currentPm10: number;

  weather: WeatherInfo;
  exposure: ExposureInfo;
  windImpact: WindImpact;
  factors: Factor[];
  trend24h: TrendPoint[];
}

interface UseAqiDataReturn {
  data: AqiPayload | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: (lat?: number, lon?: number) => void;
}

const ML_BACKEND_URL = import.meta.env.VITE_ML_BACKEND_URL || "http://localhost:5000";
const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

// In-memory cache so every page gets the same data without redundant fetches
let cachedData: AqiPayload | null = null;
let cacheTime: number | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

// Shared listeners so all hook instances update together
type Listener = (data: AqiPayload | null, loading: boolean, error: string | null) => void;
const listeners: Set<Listener> = new Set();

let fetchInProgress = false;

async function fetchAndBroadcast(lat: number, lon: number): Promise<void> {
  if (fetchInProgress) return;
  fetchInProgress = true;
  listeners.forEach((fn) => fn(cachedData, true, null));

  try {
    const res = await fetch(`${ML_BACKEND_URL}/api/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lon }),
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const json: AqiPayload = await res.json();

    if (!json.success) throw new Error("Backend returned success:false");

    cachedData = json;
    cacheTime = Date.now();
    listeners.forEach((fn) => fn(json, false, null));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error";
    console.error("[useAqiData] fetch error:", msg);
    listeners.forEach((fn) => fn(cachedData, false, `ML backend unavailable: ${msg}`));
  } finally {
    fetchInProgress = false;
  }
}

export function useAqiData(lat?: number, lon?: number): UseAqiDataReturn {
  const [data, setData] = useState<AqiPayload | null>(cachedData);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Track coordinates with a ref to avoid stale closures
  const coordsRef = useRef({ lat: lat ?? 18.5204, lon: lon ?? 73.8567 });
  useEffect(() => {
    coordsRef.current = { lat: lat ?? 18.5204, lon: lon ?? 73.8567 };
  }, [lat, lon]);

  const listener = useCallback<Listener>((d, l, e) => {
    setData(d);
    setLoading(l);
    setError(e);
    if (d) setLastUpdated(new Date());
  }, []);

  const refresh = useCallback((newLat?: number, newLon?: number) => {
    cacheTime = null; // invalidate cache
    if (newLat !== undefined && newLon !== undefined) {
      coordsRef.current = { lat: newLat, lon: newLon };
    }
    fetchAndBroadcast(coordsRef.current.lat, coordsRef.current.lon);
  }, []);

  useEffect(() => {
    listeners.add(listener);

    // If cache is fresh, emit immediately
    if (cachedData && cacheTime && Date.now() - cacheTime < CACHE_TTL_MS) {
      listener(cachedData, false, null);
    } else {
      // Try user geolocation first, then fallback
      if (lat !== undefined && lon !== undefined) {
        fetchAndBroadcast(lat, lon);
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            coordsRef.current = { lat: coords.latitude, lon: coords.longitude };
            fetchAndBroadcast(coords.latitude, coords.longitude);
          },
          () => fetchAndBroadcast(coordsRef.current.lat, coordsRef.current.lon),
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
        );
      } else {
        fetchAndBroadcast(coordsRef.current.lat, coordsRef.current.lon);
      }
    }

    // Auto-refresh interval
    const interval = setInterval(() => {
      fetchAndBroadcast(coordsRef.current.lat, coordsRef.current.lon);
    }, REFRESH_INTERVAL_MS);

    return () => {
      listeners.delete(listener);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error, lastUpdated, refresh };
}
