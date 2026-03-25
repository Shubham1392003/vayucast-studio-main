import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Activity, RefreshCcw, Wind, MapPin, Wifi, WifiOff } from "lucide-react";
import airQualityIllustration from "@/assets/air-quality-illustration.png";
import { useEffect, useMemo, useState } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { useAqiData } from "@/hooks/useAqiData";

const mapContainerStyle = { width: "100%", height: "100%" };

const DEFAULT_LOCATION = { lat: 18.5204, lon: 73.8567 };

/* ── AQI helpers ─────────────────────────────────────────────────────────── */
const getAqiColorClass = (aqi: number, bg = false) => {
  if (aqi <= 50)  return bg ? "bg-success text-success-foreground"   : "text-success";
  if (aqi <= 100) return bg ? "bg-warning text-warning-foreground"   : "text-warning";
  if (aqi <= 150) return bg ? "bg-warning text-warning-foreground"   : "text-warning";
  if (aqi <= 200) return bg ? "bg-destructive text-destructive-foreground" : "text-destructive";
  return bg ? "bg-destructive text-destructive-foreground" : "text-destructive";
};

const getAqiCategory = (aqi: number) => {
  if (aqi <= 50)  return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
};

const getMarkerColor = (aqi: number) => {
  if (aqi <= 50)  return "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
  if (aqi <= 100) return "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png";
  if (aqi <= 150) return "http://maps.google.com/mapfiles/ms/icons/orange-dot.png";
  return "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
};

/* ── Component ───────────────────────────────────────────────────────────── */
const AirQualityMap = () => {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(true);

  const { data, loading, error, lastUpdated, refresh } = useAqiData(location.lat, location.lon);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    id: "google-map-script",
  });

  // Geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setLocation({ lat: coords.latitude, lon: coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  const junctionPositions = useMemo(() => ({
    user:      { lat: location.lat,         lng: location.lon },
    junctionA: { lat: location.lat + 0.01,  lng: location.lon + 0.01 },
    junctionB: { lat: location.lat - 0.012, lng: location.lon + 0.008 },
  }), [location]);

  // Derived AQI values for junction markers (estimated ± current)
  const junctionA = data ? Math.max(0, data.currentAqi + (data.windImpact?.sectorAqiDelta ?? 8))  : 92;
  const junctionB = data ? Math.max(0, data.currentAqi - (data.windImpact?.zoneAqiDelta  ?? 12)) : 68;

  const currentAqi  = data?.currentAqi  ?? 85;
  const predictedAqi = data?.predictedAqi ?? 80;
  const confidence   = data?.confidence  ?? 0;

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

  return (
    <div className="flex h-full flex-col gap-0 overflow-hidden rounded-2xl lg:flex-row">
      {/* ── Map Area ─────────────────────────────────────────────────────── */}
      <div className="relative min-h-[320px] flex-1 bg-secondary/20 sm:min-h-[420px]">
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
            {/* User location marker */}
            <Marker
              position={junctionPositions.user}
              title="Your Current Location"
              onClick={() => setSelectedMarker("user")}
            />
            <Marker
              position={junctionPositions.junctionA}
              title="Junction A – City Center"
              icon={getMarkerColor(junctionA)}
              onClick={() => setSelectedMarker("junctionA")}
            />
            <Marker
              position={junctionPositions.junctionB}
              title="Junction B – Northern Outskirts"
              icon={getMarkerColor(junctionB)}
              onClick={() => setSelectedMarker("junctionB")}
            />

            {selectedMarker === "user" && (
              <InfoWindow position={junctionPositions.user} onCloseClick={() => setSelectedMarker(null)}>
                <div className="p-1">
                  <h4 className="font-bold">Current Location</h4>
                  <p>AQI: {currentAqi}</p>
                  <p>Status: {getAqiCategory(currentAqi)}</p>
                  {data?.weather && <p>Temp: {data.weather.temperature}°C · Wind: {data.weather.windSpeed} km/h</p>}
                </div>
              </InfoWindow>
            )}
            {selectedMarker === "junctionA" && (
              <InfoWindow position={junctionPositions.junctionA} onCloseClick={() => setSelectedMarker(null)}>
                <div className="p-1">
                  <h4 className="font-bold">Junction A – City Center</h4>
                  <p>AQI: {junctionA}</p>
                  <p>Status: {getAqiCategory(junctionA)}</p>
                </div>
              </InfoWindow>
            )}
            {selectedMarker === "junctionB" && (
              <InfoWindow position={junctionPositions.junctionB} onCloseClick={() => setSelectedMarker(null)}>
                <div className="p-1">
                  <h4 className="font-bold">Junction B – Northern Outskirts</h4>
                  <p>AQI: {junctionB}</p>
                  <p>Status: {getAqiCategory(junctionB)}</p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        )}

        {/* Floating overlay – Junction A */}
        <div className="absolute bottom-4 left-4 rounded-xl bg-card/95 p-3 shadow-card backdrop-blur">
          <p className="text-xs text-muted-foreground">Junction A – City Center</p>
          <div className="mt-1 flex items-center gap-3">
            <div>
              <span className="text-xs text-muted-foreground">AQI</span>
              <p className="font-display text-2xl font-bold text-foreground">{junctionA}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${getAqiColorClass(junctionA, true)}`}>
              {getAqiCategory(junctionA)}
            </span>
          </div>
        </div>

        {/* Floating overlay – Junction B */}
        <div className="absolute right-4 top-4 rounded-xl bg-card/95 p-3 shadow-card backdrop-blur">
          <p className="text-xs text-muted-foreground">Junction B – Northern Outskirts</p>
          <div className="mt-1 flex items-center gap-3">
            <div>
              <span className="text-xs text-muted-foreground">AQI</span>
              <p className="font-display text-2xl font-bold text-foreground">{junctionB}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${getAqiColorClass(junctionB, true)}`}>
              {getAqiCategory(junctionB)}
            </span>
          </div>
        </div>

        {loading && (
          <div className="absolute bottom-4 right-4 rounded-full bg-card/90 px-3 py-1 text-xs text-muted-foreground shadow-card">
            Updating live data...
          </div>
        )}
      </div>

      {/* ── Right Panel ──────────────────────────────────────────────────── */}
      <div className="relative w-full space-y-4 overflow-y-auto border-t border-border bg-card p-4 lg:w-80 lg:border-l lg:border-t-0">
        {/* Refresh + status */}
        <div className="absolute right-3 top-3 flex items-center gap-2">
          {/* Backend connectivity indicator */}
          {data ? (
            <Wifi className="h-3 w-3 text-success" title={`Source: ${data.source}`} />
          ) : (
            <WifiOff className="h-3 w-3 text-muted-foreground" />
          )}
          <button
            onClick={refresh}
            className="rounded-lg bg-secondary p-2 text-secondary-foreground hover:bg-secondary/80"
            title="Refresh ML Prediction"
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
          {lastUpdated && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* AQI cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Current AQI */}
          <Card className="border-none bg-gradient-to-br from-secondary to-background p-3 text-center shadow-card">
            <p className="text-xs text-muted-foreground">Current AQI</p>
            <p className={`font-display text-3xl font-bold ${getAqiColorClass(currentAqi)}`}>
              {loading && !data ? "—" : currentAqi}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              Dominant: {data?.dominant ?? "PM2.5"}
            </p>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${getAqiColorClass(currentAqi, true)}`}>
              {getAqiCategory(currentAqi)}
            </span>
          </Card>

          {/* ML Forecast */}
          <Card className="relative overflow-hidden border-none bg-gradient-to-br from-secondary to-background p-3 text-center shadow-card">
            <div className="absolute -right-2 -top-2 text-[40px] opacity-5">🤖</div>
            <p className="text-xs text-muted-foreground">ML 1Hr Forecast</p>
            <div className="flex items-center justify-center gap-1">
              <p className={`font-display text-3xl font-bold ${getAqiColorClass(predictedAqi)}`}>
                {loading && !data ? "—" : predictedAqi}
              </p>
              {data && (
                predictedAqi > currentAqi
                  ? <ArrowUp className="h-4 w-4 text-destructive" />
                  : <ArrowDown className="h-4 w-4 text-success" />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">Predicted AQI</p>
            <p className="text-[10px] font-medium text-primary">
              Confidence: {data ? `${confidence}%` : "—"}
            </p>
          </Card>
        </div>

        {/* Wind impact */}
        <Card className="border-none bg-accent/20 p-3 shadow-card">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-foreground">
                <Wind className="h-3 w-3" /> Wind Impact
              </p>
              <p className="text-[11px] text-muted-foreground">
                Direction: {data?.weather?.windDirectionLabel ?? "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Speed: {data?.weather?.windSpeed ?? "—"} km/h
              </p>
              <p className="text-[11px] text-muted-foreground">
                Temp: {data?.weather?.temperature ?? "—"}°C
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-foreground">Affected Areas:</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {data?.windImpact?.affectedSector ?? "Sector West"}{" "}
                <span className="font-bold text-destructive">
                  +{data?.windImpact?.sectorAqiDelta ?? "—"} AQI
                </span>
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {data?.windImpact?.affectedZone ?? "Zone West"}{" "}
                <span className="font-bold text-warning">
                  +{data?.windImpact?.zoneAqiDelta ?? "—"} AQI
                </span>
              </p>
            </div>
          </div>
        </Card>

        {/* Exposure risk */}
        <Card className="border-none p-3 shadow-card">
          <p className="text-center text-xs font-semibold text-foreground">Exposure Risk Assessment</p>
          <div className="mt-2 flex justify-center">
            <span className={`rounded-full border-2 px-4 py-1 text-xs font-bold ${getAqiColorClass(currentAqi)} border-current`}>
              {data?.exposure?.riskLevel ?? "CALCULATING..."}
            </span>
          </div>
          <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
            {data?.exposure?.recommendation ?? "Fetching real-time risk assessment..."}
          </p>
          {data?.predictionMethod && (
            <p className="mt-1 text-center text-[9px] text-muted-foreground/60">
              via {data.predictionMethod}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AirQualityMap;