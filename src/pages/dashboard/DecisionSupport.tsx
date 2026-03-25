import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, RefreshCcw, Activity } from "lucide-react";
import decisionIllustration from "@/assets/decision-illustration.png";
import { useAqiData } from "@/hooks/useAqiData";
import { useState } from "react";

type Role = "traffic" | "municipal" | "public";

interface RoleConfig {
  label: string;
  actions: string[];
  impacts: string[];
}

const buildRoleConfig = (
  aqi: number,
  windDir: string,
  windSpeed: number,
  predicted: number
): Record<Role, RoleConfig> => {
  const aqiReducePct  = Math.round(Math.min(25, (aqi - 50) / 4));
  const aqiDelta      = Math.abs(predicted - aqi);
  const trafficShift  = Math.min(30, Math.round(aqi / 5));
  const impactMinutes = Math.round(30 + aqi / 10);

  return {
    traffic: {
      label: "Traffic Police",
      actions: [
        `Activate diversion at Junction A (${windDir} wind zone)`,
        `Increase signal timing by ${Math.min(30, Math.round(windSpeed * 0.8))} sec at high-AQI junctions`,
        `Restrict heavy vehicles for ${Math.round(aqi / 50)} hour(s)`,
      ],
      impacts: [
        `Estimated AQI reduction: -${aqiReducePct}%`,
        `Traffic redistribution: ${trafficShift}% shift`,
        `Impact time: ${impactMinutes} minutes`,
      ],
    },
    municipal: {
      label: "Municipal Authority",
      actions: [
        `Issue public health advisory for ${aqi > 150 ? "all" : "sensitive"} groups`,
        `Deploy water sprinklers in ${windDir} sector`,
        `Suspend construction in high-AQI zones for ${Math.ceil(aqi / 100)} hr(s)`,
      ],
      impacts: [
        `Dust reduction: ~${Math.round(aqi * 0.1)} µg/m³`,
        `Predicted AQI in 1hr: ${predicted}`,
        `Affected population radius: ${Math.round(windSpeed * 0.2 + 1)} km`,
      ],
    },
    public: {
      label: "Public",
      actions: [
        `${aqi > 150 ? "Avoid" : "Limit"} outdoor activities`,
        `Use N95 mask${aqi > 100 ? " (mandatory for sensitive groups)" : " if staying outside > 1hr"}`,
        `Keep windows closed and use air purifiers`,
      ],
      impacts: [
        `Your current risk: ${aqi > 150 ? "HIGH" : aqi > 100 ? "MODERATE" : "LOW"}`,
        `PM2.5 estimated delta today: +${Math.round(aqiDelta * 0.3)} µg/m³`,
        `Best time outdoors: ${windSpeed > 12 ? "Morning (high wind dispersal)" : "Evening after 7 PM"}`,
      ],
    },
  };
};

const DecisionSupport = () => {
  const { data, loading, error, refresh } = useAqiData();
  const [role, setRole] = useState<Role>("traffic");

  const aqi       = data?.currentAqi ?? 100;
  const predicted = data?.predictedAqi ?? 100;
  const windDir   = data?.weather?.windDirectionLabel ?? "West";
  const windSpeed = data?.weather?.windSpeed ?? 10;

  const configs = buildRoleConfig(aqi, windDir, windSpeed, predicted);
  const config  = configs[role];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
          <div>
            <h1 className="font-display text-lg font-bold text-foreground sm:text-xl">
              Role-Based Decision Support
            </h1>
            <p className="text-[10px] text-muted-foreground sm:text-xs">
              {data
                ? `AQI ${aqi} · Wind ${windDir} ${windSpeed} km/h · ML Prediction: ${predicted}`
                : "AI-generated recommendations tailored to user role"}
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          className="rounded-lg bg-secondary p-2 text-secondary-foreground hover:bg-secondary/80"
          title="Refresh"
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
          <span className="ml-2 text-sm text-muted-foreground">Loading recommendations…</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        {/* ── Left ─────────────────────────────────────────────────────── */}
        <div className="space-y-4 sm:space-y-6">
          <Card className="p-4 shadow-card sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <label className="text-sm font-medium text-foreground">Select Role</label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="traffic">Traffic Police</SelectItem>
                  <SelectItem value="municipal">Municipal Authority</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Live context pills */}
            {data && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground">
                  AQI {aqi}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground">
                  Wind {windDir}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground">
                  Predicted: {predicted}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground">
                  {data.category}
                </span>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="p-4 shadow-card sm:p-5">
              <h3 className="font-display text-sm font-bold text-foreground sm:text-base">
                AI Recommended Actions
              </h3>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground sm:text-sm">
                {config.actions.map((a, i) => (
                  <li key={i}>• {a}</li>
                ))}
              </ul>
            </Card>
            <Card className="p-4 shadow-card sm:p-5">
              <h3 className="font-display text-sm font-bold text-foreground sm:text-base">
                Expected Impact
              </h3>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground sm:text-sm">
                {config.impacts.map((imp, i) => (
                  <li key={i}>• {imp}</li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        {/* ── Right: Illustration ──────────────────────────────────────── */}
        <div className="flex items-center justify-center">
          <img
            src={decisionIllustration}
            alt="Decision support illustration"
            className="w-full max-w-xs sm:max-w-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default DecisionSupport;
