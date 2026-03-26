import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from "recharts";
import {
  ShieldAlert,
  Heart,
  RefreshCcw,
  Activity,
  MapPin,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  Wind,
  Droplets,
  Thermometer,
  Eye,
  Baby,
  UserRound,
  Dumbbell,
  Clock,
  Loader2,
  Info,
} from "lucide-react";
import { useAqiData } from "@/hooks/useAqiData";

/* ── Helpers ─────────────────────────────────────────────── */

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  rest: 0.6,
  walking: 1.0,
  jogging: 1.5,
  cycling: 1.7,
  heavy: 2.0,
};

const DURATION_OPTIONS = [15, 30, 60, 90, 120, 180, 240];

// Safe exposure thresholds in minutes per AQI bracket
const safeMinutes = (aqi: number): number => {
  if (aqi <= 50) return 480;
  if (aqi <= 100) return 360;
  if (aqi <= 150) return 180;
  if (aqi <= 200) return 60;
  if (aqi <= 300) return 20;
  return 5;
};

interface RiskBand {
  label: string;
  color: string;
  bg: string;
  border: string;
  text: string;
  icon: string;
  min: number;
}
const RISK_BANDS: RiskBand[] = [
  { label: "Very Low",  color: "#22c55e", bg: "bg-emerald-50",  border: "border-emerald-200", text: "text-emerald-700",  icon: "🟢", min: 0   },
  { label: "Low",       color: "#84cc16", bg: "bg-lime-50",     border: "border-lime-200",    text: "text-lime-700",    icon: "🟡", min: 20  },
  { label: "Moderate",  color: "#eab308", bg: "bg-yellow-50",   border: "border-yellow-200",  text: "text-yellow-700",  icon: "🟠", min: 40  },
  { label: "High",      color: "#f97316", bg: "bg-orange-50",   border: "border-orange-200",  text: "text-orange-700",  icon: "🔴", min: 60  },
  { label: "Very High", color: "#ef4444", bg: "bg-red-50",      border: "border-red-200",     text: "text-red-700",     icon: "🔴", min: 75  },
  { label: "Extreme",   color: "#7c3aed", bg: "bg-purple-50",   border: "border-purple-200",  text: "text-purple-800",  icon: "🚨", min: 90  },
];

const getRiskBand = (score: number): RiskBand =>
  [...RISK_BANDS].reverse().find((b) => score >= b.min) ?? RISK_BANDS[0];

const calcRiskScore = (aqi: number, durationMin: number, activityKey: string): number => {
  const mult = ACTIVITY_MULTIPLIERS[activityKey] ?? 1.0;
  const effectiveAqi = aqi * mult;
  const safeMins = safeMinutes(aqi);
  const exposureRatio = Math.min(durationMin / safeMins, 3); // cap at 3×
  const base = Math.min(100, Math.round((effectiveAqi / 400) * 60 + exposureRatio * 35));
  return Math.min(100, base);
};

interface GroupRisk {
  group: string;
  icon: React.ElementType;
  color: string;
  advice: string;
  safe: boolean;
}
const getGroupRisks = (aqi: number, score: number): GroupRisk[] => [
  {
    group: "Children",
    icon: Baby,
    color: "text-pink-500",
    advice:
      aqi <= 50 ? "Safe for play outdoors."
      : aqi <= 100 ? "Short outdoor play is OK. Monitor for symptoms."
      : aqi <= 150 ? "Limit outdoor play to 30 min. Avoid heavy exertion."
      : "Keep children indoors. Avoid all outdoor exposure.",
    safe: aqi <= 100,
  },
  {
    group: "Elderly",
    icon: UserRound,
    color: "text-sky-500",
    advice:
      aqi <= 50 ? "Normal outdoor activities allowed."
      : aqi <= 100 ? "Light outdoor activity is fine. Stay hydrated."
      : aqi <= 150 ? "Reduce outdoor time. Avoid peak pollution hours."
      : "Stay indoors. Consult doctor if experiencing symptoms.",
    safe: aqi <= 100,
  },
  {
    group: "Active Adults",
    icon: Dumbbell,
    color: "text-emerald-600",
    advice:
      aqi <= 50 ? "Excellent for all outdoor sports and fitness."
      : aqi <= 100 ? "Exercise is safe. Consider reducing intensity."
      : aqi <= 150 ? "Wear N95 mask for outdoor workouts."
      : score >= 75 ? "Move workouts indoors. Do not exercise outdoors."
      : "Limit outdoor exertion. Short sessions with mask only.",
    safe: aqi <= 100,
  },
];

const getRiskRecommendations = (score: number, aqi: number): string[] => {
  if (score < 20) return ["Enjoy outdoor activities freely.", "No protective equipment needed.", "Great day to go for a walk or run."];
  if (score < 40) return ["Outdoor activities are generally safe.", "Sensitive individuals may feel mild effects.", "Check AQI before extended stays outdoors."];
  if (score < 60) return ["Wear an N95 mask for outdoor activities over 1 hour.", "Avoid outdoor exercise during peak traffic hours.", "Keep windows closed if you're sensitive to pollution."];
  if (score < 75) return ["Limit outdoor time to under 30 minutes.", "N95 mask is essential for any outdoor activity.", "Use an indoor HEPA air purifier."];
  if (score < 90) return ["Avoid all unnecessary outdoor exposure.", "If going out is unavoidable, wear an N99/P100 respirator.", "Seek medical attention if you experience breathing difficulty."];
  return ["Declare a personal health emergency. Stay indoors.", "Do not open windows. Seal gaps if possible.", "Call emergency services if experiencing severe symptoms."];
};

/* ── Radial Gauge ─────────────────────────────────────────── */
const RiskGauge = ({ score, band }: { score: number; band: RiskBand }) => {
  const data = [
    { name: "risk", value: score, fill: band.color },
    { name: "safe", value: 100 - score, fill: "hsl(var(--muted))" },
  ];
  return (
    <div className="relative flex items-center justify-center">
      <ResponsiveContainer width={200} height={200}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={90}
          startAngle={225}
          endAngle={-45}
          data={data}
          barSize={16}
        >
          <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "hsl(var(--muted))" }} />
          <Tooltip
            formatter={(v: number) => [`${v}%`, ""]}
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      {/* Centre label */}
      <div className="pointer-events-none absolute flex flex-col items-center">
        <span className="font-display text-4xl font-extrabold" style={{ color: band.color }}>
          {score}
        </span>
        <span className="text-xs font-semibold text-muted-foreground">/ 100</span>
        <span className="mt-1 text-xs font-bold" style={{ color: band.color }}>
          {band.icon} {band.label}
        </span>
      </div>
    </div>
  );
};

/* ── Main Component ───────────────────────────────────────── */
const ExposureRisk = () => {
  const [geoState, setGeoState] = useState<"idle" | "locating" | "granted" | "denied">("idle");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>("");

  const [duration, setDuration] = useState<number>(60);
  const [activity, setActivity] = useState<string>("walking");
  const [calculated, setCalculated] = useState(false);

  const { data, loading, error, lastUpdated, refresh } = useAqiData(
    coords?.lat,
    coords?.lon
  );

  /* ── Auto-detect location on mount ── */
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoState("denied");
      return;
    }
    setGeoState("locating");
    navigator.geolocation.getCurrentPosition(
      async ({ coords: c }) => {
        const lat = parseFloat(c.latitude.toFixed(5));
        const lon = parseFloat(c.longitude.toFixed(5));
        setCoords({ lat, lon });
        setGeoState("granted");
        // Reverse-geocode for a friendly label
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
          );
          const json = await resp.json();
          const city =
            json.address?.city ||
            json.address?.town ||
            json.address?.village ||
            json.address?.county ||
            "Your Location";
          const state = json.address?.state ?? "";
          setLocationLabel(state ? `${city}, ${state}` : city);
        } catch {
          setLocationLabel(`${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E`);
        }
      },
      (err) => {
        console.warn("Geolocation denied:", err.message);
        setGeoState("denied");
        // Fall back to Pune
        setCoords({ lat: 18.5204, lon: 73.8567 });
        setLocationLabel("Pune, Maharashtra (default)");
        refresh(18.5204, 73.8567);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  }, [refresh]);

  useEffect(() => { detectLocation(); }, [detectLocation]);

  /* ── Derived values ── */
  const baseAqi = data?.currentAqi ?? 0;
  const riskScore = calculated ? calcRiskScore(baseAqi, duration, activity) : calcRiskScore(baseAqi, 60, "walking");
  const band = getRiskBand(riskScore);
  const recommendations = getRiskRecommendations(riskScore, baseAqi);
  const groupRisks = getGroupRisks(baseAqi, riskScore);
  const safeMins = safeMinutes(baseAqi);

  const handleCalculate = () => setCalculated(true);

  /* ── Render ── */
  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent">
            <ShieldAlert className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">
              Exposure Risk Assessment
            </h1>
            <p className="text-xs text-muted-foreground">
              Real-time risk based on your location, activity and duration
            </p>
          </div>
        </div>
        <button
          onClick={() => refresh(coords?.lat, coords?.lon)}
          className="rounded-lg bg-secondary p-2 text-secondary-foreground hover:bg-secondary/80"
          title="Refresh data"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── Location strip ── */}
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
        geoState === "locating" ? "border-primary/30 bg-primary/5"
        : geoState === "granted" ? "border-emerald-200 bg-emerald-50"
        : geoState === "denied"  ? "border-amber-200 bg-amber-50"
        : "border-border bg-muted/30"
      }`}>
        {geoState === "locating" ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : geoState === "granted" ? (
          <Navigation className="h-4 w-4 text-emerald-600" />
        ) : (
          <MapPin className="h-4 w-4 text-amber-600" />
        )}

        <span className={`font-medium ${
          geoState === "granted" ? "text-emerald-700"
          : geoState === "denied"  ? "text-amber-700"
          : "text-muted-foreground"
        }`}>
          {geoState === "idle"    ? "Requesting location…"
          : geoState === "locating" ? "Detecting your location…"
          : geoState === "granted"  ? `📍 ${locationLabel || "Location detected"}`
          : `⚠ Location access denied — showing default: ${locationLabel}`}
        </span>

        {geoState === "denied" && (
          <button
            onClick={detectLocation}
            className="ml-auto text-xs font-semibold text-primary underline hover:no-underline"
          >
            Retry
          </button>
        )}

        {coords && (
          <span className="ml-auto text-[10px] text-muted-foreground">
            {coords.lat.toFixed(4)}°N, {coords.lon.toFixed(4)}°E
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && !data && (
        <div className="flex h-32 items-center justify-center gap-3 text-sm text-muted-foreground">
          <Activity className="h-5 w-5 animate-pulse text-primary" />
          Fetching live AQI for your location…
        </div>
      )}

      {/* ── Main grid ── */}
      {(data || !loading) && (
        <div className="grid gap-5 lg:grid-cols-5">

          {/* Left: Input + Gauge */}
          <div className="space-y-5 lg:col-span-2">

            {/* Live AQI pill */}
            {data && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="flex flex-1 flex-col">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Current AQI
                  </span>
                  <span className="font-display text-3xl font-extrabold text-foreground">
                    {baseAqi}
                  </span>
                  <span className="text-xs text-muted-foreground">{data.category}</span>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                  <span>PM2.5: <b className="text-foreground">{data.currentPm25} µg/m³</b></span>
                  <span>PM10: <b className="text-foreground">{data.currentPm10} µg/m³</b></span>
                  <span>Dominant: <b className="text-foreground">{data.dominant}</b></span>
                  {lastUpdated && (
                    <span className="mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Exposure inputs */}
            <Card className="p-5 shadow-card">
              <h3 className="font-display text-sm font-semibold text-foreground">
                Calculate Your Personal Risk
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Set your planned outdoor exposure details below.
              </p>

              <div className="mt-4 space-y-3">
                {/* Duration */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Outdoor Duration
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DURATION_OPTIONS.map((d) => (
                      <button
                        key={d}
                        onClick={() => { setDuration(d); setCalculated(false); }}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                          duration === d
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {d < 60 ? `${d}m` : `${d / 60}h`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Activity */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Activity Level
                  </label>
                  <Select value={activity} onValueChange={(v) => { setActivity(v); setCalculated(false); }}>
                    <SelectTrigger id="activity-select" className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rest">🛋 Resting / Indoor</SelectItem>
                      <SelectItem value="walking">🚶 Walking (light)</SelectItem>
                      <SelectItem value="jogging">🏃 Jogging / Running</SelectItem>
                      <SelectItem value="cycling">🚴 Cycling</SelectItem>
                      <SelectItem value="heavy">⛏ Heavy Outdoor Work</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Safe duration info */}
                {data && (
                  <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    Safe outdoor limit for current AQI ({baseAqi}):{" "}
                    <span className="ml-1 font-bold text-foreground">
                      {safeMins >= 480 ? "Unlimited" : `${safeMins} min`}
                    </span>
                  </div>
                )}

                <Button
                  id="calculate-risk-btn"
                  onClick={handleCalculate}
                  className="w-full rounded-xl"
                  disabled={!data}
                >
                  Calculate My Risk Score
                </Button>
              </div>
            </Card>
          </div>

          {/* Right: Gauge + breakdown */}
          <div className="space-y-5 lg:col-span-3">

            {/* Risk gauge card */}
            <Card className={`border p-5 shadow-card ${band.border} ${band.bg}`}>
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <RiskGauge score={riskScore} band={band} />
                <div className="flex-1">
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${band.bg} ${band.border} border ${band.text}`}>
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {band.label.toUpperCase()} RISK
                  </div>
                  {calculated && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Based on <b className="text-foreground">{duration} min</b> of{" "}
                      <b className="text-foreground">{activity}</b> activity at AQI{" "}
                      <b className="text-foreground">{baseAqi}</b>
                    </p>
                  )}
                  <ul className="mt-3 space-y-2">
                    {recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                        <CheckCircle2 className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${band.text}`} />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            {/* Pollutant + Weather mini-tiles */}
            {data && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { icon: Wind,        label: "Wind",     value: `${data.weather?.windSpeed ?? "—"} km/h ${data.weather?.windDirectionLabel ?? ""}`, color: "text-sky-500" },
                  { icon: Droplets,    label: "Humidity", value: `${data.weather?.humidity ?? "—"}%`,      color: "text-blue-500" },
                  { icon: Thermometer, label: "Temp",     value: `${data.weather?.temperature ?? "—"}°C`,  color: "text-amber-500" },
                  { icon: Eye,         label: "Traffic",  value: `${data.trafficDensity ?? "—"}%`,         color: "text-violet-500" },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3 shadow-card"
                  >
                    <m.icon className={`h-4 w-4 ${m.color}`} />
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.label}</span>
                    <span className="font-display text-sm font-bold text-foreground">{m.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Group-specific risk */}
            <Card className="p-5 shadow-card">
              <h3 className="font-display text-sm font-semibold text-foreground">
                Group-Specific Advice
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Tailored guidance for different population groups.
              </p>
              <div className="mt-3 space-y-3">
                {groupRisks.map((g) => (
                  <div
                    key={g.group}
                    className={`flex items-start gap-3 rounded-xl border p-3 ${
                      g.safe ? "border-emerald-200 bg-emerald-50" : "border-orange-200 bg-orange-50"
                    }`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${g.safe ? "bg-emerald-100" : "bg-orange-100"}`}>
                      <g.icon className={`h-4 w-4 ${g.color}`} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{g.group}</p>
                      <p className={`mt-0.5 text-xs ${g.safe ? "text-emerald-700" : "text-orange-700"}`}>{g.advice}</p>
                    </div>
                    <div className="ml-auto shrink-0">
                      {g.safe
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        : <AlertTriangle className="h-4 w-4 text-orange-500" />
                      }
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Health Advisory footer ── */}
      {data && (
        <Card className="border-warning/40 bg-warning/8 p-4 shadow-card" style={{ background: "hsl(36 90% 55% / 0.07)", borderColor: "hsl(36 90% 55% / 0.3)" }}>
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-destructive" />
            <h3 className="font-display text-sm font-bold text-destructive">Health Advisory</h3>
          </div>
          <p className="mt-2 text-xs text-foreground/80 sm:text-sm">
            {data.exposure?.recommendation ?? data.recommendation}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
            <span>PM2.5: <b className="text-foreground">{data.currentPm25} µg/m³</b></span>
            <span>PM10: <b className="text-foreground">{data.currentPm10} µg/m³</b></span>
            <span>Humidity: <b className="text-foreground">{data.weather?.humidity}%</b></span>
            <span>Temp: <b className="text-foreground">{data.weather?.temperature}°C</b></span>
            <span>Predicted AQI (next hr): <b className="text-foreground">{data.predictedAqi}</b></span>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ExposureRisk;
