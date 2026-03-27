import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Radar, Activity, RefreshCcw, MapPin, Wind, Crosshair, Users, Square } from "lucide-react";
import spreadIllustration from "@/assets/spread-illustration.png";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { GoogleMap, Marker, Circle, Polyline, Polygon, useJsApiLoader, InfoWindow } from "@react-google-maps/api";
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
        
        // Fetch surrounding locations to show context (not just downwind ones)
        const validResults = results.slice(0, 15);
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

  // Calculate wind Direction Offsets (where wind is blowing TO)
  const windOffsets = useMemo(() => {
    const latOffset = Math.cos((windDirDeg * Math.PI) / 180); 
    const lngOffset = Math.sin((windDirDeg * Math.PI) / 180);
    return { latOffset, lngOffset };
  }, [windDirDeg]);

  // Generate Plume Polygons (Wedge Cones) instead of circles
  const createPlumeWedge = useCallback((radiusMeters: number) => {
    if (!location || radiusMeters === 0) return [];
    // Start at the emission source
    const points = [{ lat: location.lat, lng: location.lng }];
    const rDeg = radiusMeters / 111000;
    const numSegments = 12; // Smooth arc
    const cosLat = Math.cos(location.lat * Math.PI / 180);
    // Draw an arc spanning from -40 to +40 degrees from the core wind direction
    for (let i = 0; i <= numSegments; i++) {
        const offsetAng = -40 + (80 * (i / numSegments)); 
        const ang = (windDirDeg + offsetAng) * (Math.PI / 180);
        points.push({
            lat: location.lat + Math.cos(ang) * rDeg,
            lng: location.lng + Math.sin(ang) * (rDeg / cosLat)
        });
    }
    return points;
  }, [location, windDirDeg]);

  const innerPlume = useMemo(() => createPlumeWedge(spreadRadius * 0.3), [createPlumeWedge, spreadRadius]);
  const midPlume = useMemo(() => createPlumeWedge(spreadRadius * 0.65), [createPlumeWedge, spreadRadius]);
  const outerPlume = useMemo(() => createPlumeWedge(spreadRadius), [createPlumeWedge, spreadRadius]);

  // Generate wind flow lines based on live direction
  const windLines = useMemo(() => {
    if (!location) return [];
    
    const lines = [];
    const latOffset = Math.cos((windDirDeg * Math.PI) / 180) * 0.03; // length of wind visual line
    const lngOffset = Math.sin((windDirDeg * Math.PI) / 180) * 0.03;

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
    if (spreadRadius === 0 || !location) return [];
    
    // Wind flow vector to check if a location is downwind/inside the plume
    const rad = Math.PI / 180;
    const flowLat = Math.cos(windDirDeg * rad);
    const flowLng = Math.sin(windDirDeg * rad);

    return generatedAreas.map(j => {
      // Accurate physical distance measurement
      const dLatPhysical = (j.lat - location.lat) * 111000;
      const dLngPhysical = (j.lng - location.lng) * 111000 * Math.cos(location.lat * Math.PI / 180);
      const dist = Math.sqrt(dLatPhysical * dLatPhysical + dLngPhysical * dLngPhysical);
      
      // Calculate dot product for cone angle checking
      const dLatDegree = j.lat - location.lat;
      const dLngDegree = j.lng - location.lng;
      const dot = (dLatDegree * flowLat) + (dLngDegree * flowLng);
      const distDegrees = Math.sqrt(dLatDegree * dLatDegree + dLngDegree * dLngDegree);
      const isDownwind = distDegrees === 0 ? true : (dot / distDegrees) > 0.8;
      
      // Target must be within radius AND inside the tight downwind cone corridor
      if (dist < spreadRadius && isDownwind) {
        // Core intensity drops over distance and increases with steps
        const intensity = Math.max(0, Math.floor(currentAqi * (1 - dist/spreadRadius) * 0.4));
        return { ...j, addedAqi: intensity };
      }
      return null;
    }).filter(Boolean) as (Area & {addedAqi: number})[];
  }, [location, spreadRadius, generatedAreas, currentAqi, windDirDeg]);

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
              {spreadRadius > 0 && innerPlume.length > 0 && (
                <Polygon
                  paths={innerPlume}
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
              {spreadRadius > 0 && midPlume.length > 0 && (
                <Polygon
                  paths={midPlume}
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
              {spreadRadius > 0 && outerPlume.length > 0 && (
                <Polygon
                  paths={outerPlume}
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

      <div className="relative flex w-full flex-col gap-5 overflow-y-auto border-t border-border/40 bg-card/95 p-5 shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.05)] backdrop-blur-xl lg:w-[360px] lg:border-l lg:border-t-0">
        
        {/* Header Illustration */}
        <div className="relative mb-2 mt-2 flex justify-center">
          <div className="absolute -inset-4 rounded-full bg-primary/5 blur-xl"></div>
          <img src={spreadIllustration} alt="Spread illustration" className="relative z-10 h-28 w-auto object-contain drop-shadow-2xl transition-transform duration-500 hover:scale-105" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-background to-secondary/30 p-3.5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground opacity-80">Spread Radius</p>
            <p className="mt-1.5 font-display text-2xl font-bold tracking-tight text-foreground">
              {(spreadRadius / 1000).toFixed(2)}<span className="ml-1 text-[11px] font-semibold text-muted-foreground uppercase opacity-70">km</span>
            </p>
          </Card>
          
          <Card className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-background to-secondary/30 p-3.5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground opacity-80">Affected Zones</p>
            <p className="mt-1.5 font-display text-2xl font-bold tracking-tight text-destructive">
              {affectedAreas.length}<span className="ml-1 text-[11px] font-semibold text-muted-foreground uppercase opacity-70">areas</span>
            </p>
          </Card>
          
          <Card className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-background to-secondary/30 p-3.5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground opacity-80">
              <Users className="h-3.5 w-3.5" /> Est. Pop
            </p>
            <p className="mt-1.5 font-display text-2xl font-bold tracking-tight text-foreground">
              {(Math.floor(Math.PI * Math.pow(spreadRadius / 1000, 2) * 50)).toLocaleString()}<span className="ml-1 text-[11px] font-semibold text-muted-foreground uppercase opacity-70">ppl</span>
            </p>
          </Card>
          
          <Card className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/5 to-primary/10 p-3.5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md">
            <div className="absolute bottom-0 left-0 bg-primary/20 transition-all duration-75" style={{ height: `${(simulationStep / 150) * 100}%`, width: '100%' }} />
            <p className="relative z-10 text-[10px] font-bold uppercase tracking-wider text-primary/90">Progress</p>
            <p className="relative z-10 mt-1.5 font-display text-2xl font-bold tracking-tight text-foreground">
              {Math.floor((simulationStep / 150) * 100)}<span className="ml-1 text-[11px] font-semibold text-primary/70 uppercase">pct</span>
            </p>
          </Card>
        </div>

        {/* Active Impact Zones */}
        <Card className="flex flex-col flex-1 min-h-[180px] overflow-hidden rounded-2xl border border-border/40 bg-card p-4 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <MapPin className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Active Impact Zones</h3>
          </div>
          
          <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
            {affectedAreas.length === 0 ? (
              <div className="flex h-[120px] flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-secondary/20 px-4 text-center">
                <Radar className="mb-3 h-6 w-6 text-muted-foreground/60" />
                <p className="text-[11px] font-medium text-muted-foreground/90">
                  Trajectory clear. No major areas affected yet by the wind pattern.
                </p>
              </div>
            ) : (
              affectedAreas.map((j) => (
                <div key={j.id} className="group flex items-center justify-between rounded-xl border border-border/40 bg-gradient-to-r from-background to-secondary/30 p-2.5 shadow-sm transition-all duration-200 hover:border-destructive/30 hover:shadow-md">
                  <div className="flex min-w-0 flex-1 flex-col pr-3">
                    <span className="truncate text-xs font-bold text-foreground" title={j.name}>{j.name}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-80">
                      Base AQI <span className="font-bold text-foreground">{j.baseAqi}</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-sm font-black text-destructive tracking-tight">+{j.addedAqi}</span>
                    <span className="animate-pulse rounded-full bg-destructive/10 px-1.5 py-0.5 mt-0.5 text-[8px] font-bold uppercase tracking-widest text-destructive">Critical</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Status Alerts */}
        <div className="shrink-0 pt-1">
          {affectedAreas.length > 0 ? (
            <div className="animate-in slide-in-from-bottom-2 fade-in relative overflow-hidden rounded-2xl border border-destructive/30 bg-destructive/10 p-4 shadow-sm backdrop-blur-sm">
              <div className="absolute left-0 top-0 h-full w-1.5 bg-destructive"></div>
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-destructive/20 shrink-0">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-destructive">Impact Warning</p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-foreground/80">
                    Hazardous plume is tracking towards densely populated sectors. Issue immediate alerts.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in slide-in-from-bottom-2 fade-in relative overflow-hidden rounded-2xl border border-success/30 bg-success/10 p-4 shadow-sm backdrop-blur-sm">
              <div className="absolute left-0 top-0 h-full w-1.5 bg-success"></div>
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-success/20 shrink-0">
                  <Activity className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-success">All Clear</p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-foreground/80">
                    Pinpoint a location and run simulation to predict environmental fallout.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PollutionSpread;
