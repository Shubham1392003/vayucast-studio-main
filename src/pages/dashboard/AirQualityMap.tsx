import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, Activity, RefreshCcw, Wind, MapPin, Wifi, WifiOff, Crosshair, Database, GraduationCap, School, Hospital } from "lucide-react";
import airQualityIllustration from "@/assets/air-quality-illustration.png";
import { useEffect, useMemo, useState } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { useAqiData } from "@/hooks/useAqiData";

const mapContainerStyle = { width: "100%", height: "100%" };

const DEFAULT_LOCATION = { lat: 18.5204, lon: 73.8567 };

/* ── AQI helpers ─────────────────────────────────────────────────────────── */
const getAqiColorClass = (aqi: number, bg = false) => {
  if (aqi <= 50) return bg ? "bg-success text-success-foreground" : "text-success";
  if (aqi <= 100) return bg ? "bg-warning text-warning-foreground" : "text-warning";
  if (aqi <= 150) return bg ? "bg-warning text-warning-foreground" : "text-warning";
  if (aqi <= 200) return bg ? "bg-destructive text-destructive-foreground" : "text-destructive";
  return bg ? "bg-destructive text-destructive-foreground" : "text-destructive";
};

const getAqiCategory = (aqi: number) => {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
};

const getMarkerColor = (aqi: number) => {
  if (aqi <= 50) return "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
  if (aqi <= 100) return "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png";
  if (aqi <= 150) return "http://maps.google.com/mapfiles/ms/icons/orange-dot.png";
  return "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
};

/* ── Component ───────────────────────────────────────────────────────────── */
const AirQualityMap = () => {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [manualLocation, setManualLocation] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [historyMarkers, setHistoryMarkers] = useState<any[]>([]);
  const [sensitiveMarkers, setSensitiveMarkers] = useState<any[]>([]);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const { data, loading, error, lastUpdated, refresh } = useAqiData(location.lat, location.lon);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    id: "google-map-script",
    libraries: ["places"]
  });

  const ML_BACKEND_URL = import.meta.env.VITE_ML_BACKEND_URL || "http://localhost:5000";

  const currentAqi = data?.currentAqi ?? 85;
  const predictedAqi = data?.predictedAqi ?? 80;
  const confidence = data?.confidence ?? 0;

  // Geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setLocation({ lat: coords.latitude, lon: coords.longitude }),
      () => { },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  // Fetch real historical points near the selected location
  useEffect(() => {
    const fetchHistoryPoints = async () => {
      try {
        const res = await fetch(`${ML_BACKEND_URL}/api/history?lat=${location.lat}&lon=${location.lon}&limit=15`);
        const json = await res.json();
        if (json.success && Array.isArray(json.history)) {
          const markers = json.history.map((h: any, i: number) => ({
            id: `history-${i}`,
            name: `Recorded reading at ${new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            position: { lat: h.lat, lng: h.lon },
            aqi: h.currentAqi,
            category: getAqiCategory(h.currentAqi),
            color: getMarkerColor(h.currentAqi),
            timestamp: h.timestamp
          }));
          setHistoryMarkers(markers);
        }
      } catch (err) {
        console.error("Failed to fetch history markers:", err);
      }
    };

    fetchHistoryPoints();
  }, [location, lastUpdated, ML_BACKEND_URL]);

  // Fetch real sensitive points (hospitals, schools, etc.) near the selected location
  useEffect(() => {
    if (!mapInstance || !location || !isLoaded) return;

    const service = new google.maps.places.PlacesService(mapInstance);
    const types = ["hospital", "school", "university"];
    
    // We'll perform a combined search or multiple searches. For simplicity, just one nearbySearch with a generic type or multiple.
    // Multiple searches are better for precision.
    let discovery: any[] = [];
    
    const performSearch = (type: string) => {
      return new Promise<void>((resolve) => {
        service.nearbySearch({
          location: { lat: location.lat, lng: location.lon },
          radius: 3000,
          type: type
        }, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            const capped = results.slice(0, 2).map(p => ({
              id: p.place_id,
              name: p.name,
              position: { lat: p.geometry?.location?.lat(), lng: p.geometry?.location?.lng() },
              type: type,
              aqi: currentAqi + (Math.random() > 0.5 ? 5 : -5), // Estimated AQI at receptor
            }));
            discovery = [...discovery, ...capped];
          }
          resolve();
        });
      });
    };

    Promise.all(types.map(t => performSearch(t))).then(() => {
      // Limit to 4-5 total to avoid clutter
      setSensitiveMarkers(discovery.slice(0, 5));
    });

  }, [location, mapInstance, isLoaded, currentAqi]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setManualLocation(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const newPos = { lat: coords.latitude, lon: coords.longitude };
        setLocation(newPos);
        refresh(newPos.lat, newPos.lon);
      },
      () => {
        setLocation(DEFAULT_LOCATION);
        refresh(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };


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
        {/* Map Hint / Reset */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 w-full justify-center">
          <div className="rounded-full bg-card/90 px-4 py-1.5 text-[10px] sm:text-xs text-muted-foreground shadow-card backdrop-blur-sm border border-border/50 truncate max-w-[200px] sm:max-w-none">
            <MapPin className="h-3 w-3 inline mr-1 text-primary" />
            {manualLocation ? "Custom Location Active" : "Click map to explore AQI"}
          </div>

          <Button
            variant={manualLocation ? "default" : "outline"}
            size="sm"
            className="h-8 rounded-full shadow-card bg-card/95 border-primary/20 hover:bg-primary/5 text-foreground hidden sm:flex"
            onClick={handleLocateMe}
            title="Go to my live GPS location"
          >
            <Crosshair className={`h-3 w-3 mr-1 ${manualLocation ? "text-primary-foreground" : "text-primary"}`} />
            {manualLocation ? "Reset to GPS" : "Locate Me"}
          </Button>
        </div>

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
            onLoad={(map) => {
              setMapInstance(map);
              setMapLoading(false);
            }}
            onClick={(e) => {
              if (e.latLng) {
                const lat = e.latLng.lat();
                const lon = e.latLng.lng();
                setLocation({ lat, lon });
                setManualLocation(true);
                refresh(lat, lon);
              }
            }}
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
              position={{ lat: location.lat, lng: location.lon }}
              title="Your Current Location"
              onClick={() => setSelectedMarker("user")}
            />

            {/* Sensitive Receptor markers */}
            {sensitiveMarkers.map((j) => (
              <Marker
                key={j.id}
                position={j.position}
                title={j.name}
                icon={{
                  url: j.type === "hospital" 
                    ? "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" 
                    : "http://maps.google.com/mapfiles/ms/icons/purple-dot.png",
                }}
                onClick={() => setSelectedMarker(j.id)}
              />
            ))}

            {/* History markers */}
            {historyMarkers.map((j) => (
              <Marker
                key={j.id}
                position={j.position}
                title={j.name}
                icon={j.color}
                onClick={() => setSelectedMarker(j.id)}
              />
            ))}

            {selectedMarker === "user" && (
              <InfoWindow
                position={{ lat: location.lat, lng: location.lon }}
                onCloseClick={() => setSelectedMarker(null)}
              >
                <div className="p-1">
                  <h4 className="font-bold">Focus Point</h4>
                  <p className="text-sm">AQI: {currentAqi}</p>
                  <p className="text-sm font-medium">{getAqiCategory(currentAqi)}</p>
                  {data?.weather && <p className="text-[10px] mt-1 opacity-70">Temp: {data.weather.temperature}°C · {data.weather.windSpeed} km/h</p>}
                </div>
              </InfoWindow>
            )}

            {sensitiveMarkers.map((j) => selectedMarker === j.id && (
              <InfoWindow
                key={`info-${j.id}`}
                position={j.position}
                onCloseClick={() => setSelectedMarker(null)}
              >
                <div className="p-1 min-w-[150px]">
                  <div className="flex items-center gap-2 mb-1">
                    {j.type === "hospital" ? <Hospital className="h-4 w-4 text-primary" /> : <GraduationCap className="h-4 w-4 text-purple-500" />}
                    <h4 className="font-bold text-sm text-foreground">Sensitive Receptor</h4>
                  </div>
                  <p className="text-[11px] font-bold text-foreground">{j.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{j.type} Zone</p>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/50">
                    <span className="text-xs">Est. AQI: <span className={`font-bold ${getAqiColorClass(j.aqi)}`}>{j.aqi}</span></span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${getAqiColorClass(j.aqi, true)}`}>{getAqiCategory(j.aqi)}</span>
                  </div>
                </div>
              </InfoWindow>
            ))}

            {historyMarkers.map((j) => selectedMarker === j.id && (
              <InfoWindow
                key={`info-${j.id}`}
                position={j.position}
                onCloseClick={() => setSelectedMarker(null)}
              >
                <div className="p-1 min-w-[150px]">
                  <h4 className="font-bold text-sm text-foreground">Historical Record</h4>
                  <p className="text-[11px] text-muted-foreground mb-1">{j.name}</p>
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/50">
                    <span className="text-xs font-medium">AQI: <span className={`font-bold ${getAqiColorClass(j.aqi)}`}>{j.aqi}</span></span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${getAqiColorClass(j.aqi, true)}`}>{j.category}</span>
                  </div>
                </div>
              </InfoWindow>
            ))}
          </GoogleMap>
        )}

        {/* Dynamic Floating Overlays for Latest 2 Historical Readings */}
        <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row gap-3 pointer-events-none">
          {historyMarkers.slice(0, 2).map((j, idx) => (
            <div
              key={idx}
              className={`rounded-xl bg-card/95 p-3 shadow-card backdrop-blur border border-border/50 animate-in fade-in slide-in-from-bottom-2 duration-500 pointer-events-auto ${idx > 0 ? "hidden md:block" : ""}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Database className="h-2.5 w-2.5 text-primary" />
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Historical Audit</p>
              </div>
              <p className="text-[10px] font-medium text-foreground truncate max-w-[150px]">{j.name}</p>
              <div className="mt-1 flex items-center gap-4">
                <div>
                  <span className="text-[9px] text-muted-foreground">Past AQI</span>
                  <p className={`font-display text-2xl font-bold ${getAqiColorClass(j.aqi)}`}>{j.aqi}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getAqiColorClass(j.aqi, true)}`}>
                  {j.category}
                </span>
              </div>
            </div>
          ))}
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
            <Wifi className="h-3 w-3 text-success" />
          ) : (
            <WifiOff className="h-3 w-3 text-muted-foreground" />
          )}
          <button
            onClick={() => refresh()}
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