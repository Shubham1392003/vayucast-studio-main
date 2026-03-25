import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Activity, RefreshCcw, Wind, MapPin } from "lucide-react";
import airQualityIllustration from "@/assets/air-quality-illustration.png";
import { useEffect, useMemo, useState, useCallback } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { simulateRandomForestPrediction, evaluateExposureRisk } from "../../lib/mlPrediction";

interface AQIData {
  currentAqi: number;
  pm25: number;
  dominant: string;
  windSpeed: number;
  windDirection: number;
  temperature: number;
  historicalAqi: number[];
  junctionA: number;
  junctionB: number;
}

const DEFAULT_LOCATION = {
  lat: 18.5204,
  lon: 73.8567,
};

const DEFAULT_DATA: AQIData = {
  currentAqi: 85,
  pm25: 35,
  dominant: "PM2.5",
  windSpeed: 12,
  windDirection: 90,
  temperature: 29,
  historicalAqi: [72, 75, 78, 80, 82, 84, 86, 85, 83, 81, 79, 77],
  junctionA: 92,
  junctionB: 68,
};

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const getWindDirection = (degree: number) => {
  const directions = [
    "North",
    "North-East",
    "East",
    "South-East",
    "South",
    "South-West",
    "West",
    "North-West",
  ];
  const val = Math.floor(degree / 45 + 0.5);
  return directions[val % 8];
};

const getAqiColorClass = (aqi: number, isBackground = false) => {
  if (aqi <= 50) return isBackground ? "bg-success text-success-foreground" : "text-success";
  if (aqi <= 100) return isBackground ? "bg-warning text-warning-foreground" : "text-warning";
  if (aqi <= 150) return isBackground ? "bg-warning text-warning-foreground" : "text-warning";
  return isBackground ? "bg-destructive text-destructive-foreground" : "text-destructive";
};

const getAqiCategory = (aqi: number) => {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  return "Hazardous";
};

const getMarkerColor = (aqi: number) => {
  if (aqi <= 50) return "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
  if (aqi <= 100) return "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png";
  if (aqi <= 150) return "http://maps.google.com/mapfiles/ms/icons/orange-dot.png";
  return "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
};

const AirQualityMap = () => {
  const [data, setData] = useState<AQIData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [location, setLocation] = useState<{ lat: number; lon: number }>(DEFAULT_LOCATION);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    id: "google-map-script",
  });

  const fetchAQIData = useCallback(async (lat: number, lon: number) => {
    try {
      setLoading(true);
      setError(null);

      const [aqiRes, weatherRes] = await Promise.all([
        fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10&hourly=us_aqi&past_days=1`
        ),
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m`
        ),
      ]);

      if (!aqiRes.ok || !weatherRes.ok) {
        throw new Error("API response failed");
      }

      const aqiData = await aqiRes.json();
      const weatherData = await weatherRes.json();

      const currentAqi = aqiData?.current?.us_aqi ?? DEFAULT_DATA.currentAqi;
      const pm25 = aqiData?.current?.pm2_5 ?? DEFAULT_DATA.pm25;
      const pm10 = aqiData?.current?.pm10 ?? 0;
      const dominant = pm25 > pm10 / 2 ? "PM2.5" : "PM10";

      setData({
        currentAqi,
        pm25,
        dominant,
        windSpeed: weatherData?.current?.wind_speed_10m ?? DEFAULT_DATA.windSpeed,
        windDirection: weatherData?.current?.wind_direction_10m ?? DEFAULT_DATA.windDirection,
        temperature: weatherData?.current?.temperature_2m ?? DEFAULT_DATA.temperature,
        historicalAqi: aqiData?.hourly?.us_aqi?.slice(-24) || DEFAULT_DATA.historicalAqi,
        junctionA: currentAqi + Math.floor(Math.random() * 20) - 10,
        junctionB: Math.max(0, currentAqi - Math.floor(Math.random() * 30)),
      });
    } catch (err) {
      console.error(err);
      setError("Live data unavailable. Showing latest available values.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fast initial load
  useEffect(() => {
    fetchAQIData(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lon: longitude });
          fetchAQIData(latitude, longitude);
        },
        () => {
          console.warn("Geolocation denied, using default location.");
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000,
        }
      );
    }
  }, [fetchAQIData]);

  // Auto refresh every 15 mins
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAQIData(location.lat, location.lon);
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [location, fetchAQIData]);

  const junctionPositions = useMemo(() => {
    return {
      user: { lat: location.lat, lng: location.lon },
      junctionA: { lat: location.lat + 0.01, lng: location.lon + 0.01 },
      junctionB: { lat: location.lat - 0.012, lng: location.lon + 0.008 },
    };
  }, [location]);

  if (loadError) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-destructive font-medium">Google Maps failed to load.</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCcw className="h-4 w-4" /> Reload Page
        </button>
      </div>
    );
  }

  const { predictedAQI, confidence } = simulateRandomForestPrediction(
    data.historicalAqi,
    data.windSpeed,
    data.temperature
  );

  const { riskLevel, recommendation } = evaluateExposureRisk(data.currentAqi);
  const windDirStr = getWindDirection(data.windDirection);

  const affected1 = Math.floor(data.windSpeed * 0.8) + 5;
  const affected2 = Math.floor(data.windSpeed * 0.4) + 2;

  return (
    <div className="flex h-full flex-col gap-0 overflow-hidden rounded-2xl lg:flex-row">
      {/* Map Area */}
      <div className="relative min-h-[320px] flex-1 bg-secondary/20 sm:min-h-[420px]">
        {/* Map Loading Overlay */}
        {(!isLoaded || mapLoading) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Activity className="h-8 w-8 animate-pulse text-primary" />
              <p className="text-sm text-muted-foreground">Loading smart pollution map...</p>
            </div>
          </div>
        )}

        {isLoaded && (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={{ lat: location.lat, lng: location.lon }}
            zoom={13}
            onLoad={() => setMapLoading(false)}
            options={{
              disableDefaultUI: false,
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true,
              clickableIcons: false,
              gestureHandling: "greedy",
            }}
          >
            {/* User Location */}
            <Marker
              position={junctionPositions.user}
              title="Your Current Location"
              onClick={() => setSelectedMarker("user")}
            />

            {/* Junction A */}
            <Marker
              position={junctionPositions.junctionA}
              title="Junction A - City Center"
              icon={getMarkerColor(data.junctionA)}
              onClick={() => setSelectedMarker("junctionA")}
            />

            {/* Junction B */}
            <Marker
              position={junctionPositions.junctionB}
              title="Junction B - Northern Outskirts"
              icon={getMarkerColor(data.junctionB)}
              onClick={() => setSelectedMarker("junctionB")}
            />

            {selectedMarker === "user" && (
              <InfoWindow position={junctionPositions.user} onCloseClick={() => setSelectedMarker(null)}>
                <div className="p-1">
                  <h4 className="font-bold">Current Location</h4>
                  <p>AQI: {data.currentAqi}</p>
                  <p>Status: {getAqiCategory(data.currentAqi)}</p>
                </div>
              </InfoWindow>
            )}

            {selectedMarker === "junctionA" && (
              <InfoWindow position={junctionPositions.junctionA} onCloseClick={() => setSelectedMarker(null)}>
                <div className="p-1">
                  <h4 className="font-bold">Junction A - City Center</h4>
                  <p>AQI: {data.junctionA}</p>
                  <p>Status: {getAqiCategory(data.junctionA)}</p>
                </div>
              </InfoWindow>
            )}

            {selectedMarker === "junctionB" && (
              <InfoWindow position={junctionPositions.junctionB} onCloseClick={() => setSelectedMarker(null)}>
                <div className="p-1">
                  <h4 className="font-bold">Junction B - Northern Outskirts</h4>
                  <p>AQI: {data.junctionB}</p>
                  <p>Status: {getAqiCategory(data.junctionB)}</p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        )}

        {/* Floating Cards */}
        <div className="absolute bottom-4 left-4 rounded-xl bg-card/95 p-3 shadow-card backdrop-blur">
          <p className="text-xs text-muted-foreground">Junction A – City Center</p>
          <div className="mt-1 flex items-center gap-3">
            <div>
              <span className="text-xs text-muted-foreground">AQI</span>
              <p className="font-display text-2xl font-bold text-foreground">{data.junctionA}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${getAqiColorClass(data.junctionA, true)}`}>
              {getAqiCategory(data.junctionA)}
            </span>
          </div>
        </div>

        <div className="absolute right-4 top-4 rounded-xl bg-card/95 p-3 shadow-card backdrop-blur">
          <p className="text-xs text-muted-foreground">Junction B – Northern Outskirts</p>
          <div className="mt-1 flex items-center gap-3">
            <div>
              <span className="text-xs text-muted-foreground">AQI</span>
              <p className="font-display text-2xl font-bold text-foreground">{data.junctionB}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${getAqiColorClass(data.junctionB, true)}`}>
              {getAqiCategory(data.junctionB)}
            </span>
          </div>
        </div>

        {loading && (
          <div className="absolute bottom-4 right-4 rounded-full bg-card/90 px-3 py-1 text-xs text-muted-foreground shadow-card">
            Updating live data...
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div className="relative w-full space-y-4 overflow-y-auto border-t border-border bg-card p-4 lg:w-80 lg:border-l lg:border-t-0">
        <div className="absolute right-3 top-3">
          <button
            onClick={() => fetchAQIData(location.lat, location.lon)}
            className="rounded-lg bg-secondary p-2 text-secondary-foreground hover:bg-secondary/80"
            title="Refresh Model"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex justify-center">
          <img src={airQualityIllustration} alt="Air quality" className="h-24 w-auto object-contain sm:h-32" />
        </div>

        <div className="text-center">
          <h3 className="font-display text-lg font-bold text-foreground">Live Air Quality Overview</h3>
          <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            Current monitoring location
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Card className="border-none bg-gradient-to-br from-secondary to-background p-3 text-center shadow-card">
            <p className="text-xs text-muted-foreground">Current AQI</p>
            <p className={`font-display text-3xl font-bold ${getAqiColorClass(data.currentAqi)}`}>
              {data.currentAqi}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">Dominant: {data.dominant}</p>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${getAqiColorClass(data.currentAqi, true)}`}>
              {getAqiCategory(data.currentAqi)}
            </span>
          </Card>

          <Card className="relative overflow-hidden border-none bg-gradient-to-br from-secondary to-background p-3 text-center shadow-card">
            <div className="absolute -right-2 -top-2 text-[40px] opacity-5">🤖</div>
            <p className="text-xs text-muted-foreground">ML 1Hr Forecast</p>
            <div className="flex items-center justify-center gap-1">
              <p className={`font-display text-3xl font-bold ${getAqiColorClass(predictedAQI)}`}>
                {predictedAQI}
              </p>
              {predictedAQI > data.currentAqi ? (
                <ArrowUp className="h-4 w-4 text-destructive" />
              ) : (
                <ArrowDown className="h-4 w-4 text-success" />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">Predicted AQI</p>
            <p className="text-[10px] font-medium text-primary">Confidence: {confidence}%</p>
          </Card>
        </div>

        <Card className="border-none bg-accent/20 p-3 shadow-card">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-foreground">
                <Wind className="h-3 w-3" /> Wind Impact
              </p>
              <p className="text-[11px] text-muted-foreground">Direction: {windDirStr}</p>
              <p className="text-[11px] text-muted-foreground">Speed: {data.windSpeed} km/h</p>
              <p className="text-[11px] text-muted-foreground">Temp: {data.temperature}°C</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-foreground">Affected Areas:</p>
              <p className="truncate text-[11px] text-muted-foreground">
                Sector {windDirStr} <span className="font-bold text-destructive">+{affected1} AQI</span>
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                Zone {windDirStr} <span className="font-bold text-warning">+{affected2} AQI</span>
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-none p-3 shadow-card">
          <p className="text-center text-xs font-semibold text-foreground">Exposure Risk Assessment</p>
          <div className="mt-2 flex justify-center">
            <span className={`rounded-full border-2 px-4 py-1 text-xs font-bold ${getAqiColorClass(data.currentAqi)} border-current`}>
              {riskLevel}
            </span>
          </div>
          <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
            {recommendation}
          </p>
        </Card>
      </div>
    </div>
  );
};

export default AirQualityMap;