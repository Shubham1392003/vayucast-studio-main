import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Radar, Activity, RefreshCcw, MapPin, Wind, Crosshair, Users, Square } from "lucide-react";
import spreadIllustration from "@/assets/spread-illustration.png";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { GoogleMap, Marker, Circle, Polyline, useJsApiLoader, InfoWindow } from "@react-google-maps/api";
import { useAqiData } from "@/hooks/useAqiData";

interface Area {
  id: string;
  name: string;
  lat: number;
  lng: number;
  baseAqi: number;
}

const mapContainerStyle = { width: "100%", height: "100%" };
const LIBRARIES: ("places")[] = ["places"];

const getWindDirectionStr = (degree: number) => {
  const directions = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"];
  const val = Math.floor(degree / 45 + 0.5);
  return directions[val % 8];
};

const getAqiCategory = (aqi: number) => {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  return "Hazardous";
};

const getAqiHexColor = (aqi: number) => {
  if (aqi <= 50) return "#22c55e"; // green
  if (aqi <= 100) return "#eab308"; // yellow
  if (aqi <= 150) return "#f97316"; // orange
  if (aqi <= 200) return "#ef4444"; // red
  return "#8b5cf6"; // purple (hazardous)
};

const PollutionSpread = () => {
  const { data, loading: dataLoading, refresh } = useAqiData();
  const [manualLocation, setManualLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [generatedAreas, setGeneratedAreas] = useState<Area[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [spreadRadius, setSpreadRadius] = useState(0); // in meters
  const [simulationStep, setSimulationStep] = useState(0);
  const intervalRef = useRef<number | ReturnType<typeof setInterval> | null>(null);

  // Animation states
  const [pulseRadius, setPulseRadius] = useState(0);
  const [windOffset, setWindOffset] = useState(0);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    id: "google-map-script",
    libraries: LIBRARIES,
  });

  // Location for simulation origin
  const location = manualLocation || (data ? { lat: data.lat, lng: data.lon } : { lat: 18.5204, lng: 73.8567 });

  // Wind metrics from data hook (moved up for filtering)
  const windDirDeg = data?.weather?.windDirection ?? 90;
  const windSpeed   = data?.weather?.windSpeed ?? 10;
  const currentAqi  = data?.currentAqi ?? 50;

  // Fetch real nearby places when location or map changes
  useEffect(() => {
    if (!mapInstance || !location || !data || !window.google) return;
    const baseAqi = data.currentAqi;
    
    const service = new window.google.maps.places.PlacesService(mapInstance);
    service.nearbySearch({
      location: new window.google.maps.LatLng(location.lat, location.lng),
      radius: 4000,
      type: "establishment" // Fetch real establishments (hospitals, schools, parks)
    }, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        
        // Compute wind flow vector to filter out upwind points
        const rad = Math.PI / 180;
        const flowLat = -Math.cos(windDirDeg * rad);
        const flowLng = -Math.sin(windDirDeg * rad);

        const downwindResults = results.filter(place => {
          const pLat = place.geometry?.location?.lat();
          const pLng = place.geometry?.location?.lng();
          if (!pLat || !pLng) return false;
          
          const dLat = pLat - location.lat;
          const dLng = pLng - location.lng;
          
          // Dot product > 0 means the place is mostly in the downwind direction
          return (dLat * flowLat) + (dLng * flowLng) > 0;
        });

        const validResults = downwindResults.slice(0, 10);
        const areas: Area[] = validResults.map((place, i) => ({
          id: place.place_id || `place-${i}`,
          name: place.name || "Unknown Area",
          lat: place.geometry?.location?.lat() || location.lat,
          lng: place.geometry?.location?.lng() || location.lng,
          baseAqi: Math.max(20, baseAqi + Math.floor((Math.random() - 0.5) * 30)),
        }));
        setGeneratedAreas(areas);
      } else {
        setGeneratedAreas([]);
      }
    });
  }, [mapInstance, location.lat, location.lng, data?.currentAqi, windDirDeg]);

  // Continuous background animations (wind + pulse)
  useEffect(() => {
    const int = setInterval(() => {
      setPulseRadius((prev) => (prev > 1000 ? 0 : prev + 5)); // Pulsing ring around source (slower)
      setWindOffset((prev) => (prev >= 100 ? 0 : prev + 0.3)); // Wind arrow movement (much slower)
    }, 50);
    return () => clearInterval(int);
  }, []);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (isRunning || !e.latLng) return;
    setManualLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    setSimulationStep(0);
    setSpreadRadius(0);
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setManualLocation({ lat: coords.latitude, lng: coords.longitude });
        refresh(coords.latitude, coords.longitude);
        setSimulationStep(0);
        setSpreadRadius(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsRunning(false);
      },
      (err) => console.error("GPS error", err),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Calculate spread movement
  const spreadCenter = useMemo(() => {
    if (!location) return null;
    
    // Cap the drift at a small number of steps so it stays anchored close to the source
    const driftStep = Math.min(simulationStep, 35); 
    const latOffset = -Math.cos((windDirDeg * Math.PI) / 180) * 0.00015; 
    const lngOffset = -Math.sin((windDirDeg * Math.PI) / 180) * 0.00015;

    return {
      lat: location.lat + (latOffset * driftStep),
      lng: location.lng + (lngOffset * driftStep),
    };
  }, [location, windDirDeg, simulationStep]);

  // Generate wind flow lines based on live direction
  const windLines = useMemo(() => {
    if (!location) return [];
    
    const lines = [];
    const latOffset = -Math.cos((windDirDeg * Math.PI) / 180) * 0.03; // length of wind visual line
    const lngOffset = -Math.sin((windDirDeg * Math.PI) / 180) * 0.03;

    for (let i = 0; i < 6; i++) {
      // random start position within ~0.06 radius
      const startLat = location.lat + (Math.random() - 0.5) * 0.06;
      const startLng = location.lng + (Math.random() - 0.5) * 0.06;
      
      lines.push([
        { lat: startLat, lng: startLng },
        { lat: startLat + latOffset, lng: startLng + lngOffset }
      ]);
    }
    return lines;
  }, [location, windDirDeg]);

  // Affected areas logic
  const affectedAreas = useMemo(() => {
    if (spreadRadius === 0 || !spreadCenter) return [];
    
    return generatedAreas.map(j => {
      const dLat = (j.lat - spreadCenter.lat) * 111000;
      const dLng = (j.lng - spreadCenter.lng) * 111000;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      
      if (dist < spreadRadius) {
        // Core intensity drops over distance and increases with steps
        const intensity = Math.max(0, Math.floor(currentAqi * (1 - dist/spreadRadius) * 0.4));
        return { ...j, addedAqi: intensity };
      }
      return null;
    }).filter(Boolean) as (Area & {addedAqi: number})[];
  }, [spreadCenter, spreadRadius, generatedAreas, currentAqi]);

  const handleRun = () => {
    if (isRunning || !location) return;
    setIsRunning(true);
    setSpreadRadius(0);
    setSimulationStep(0);
    
    let step = 0;
    intervalRef.current = setInterval(() => {
      step += 1;
      setSpreadRadius(prev => prev + 20 + (windSpeed * 0.4)); // Expands faster over more steps
      setSimulationStep(step);
      
      if (step >= 150) { // 150 steps simulation for a much broader footprint
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsRunning(false);
      }
    }, 60);
  };

  const handleStop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
  };

  const getMarkerColor = (aqi: number) => {
    if (aqi <= 50) return "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
    if (aqi <= 100) return "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png";
    if (aqi <= 150) return "http://maps.google.com/mapfiles/ms/icons/orange-dot.png";
    return "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
  };

  const spreadColor = getAqiHexColor(currentAqi);

  return (
    <div className="flex h-full flex-col gap-0 lg:flex-row">
      <div className="flex flex-1 flex-col">
        <div className="flex flex-wrap items-start gap-3 border-b border-border bg-card p-3 sm:gap-6 sm:p-4 border-t-0 shadow-sm z-10 w-full relative h-[100px] shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <Radar className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
            <div>
              <h1 className="font-display text-sm font-bold text-foreground sm:text-lg">Live Spread Simulation</h1>
              <div className="flex items-center gap-2 mt-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 px-2 text-[10px]" 
                  onClick={handleUseGps} 
                  disabled={dataLoading || isRunning}
                >
                  <Crosshair className="h-3 w-3 mr-1" /> Use GPS Target
                </Button>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Click anywhere on map to pinpoint
                </div>
              </div>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3 justify-end sm:gap-6">
            <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-lg">
              <Wind className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground leading-none">Live Wind</p>
                <p className="text-xs font-bold text-foreground">
                  {dataLoading ? "..." : data?.weather?.windDirectionLabel} @ {dataLoading ? "..." : windSpeed} km/h
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-lg">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground leading-none">Source AQI</p>
                <p className="text-xs font-bold text-foreground">{dataLoading ? "..." : currentAqi}</p>
              </div>
            </div>

            {isRunning ? (
              <Button variant="destructive" className="rounded-full px-6 shadow-glow animate-pulse" onClick={handleStop}>
                <Square className="h-4 w-4 mr-2" /> Stop Simulation
              </Button>
            ) : (
              <Button className="rounded-full px-6 shadow-glow" onClick={handleRun} disabled={dataLoading || !location}>
                Run Simulator
              </Button>
            )}
          </div>
        </div>

        <div className="relative flex-1 min-h-[400px] bg-secondary/20">
          {loadError ? (
             <div className="flex h-full flex-col items-center justify-center gap-4">
              <p className="text-destructive font-medium">Google Maps failed to load.</p>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
              >
                <RefreshCcw className="h-4 w-4" /> Reload Page
              </button>
            </div>
          ) : !isLoaded || !location ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <Activity className="h-8 w-8 animate-pulse text-primary" />
                <p className="text-sm text-muted-foreground">Locating initial position...</p>
              </div>
            </div>
          ) : (
             <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={location}
              zoom={12}
              onClick={handleMapClick}
              onLoad={setMapInstance}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: true,
                clickableIcons: false,
                gestureHandling: "greedy",
                styles: [
                  { featureType: "poi", stylers: [{ visibility: "off" }] }
                ]
              }}
            >
              {/* Origin Marker */}
              <Marker
                position={location}
                title="Simulation Origin"
                icon={{
                  url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                }}
                onClick={() => setSelectedMarker("source")}
              />

              {/* Pulse */}
              <Circle
                center={location}
                radius={pulseRadius * 1.5}
                options={{
                  strokeColor: spreadColor,
                  strokeOpacity: Math.max(0, 0.6 - pulseRadius / 2000),
                  strokeWeight: 1.5,
                  fillColor: spreadColor,
                  fillOpacity: Math.max(0, 0.25 - pulseRadius / 5000),
                  clickable: false,
                }}
              />

              {/* Wind flow lines */}
              {windLines.map((line, idx) => (
                <Polyline
                  key={`wind-${idx}`}
                  path={line}
                  options={{
                    strokeColor: spreadColor,
                    strokeOpacity: 0.15,
                    strokeWeight: 2,
                    clickable: false,
                    icons: [{
                      icon: {
                        path: typeof google !== 'undefined' ? google.maps.SymbolPath.FORWARD_CLOSED_ARROW : 0,
                        strokeColor: spreadColor,
                        fillColor: spreadColor,
                        fillOpacity: 0.8,
                        scale: 2,
                      },
                      offset: `${windOffset}%`,
                    }]
                  }}
                />
              ))}

              {/* Populated Areas */}
              {generatedAreas.map(j => (
                  <Marker
                    key={j.id}
                    position={{ lat: j.lat, lng: j.lng }}
                    title={j.name}
                    icon={getMarkerColor(j.baseAqi + (affectedAreas.find(a => a.id === j.id)?.addedAqi || 0))}
                    onClick={() => setSelectedMarker(j.id)}
                  />
              ))}

              {/* Inner Core */}
              {spreadRadius > 0 && spreadCenter && (
                <Circle
                  center={spreadCenter}
                  radius={spreadRadius * 0.3}
                  options={{
                    strokeColor: spreadColor,
                    strokeOpacity: 0.95,
                    strokeWeight: 2,
                    fillColor: spreadColor,
                    fillOpacity: Math.max(0.2, 0.7 - (simulationStep * 0.004)),
                    clickable: false,
                  }}
                />
              )}

              {/* Mid zone */}
              {spreadRadius > 0 && spreadCenter && (
                <Circle
                  center={spreadCenter}
                  radius={spreadRadius * 0.65}
                  options={{
                    strokeColor: spreadColor,
                    strokeOpacity: 0.4,
                    strokeWeight: 1.5,
                    fillColor: spreadColor,
                    fillOpacity: Math.max(0.1, 0.4 - (simulationStep * 0.002)),
                    clickable: false,
                  }}
                />
              )}

              {/* Outer zone */}
              {spreadRadius > 0 && spreadCenter && (
                <Circle
                  center={spreadCenter}
                  radius={spreadRadius}
                  options={{
                    strokeColor: spreadColor,
                    strokeOpacity: 0.2,
                    strokeWeight: 1,
                    fillColor: spreadColor,
                    fillOpacity: Math.max(0.05, 0.2 - (simulationStep * 0.001)),
                    clickable: false,
                  }}
                />
              )}

              {selectedMarker === "source" && (
                <InfoWindow position={location} onCloseClick={() => setSelectedMarker(null)}>
                  <div className="p-1 min-w-[120px]">
                    <h4 className="font-bold text-sm text-foreground">Source Focus</h4>
                    <p className="text-xs text-muted-foreground mt-1">AQI: <span className="font-bold text-foreground">{currentAqi}</span></p>
                    <p className="text-[10px] text-muted-foreground">Using live WAQI data.</p>
                  </div>
                </InfoWindow>
              )}

              {generatedAreas.map(j => selectedMarker === j.id && (
                <InfoWindow key={`info-${j.id}`} position={{ lat: j.lat, lng: j.lng }} onCloseClick={() => setSelectedMarker(null)}>
                  <div className="p-1 min-w-[140px]">
                    <h4 className="font-bold text-sm text-foreground">{j.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">Base AQI: <span className="font-bold text-foreground">{j.baseAqi}</span></p>
                    {affectedAreas.find(a => a.id === j.id) && (
                      <p className="text-xs text-destructive font-bold mt-1">+{affectedAreas.find(a => a.id === j.id)?.addedAqi} from spread!</p>
                    )}
                  </div>
                </InfoWindow>
              ))}

            </GoogleMap>
          )}

          {dataLoading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-card/90 px-4 py-1.5 text-xs text-muted-foreground shadow-card backdrop-blur-sm z-10 flex items-center gap-2">
              <Activity className="h-3 w-3 animate-pulse" />
              Scanning WAQI environment factors...
            </div>
          )}
        </div>
      </div>

      <div className="w-full relative z-10 space-y-4 overflow-y-auto border-t border-border bg-card p-4 lg:w-[320px] lg:border-l lg:border-t-0 shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.1)]">
        <div className="flex justify-center mb-6">
          <img src={spreadIllustration} alt="Spread illustration" className="h-24 w-auto object-contain drop-shadow-xl" />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="p-3 shadow-card border-none bg-accent/20">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Spread Radius</p>
            <p className="font-display text-2xl font-bold mt-1 text-foreground">
              {(spreadRadius / 1000).toFixed(2)}<span className="text-sm text-muted-foreground ml-1">km</span>
            </p>
          </Card>
          <Card className="p-3 shadow-card border-none bg-accent/20">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Affected Zones</p>
            <p className="font-display text-2xl font-bold mt-1 text-foreground">
              {affectedAreas.length}<span className="text-sm text-muted-foreground ml-1">areas</span>
            </p>
          </Card>
          <Card className="p-3 shadow-card border-none bg-accent/20">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Users className="h-3 w-3"/> Est. Population</p>
            <p className="font-display text-2xl font-bold mt-1 text-foreground">
              {Math.floor(Math.PI * Math.pow(spreadRadius / 1000, 2) * 5000).toLocaleString()}<span className="text-sm text-muted-foreground ml-1">ppl</span>
            </p>
          </Card>
          <Card className="p-3 shadow-card border-none bg-accent/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 bg-primary/20 transition-all duration-75" style={{ width: `${(simulationStep / 150) * 100}%` }} />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider z-10 relative">Progress</p>
            <p className="font-display text-2xl font-bold mt-1 text-foreground z-10 relative">
              {Math.floor((simulationStep / 150) * 100)}<span className="text-sm text-muted-foreground ml-1">%</span>
            </p>
          </Card>
        </div>

        <Card className="p-4 shadow-card border-none bg-gradient-to-br from-card to-secondary/30">
          <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Active Impact Zones
          </p>
          <div className="space-y-3">
            {affectedAreas.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4 bg-background/50 rounded-lg">
                Trajectory clear. No major areas affected yet by the current wind pattern.
              </p>
            ) : (
              affectedAreas.map(j => (
                <div key={j.id} className="flex items-center justify-between p-2 bg-background/60 rounded-lg border border-border/50 transition-all hover:bg-background/80">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground truncate">{j.name}</span>
                    <span className="text-[10px] text-muted-foreground">Base: {j.baseAqi} AQI</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-destructive">+{j.addedAqi} AQI</span>
                    <span className="text-[10px] font-medium text-destructive/80">Critical</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {affectedAreas.length > 0 ? (
          <Card className="border-destructive/30 bg-destructive/10 p-4 shadow-card mt-4 backdrop-blur-sm">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-destructive animate-pulse" />
              <div>
                <p className="text-xs font-bold text-destructive mb-1">Impact Warning</p>
                <p className="text-[11px] text-foreground/90 leading-relaxed">
                  Hazardous plume is tracking towards densely populated sectors. Issue immediate shelter-in-place alerts if AQI exceeds threshold.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="border-success/30 bg-success/10 p-4 shadow-card mt-4 backdrop-blur-sm">
            <div className="flex gap-3">
              <Activity className="h-5 w-5 shrink-0 text-success" />
              <div>
                <p className="text-xs font-bold text-success mb-1">All Clear</p>
                <p className="text-[11px] text-foreground/90 leading-relaxed">
                  Pinpoint a location and run simulation to predict environmental fallout.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PollutionSpread;
