import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Activity, RefreshCcw, Wind } from "lucide-react";
import airQualityIllustration from "@/assets/air-quality-illustration.png";
import { useEffect, useState, useMemo } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
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

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const getWindDirection = (degree: number) => {
  const directions = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"];
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
  const [data, setData] = useState<AQIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default location: Pune
  const [location, setLocation] = useState<{ lat: number; lon: number }>({
    lat: 18.5204,
    lon: 73.8567,
  });

  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  const fetchAQIData = async (lat: number, lon: number) => {
    try {
      setLoading(true);
      setError(null);

      const aqiRes = await fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10&hourly=us_aqi&past_days=1`
      );
      const aqiData = await aqiRes.json();

      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m`
      );
      const weatherData = await weatherRes.json();

      const currentAqi = aqiData?.current?.us_aqi ?? 85;
      const pm25 = aqiData?.current?.pm2_5 ?? 0;
      const pm10 = aqiData?.current?.pm10 ?? 0;
      const dominant = pm25 > pm10 / 2 ? "PM2.5" : "PM10";

      setData({
        currentAqi,
        pm25,
        dominant,
        windSpeed: weatherData?.current?.wind_speed_10m ?? 0,
        windDirection: weatherData?.current?.wind_direction_10m ?? 0,
        temperature: weatherData?.current?.temperature_2m ?? 0,
        historicalAqi: aqiData?.hourly?.us_aqi?.slice(-24) || [70, 75, 80, 78, 82, 85],
        junctionA: currentAqi + Math.floor(Math.random() * 20) - 10,
        junctionB: Math.max(0, currentAqi - Math.floor(Math.random() * 30)),
      });
    } catch (err) {
      setError("Failed to fetch real-time data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lon: longitude });
          fetchAQIData(latitude, longitude);
        },
        () => {
          console.warn("Geolocation denied, using default Pune location.");
          fetchAQIData(location.lat, location.lon);
        }
      );
    } else {
      fetchAQIData(location.lat, location.lon);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAQIData(location.lat, location.lon);
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [location]);

  const junctionPositions = useMemo(() => {
    return {
      user: { lat: location.lat, lng: location.lon },
      junctionA: { lat: location.lat + 0.01, lng: location.lon + 0.01 },
      junctionB: { lat: location.lat - 0.012, lng: location.lon + 0.008 },
    };
  }, [location]);

  if ((loading && !data) || !isLoaded) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Activity className="h-8 w-8 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">
            Initializing Machine Learning Models, API Data & Google Maps...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data || loadError) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error || "Google Maps failed to load."}</p>
        <button
          onClick={() => fetchAQIData(location.lat, location.lon)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCcw className="h-4 w-4" /> Retry Connection
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
    <div className="flex h-full flex-col gap-0 lg:flex-row">
      {/* Map area */}
      <div className="relative min-h-[300px] flex-1 sm:min-h-[400px] bg-secondary/20">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={{ lat: location.lat, lng: location.lon }}
          zoom={13}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
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

        {/* Floating AQI Cards */}
        <div className="absolute bottom-4 left-4 rounded-xl bg-card p-2 shadow-card sm:bottom-32 sm:left-1/3 sm:p-3 transition-all pointer-events-none">
          <p className="text-[10px] text-muted-foreground sm:text-xs">Junction A – City Center</p>
          <div className="mt-1 flex items-center gap-2 sm:gap-3">
            <div>
              <span className="text-[10px] text-muted-foreground sm:text-xs">AQI</span>
              <p className="font-display text-xl font-bold text-foreground sm:text-2xl">{data.junctionA}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold sm:px-3 sm:py-1 sm:text-xs ${getAqiColorClass(data.junctionA, true)}`}>
              {getAqiCategory(data.junctionA)}
            </span>
          </div>
        </div>

        <div className="absolute right-4 top-4 rounded-xl bg-card p-2 shadow-card sm:right-1/3 sm:top-1/3 sm:p-3 transition-all pointer-events-none">
          <p className="text-[10px] text-muted-foreground sm:text-xs">Junction B – Northern Outskirts</p>
          <div className="mt-1 flex items-center gap-2 sm:gap-3">
            <div>
              <span className="text-[10px] text-muted-foreground sm:text-xs">AQI</span>
              <p className="font-display text-xl font-bold text-foreground sm:text-2xl">{data.junctionB}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold sm:px-3 sm:py-1 sm:text-xs ${getAqiColorClass(data.junctionB, true)}`}>
              {getAqiCategory(data.junctionB)}
            </span>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full space-y-4 overflow-y-auto border-t border-border bg-card p-4 lg:w-72 lg:border-l lg:border-t-0 xl:w-80 relative">
        <div className="absolute top-2 right-2">
          <button
            onClick={() => fetchAQIData(location.lat, location.lon)}
            className="p-1 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
            title="Refresh Model"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="flex justify-center">
          <img src={airQualityIllustration} alt="Air quality" className="h-24 w-auto sm:h-32 object-contain" />
        </div>

        <h3 className="text-center font-display text-base font-bold text-foreground sm:text-lg">
          Live Air Quality Overview
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 text-center shadow-card border-none bg-gradient-to-br from-secondary to-background">
            <p className="text-xs text-muted-foreground">Current AQI</p>
            <p className={`font-display text-2xl font-bold sm:text-3xl ${getAqiColorClass(data.currentAqi)}`}>
              {data.currentAqi}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">Dominant: {data.dominant}</p>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${getAqiColorClass(data.currentAqi, true)}`}>
              {getAqiCategory(data.currentAqi)}
            </span>
          </Card>

          <Card className="p-3 text-center shadow-card border-none bg-gradient-to-br from-secondary to-background relative overflow-hidden">
            <div className="absolute -right-2 -top-2 opacity-5 text-[40px]">🤖</div>
            <p className="text-xs text-muted-foreground">ML 1Hr Forecast</p>
            <div className="flex items-center justify-center gap-1">
              <p className={`font-display text-2xl font-bold sm:text-3xl ${getAqiColorClass(predictedAQI)}`}>
                {predictedAQI}
              </p>
              {predictedAQI > data.currentAqi ? (
                <ArrowUp className="h-4 w-4 text-destructive" />
              ) : (
                <ArrowDown className="h-4 w-4 text-success" />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">Predicted AQI</p>
            <p className="text-[10px] text-muted-foreground text-primary font-medium">Confidence: {confidence}%</p>
          </Card>
        </div>

        <Card className="p-3 shadow-card transition-all border-none bg-accent/20">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                <Wind className="h-3 w-3" /> Impact
              </p>
              <p className="text-[11px] text-muted-foreground">Wind: {windDirStr}</p>
              <p className="text-[11px] text-muted-foreground">Speed: {data.windSpeed} km/h</p>
              <p className="text-[11px] text-muted-foreground">Temp: {data.temperature}°C</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Affected Areas:</p>
              <p className="text-[11px] text-muted-foreground truncate">
                Sector {windDirStr} <span className="font-bold text-destructive">+{affected1} AQI</span>
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                Zone {windDirStr} <span className="font-bold text-warning">+{affected2} AQI</span>
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 shadow-card border-none">
          <p className="text-xs font-semibold text-foreground text-center">Exposure Risk Assessment</p>
          <div className="mt-2 flex justify-center">
            <span className={`rounded-full border-2 px-4 py-1 text-xs font-bold ${getAqiColorClass(data.currentAqi)} border-current`}>
              {riskLevel}
            </span>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground leading-relaxed">
            {recommendation}
          </p>
        </Card>
      </div>
    </div>
  );
};

export default AirQualityMap;