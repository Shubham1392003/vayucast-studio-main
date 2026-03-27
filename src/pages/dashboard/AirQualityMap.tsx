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

        {loading && (
          <div className="absolute bottom-4 right-4 rounded-full bg-card/90 px-3 py-1 text-xs text-muted-foreground shadow-card">
            Updating live data...
          </div>
        )}
      </div>

      {/* ── Right Panel ──────────────────────────────────────────────────── */}
      <div className="relative flex w-full flex-col gap-5 overflow-y-auto border-t border-border/40 bg-card/95 p-5 shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.05)] backdrop-blur-xl lg:w-[360px] lg:border-l lg:border-t-0">
        
        {/* Header Section */}
        <div className="flex flex-col items-center pt-2">
          {/* Status & Refresh Top Bar */}
          <div className="absolute right-4 top-4 flex flex-row items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-background/50 px-2.5 py-1 text-[10px] font-medium border border-border/40 shadow-sm backdrop-blur-sm">
              {data ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
                  </span>
                  <span className="text-muted-foreground">Live API</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-2.5 w-2.5 text-muted-foreground/70" />
                  <span className="text-muted-foreground/70">Offline</span>
                </>
              )}
            </div>
            <button
              onClick={() => refresh()}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-background/50 text-foreground shadow-sm border border-border/40 transition-all hover:bg-secondary/80 hover:shadow"
              title="Refresh ML Prediction"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : "text-muted-foreground"}`} />
            </button>
          </div>

          <div className="relative mb-4 mt-2 flex justify-center">
            <div className="absolute -inset-4 rounded-full bg-primary/5 blur-xl"></div>
            <img src={airQualityIllustration} alt="Air quality" className="relative z-10 h-28 w-auto object-contain transition-transform duration-500 hover:scale-105 sm:h-32" />
          </div>

          <div className="text-center">
            <h3 className="font-display text-xl font-bold tracking-tight text-foreground shadow-sm">Live Air Quality Overview</h3>
            <p className="mt-1.5 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary/70" />
              Current monitoring location
            </p>
            {lastUpdated && (
              <p className="mt-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground/70">
                <Database className="h-3 w-3" />
                Updated {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="animate-in fade-in slide-in-from-top-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs text-destructive text-center shadow-sm">
            <span className="font-semibold">Connection Error:</span> {error}
          </div>
        )}

        {/* Main AQI Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Current AQI */}
          <Card className="group flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-background to-secondary/30 p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase opacity-80">Current AQI</p>
            <div className="mt-2 flex items-baseline gap-1">
              <p className={`font-display text-4xl font-bold tracking-tighter transition-colors ${getAqiColorClass(currentAqi)}`}>
                {loading && !data ? "—" : currentAqi}
              </p>
            </div>
            <p className="mt-1 text-[10px] font-medium text-muted-foreground">
              Dominant: <span className="text-foreground/80">{data?.dominant ?? "PM2.5"}</span>
            </p>
            <div className="mt-3 w-full border-t border-border/40 pt-2 text-center">
              <span className={`inline-block w-full truncate rounded-full px-2 py-1 text-[10px] font-bold tracking-wide shadow-sm transition-colors ${getAqiColorClass(currentAqi, true)}`}>
                {getAqiCategory(currentAqi)}
              </span>
            </div>
          </Card>

          {/* ML Forecast */}
          <Card className="group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/5 to-primary/10 p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md">
            <div className="absolute -right-3 -top-3 text-[50px] opacity-[0.03] transition-transform duration-500 group-hover:scale-110">🤖</div>
            <p className="text-xs font-semibold tracking-wider text-primary/80 uppercase">1Hr Forecast</p>
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <p className={`font-display text-4xl font-bold tracking-tighter transition-colors ${getAqiColorClass(predictedAqi)}`}>
                {loading && !data ? "—" : predictedAqi}
              </p>
              {data && (
                <div className={`flex h-6 w-6 items-center justify-center rounded-full ${predictedAqi > currentAqi ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                  {predictedAqi > currentAqi
                    ? <ArrowUp className="h-3.5 w-3.5" />
                    : <ArrowDown className="h-3.5 w-3.5" />
                  }
                </div>
              )}
            </div>
            <p className="mt-1 text-[10px] font-medium text-muted-foreground">Predicted AQI</p>
            <div className="mt-3 w-full border-t border-primary/10 pt-2 text-center">
              <p className="text-[10px] font-bold text-primary tracking-wide">
                Confidence: {data ? `${confidence}%` : "—"}
              </p>
            </div>
          </Card>
        </div>

        {/* Environmental Factors */}
        <Card className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm transition-all hover:shadow-md">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/30">
              <Wind className="h-4 w-4 text-accent-foreground" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Environmental Impact</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="space-y-1 rounded-xl bg-secondary/20 p-2.5">
              <p className="pb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Conditions</p>
              <p className="text-xs font-semibold text-foreground">Dir: <span className="font-normal opacity-90">{data?.weather?.windDirectionLabel ?? "—"}</span></p>
              <p className="text-xs font-semibold text-foreground">Speed: <span className="font-normal opacity-90">{data?.weather?.windSpeed ?? "—"} km/h</span></p>
              <p className="text-xs font-semibold text-foreground">Temp: <span className="font-normal opacity-90">{data?.weather?.temperature ?? "—"}°C</span></p>
            </div>
            <div className="space-y-1 rounded-xl bg-secondary/20 p-2.5">
              <p className="pb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Affected Zones</p>
              <p className="flex items-center justify-between text-xs">
                <span className="truncate opacity-90 pr-1">{data?.windImpact?.affectedSector ?? "Sector West"}</span>
                <span className="font-bold text-destructive shadow-sm">+{data?.windImpact?.sectorAqiDelta ?? "—"}</span>
              </p>
              <p className="flex items-center justify-between text-xs">
                <span className="truncate opacity-90 pr-1">{data?.windImpact?.affectedZone ?? "Zone West"}</span>
                <span className="font-bold text-warning shadow-sm">+{data?.windImpact?.zoneAqiDelta ?? "—"}</span>
              </p>
            </div>
          </div>
        </Card>

        {/* Exposure risk */}
        <Card className="relative overflow-hidden rounded-2xl border border-border/40 bg-card p-4 shadow-sm transition-all hover:shadow-md">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-secondary/30 pointer-events-none to-transparent"></div>
          <div className="relative z-10">
            <h3 className="text-sm font-bold text-foreground">Exposure Risk Assessment</h3>
            
            <div className="mt-3 flex items-center gap-3">
              <span className={`shrink-0 rounded-xl border-2 px-3 py-1.5 text-xs font-extrabold tracking-wide uppercase shadow-sm ${getAqiColorClass(currentAqi)} border-current bg-background/50 backdrop-blur-sm`}>
                {data?.exposure?.riskLevel ?? "CALCULATING"}
              </span>
              <p className="text-xs leading-snug text-muted-foreground">
                {data?.exposure?.recommendation ?? "Fetching real-time risk assessment..."}
              </p>
            </div>
            
            {data?.predictionMethod && (
              <div className="mt-3 border-t border-border/40 pt-2 flex items-center gap-1.5">
                <Activity className="h-3 w-3 text-primary/60" />
                <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                  Model: {data.predictionMethod}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AirQualityMap;