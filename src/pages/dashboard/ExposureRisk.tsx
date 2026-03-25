import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ShieldAlert, Heart, RefreshCcw, Activity } from "lucide-react";
import riskIllustration from "@/assets/risk-illustration.png";
import exposureActionIllustration from "@/assets/exposure-action-illustration.png";
import { useAqiData } from "@/hooks/useAqiData";
import { useState } from "react";

const COLORS = ["hsl(36,90%,55%)", "hsl(120,15%,92%)"];

/* Map AQI → 0-100 risk score for the donut */
const aqiToRiskScore = (aqi: number) => Math.min(100, Math.round((aqi / 300) * 100));

/* Activity multipliers */
const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  low: 0.7,
  moderate: 1.0,
  high: 1.4,
};

const getRoleRecommendations = (riskLevel: string) => {
  const map: Record<string, string[]> = {
    "LOW RISK": [
      "Air quality is good – normal activities allowed.",
      "Maintain routine air quality checks.",
      "No protective equipment needed.",
    ],
    "MODERATE RISK": [
      "Unusually sensitive groups should reduce exertion.",
      "Open windows during low-wind periods.",
      "Monitor local AQI updates every hour.",
    ],
    "HIGH RISK": [
      "Reduce outdoor duration to under 30 minutes.",
      "Avoid peak traffic hours (8–10 AM, 5–7 PM).",
      "Use N95 mask if prolonged exposure is needed.",
    ],
    "VERY HIGH RISK": [
      "Everyone should avoid prolonged outdoor exertion.",
      "Close windows and use air purifiers indoors.",
      "Vulnerable groups must stay indoors.",
    ],
    "SEVERE RISK": [
      "Avoid all unnecessary outdoor activity.",
      "Wear respirator-grade mask if going outside.",
      "Alert local health authorities.",
    ],
    "EXTREME RISK": [
      "Declare health emergency – no outdoor activity.",
      "Emergency evacuation for sensitive zones.",
      "Government advisory mandatory.",
    ],
  };
  return map[riskLevel] ?? map["MODERATE RISK"];
};

const ExposureRisk = () => {
  const { data, loading, error, refresh } = useAqiData();
  const [duration, setDuration] = useState("");
  const [activity, setActivity] = useState("moderate");
  const [calculated, setCalculated] = useState(false);

  const baseAqi    = data?.currentAqi ?? 0;
  const multiplier = ACTIVITY_MULTIPLIERS[activity] ?? 1.0;
  const effectiveAqi = calculated && duration
    ? Math.min(500, Math.round(baseAqi * multiplier * (1 + (parseInt(duration) - 60) / 600)))
    : baseAqi;

  const riskScore = aqiToRiskScore(effectiveAqi);
  const riskLevel = data?.exposure?.riskLevel ?? "MODERATE RISK";
  const riskData  = [
    { name: "Risk", value: riskScore },
    { name: "Safe", value: Math.max(0, 100 - riskScore) },
  ];

  const recommendations = getRoleRecommendations(riskLevel);
  const advisoryText = data?.exposure?.recommendation ??
    "Prolonged outdoor exposure may cause respiratory discomfort. Limit activity duration and wear protective mask.";

  const handleCalculate = () => {
    if (!duration) return;
    setCalculated(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
          <div>
            <h1 className="font-display text-lg font-bold text-foreground sm:text-xl">
              Exposure Risk Assessment
            </h1>
            <p className="text-[10px] text-muted-foreground sm:text-xs">
              {data ? `Live AQI: ${baseAqi} · ${data.category}` : "Health impact estimation based on AQI and exposure duration"}
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          className="rounded-lg bg-secondary p-2 text-secondary-foreground hover:bg-secondary/80"
          title="Refresh data"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="flex h-24 items-center justify-center">
          <Activity className="h-6 w-6 animate-pulse text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Fetching live risk data…</span>
        </div>
      )}

      {/* ── Form + Illustration ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        <Card className="p-4 shadow-card sm:p-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <label className="text-sm text-foreground sm:w-44">Exposure Duration (minutes)</label>
              <Input
                id="exposure-duration"
                type="number"
                min="1"
                max="480"
                placeholder="e.g. 60"
                value={duration}
                onChange={(e) => { setDuration(e.target.value); setCalculated(false); }}
                className="flex-1"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <label className="text-sm text-foreground sm:w-44">Activity Level</label>
              <Select value={activity} onValueChange={(v) => { setActivity(v); setCalculated(false); }}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (Indoor Rest)</SelectItem>
                  <SelectItem value="moderate">Moderate (Walking)</SelectItem>
                  <SelectItem value="high">High (Outdoor Work)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Current AQI display */}
            {data && (
              <div className="rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                Live AQI at your location: <span className="font-bold text-foreground">{baseAqi}</span>
                {" · "}Category: <span className="font-semibold text-foreground">{data.category}</span>
              </div>
            )}
            <div className="flex justify-center pt-2">
              <Button
                id="calculate-risk-btn"
                onClick={handleCalculate}
                className="w-full rounded-full px-8 sm:w-auto"
                disabled={!duration || !data}
              >
                Calculate Risk
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-center">
          <img src={riskIllustration} alt="Risk gauge" className="h-32 w-auto sm:h-48" />
        </div>
      </div>

      {/* ── Donut + Actions ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        <Card className="flex flex-col items-center justify-center p-4 shadow-card sm:flex-row sm:p-6">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie
                data={riskData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
              >
                {riskData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 text-center sm:ml-4 sm:mt-0">
            <p className="text-sm font-bold text-foreground">{riskLevel}</p>
            <p className="text-xs text-muted-foreground">{riskScore}/100</p>
            {calculated && duration && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Effective AQI: <span className="font-bold text-foreground">{effectiveAqi}</span>
              </p>
            )}
          </div>
        </Card>

        <Card className="p-4 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
            <div className="flex-1">
              <h3 className="font-display text-base font-bold text-foreground sm:text-lg">
                Recommended Actions
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {recommendations.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </div>
            <img
              src={exposureActionIllustration}
              alt="Action"
              className="mx-auto h-24 w-auto sm:mx-0 sm:h-32"
            />
          </div>
        </Card>
      </div>

      {/* ── Health advisory ─────────────────────────────────────────────── */}
      <Card className="bg-warning/10 p-3 shadow-card sm:p-4">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-destructive" />
          <h3 className="font-display text-sm font-bold text-destructive sm:text-base">Health Advisory</h3>
        </div>
        <p className="mt-2 text-xs text-foreground sm:text-sm">{advisoryText}</p>
        {data && (
          <p className="mt-1 text-[10px] text-muted-foreground">
            PM2.5: {data.currentPm25} µg/m³ · PM10: {data.currentPm10} µg/m³ · Humidity: {data.weather?.humidity}%
          </p>
        )}
      </Card>
    </div>
  );
};

export default ExposureRisk;
