import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Radar, RefreshCcw, Activity } from "lucide-react";
import spreadIllustration from "@/assets/spread-illustration.png";
import { useAqiData } from "@/hooks/useAqiData";
import { useState } from "react";
import { GoogleMap, Circle, useJsApiLoader } from "@react-google-maps/api";

const mapContainerStyle = { width: "100%", height: "100%" };

const getAqiColor = (aqi: number) => {
  if (aqi <= 50)  return "#22c55e";
  if (aqi <= 100) return "#eab308";
  if (aqi <= 150) return "#f97316";
  if (aqi <= 200) return "#ef4444";
  return "#7f1d1d";
};

const PollutionSpread = () => {
  const { data, loading, error, refresh } = useAqiData();
  const [selectedJunction, setSelectedJunction] = useState("junction-a");
  const [simRunning, setSimRunning] = useState(false);
  const [showSim, setShowSim] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    id: "google-map-script",
  });

  const lat = data?.lat ?? 18.5204;
  const lon = data?.lon ?? 73.8567;

  const junctionALat = lat + 0.01;
  const junctionALng = lon + 0.01;
  const junctionBLat = lat - 0.012;
  const junctionBLng = lon + 0.008;

  const sourcePos = selectedJunction === "junction-a"
    ? { lat: junctionALat, lng: junctionALng }
    : { lat: junctionBLat, lng: junctionBLng };

  const sourceAqi = selectedJunction === "junction-a"
    ? Math.max(0, (data?.currentAqi ?? 130) + (data?.windImpact?.sectorAqiDelta ?? 8))
    : Math.max(0, (data?.currentAqi ?? 130) - (data?.windImpact?.zoneAqiDelta ?? 12));

  const windSpeed = data?.weather?.windSpeed ?? 14;
  const windDir   = data?.weather?.windDirectionLabel ?? "South-East";
  const spreadKm  = Math.round((sourceAqi / 100) * 1.5 * 10) / 10;

  const junctionBImpact = Math.round(spreadKm * 15);
  const junctionCImpact = Math.round(spreadKm * 10);

  const handleRun = () => {
    setSimRunning(true);
    setTimeout(() => {
      setSimRunning(false);
      setShowSim(true);
    }, 1500);
  };

  return (
    <div className="flex h-full flex-col gap-0 lg:flex-row">
      {/* ── Left: Controls + Map ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col">
        {/* Header controls */}
        <div className="flex flex-wrap items-start gap-3 border-b border-border bg-card p-3 sm:gap-6 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Radar className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
            <div>
              <h1 className="font-display text-sm font-bold text-foreground sm:text-lg">
                Pollution Spread Simulation
              </h1>
              <p className="text-[10px] text-muted-foreground sm:text-xs">
                Wind-driven AQI propagation analysis
              </p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted-foreground sm:inline">Source Junction:</span>
              <Select value={selectedJunction} onValueChange={(v) => { setSelectedJunction(v); setShowSim(false); }}>
                <SelectTrigger className="w-32 sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="junction-a">Junction A</SelectItem>
                  <SelectItem value="junction-b">Junction B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {data && (
              <div className="hidden sm:block">
                <p className="text-xs text-muted-foreground">Live Wind:</p>
                <p className="text-sm font-medium text-foreground">{windDir}</p>
                <p className="text-xs text-muted-foreground">{windSpeed} km/h</p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={refresh}
                className="rounded-lg bg-secondary p-2 text-secondary-foreground hover:bg-secondary/80"
                title="Refresh"
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <Button
                onClick={handleRun}
                disabled={simRunning || !data}
                className="rounded-full px-6 sm:px-8"
              >
                {simRunning ? (
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4 animate-pulse" /> Running…
                  </span>
                ) : "Run Simulation"}
              </Button>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="relative min-h-[300px] flex-1">
          {!isLoaded ? (
            <div className="flex h-full items-center justify-center">
              <Activity className="h-6 w-6 animate-pulse text-primary" />
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={{ lat, lng: lon }}
              zoom={13}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: true,
                gestureHandling: "greedy",
              }}
            >
              {/* Pollution spread circle */}
              {showSim && (
                <Circle
                  center={sourcePos}
                  radius={spreadKm * 1000}
                  options={{
                    strokeColor: getAqiColor(sourceAqi),
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: getAqiColor(sourceAqi),
                    fillOpacity: 0.25,
                  }}
                />
              )}
            </GoogleMap>
          )}

          {error && (
            <div className="absolute bottom-4 left-4 rounded-lg bg-destructive/90 px-3 py-1 text-xs text-white">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel ──────────────────────────────────────────────── */}
      <div className="w-full space-y-4 overflow-y-auto border-t border-border bg-card p-4 lg:w-64 lg:border-l lg:border-t-0 xl:w-72">
        <div className="flex justify-center">
          <img src={spreadIllustration} alt="Spread illustration" className="h-20 w-auto sm:h-28" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 shadow-card">
            <p className="text-xs font-semibold text-foreground">Spread Overview</p>
            <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
              <p>Source AQI: <span className="font-bold text-foreground">{sourceAqi}</span></p>
              <p>Wind: <span className="font-bold text-foreground">{windDir}</span></p>
              <p>Spread Radius: <span className="font-bold text-foreground">{spreadKm} km</span></p>
            </div>
          </Card>
          <Card className="p-3 shadow-card">
            <p className="text-xs font-semibold text-foreground">Affected Areas</p>
            <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
              <p>Jct B → <span className="font-bold text-destructive">+{junctionBImpact} AQI</span></p>
              <p>Jct C → <span className="font-bold text-destructive">+{junctionCImpact} AQI</span></p>
            </div>
          </Card>
        </div>

        {data && (
          <Card className="p-3 shadow-card">
            <p className="text-xs font-semibold text-foreground">Live Conditions</p>
            <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
              <p>Current AQI: <span className="font-bold text-foreground">{data.currentAqi}</span></p>
              <p>Predicted: <span className="font-bold text-foreground">{data.predictedAqi}</span></p>
              <p>Temperature: <span className="font-bold text-foreground">{data.weather?.temperature}°C</span></p>
              <p>Humidity: <span className="font-bold text-foreground">{data.weather?.humidity}%</span></p>
            </div>
          </Card>
        )}

        <Card className="border-destructive/30 bg-destructive/5 p-3 shadow-card">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-[11px] text-foreground">
              {showSim
                ? `Simulation active: ${spreadKm} km radius plume moving ${windDir}. Sensitive individuals should limit outdoor exposure.`
                : data
                  ? `Wind-driven pollution is moving ${windDir} at ${windSpeed} km/h. Run simulation to visualize spread.`
                  : "Click 'Run Simulation' to visualize pollution spread based on live AQI and wind data."}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PollutionSpread;
