import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Settings,
  RefreshCcw,
  Activity,
  MapPin,
  Navigation,
  Loader2,
  Car,
  Building2,
  Users,
  Bot,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Clock,
  Zap,
} from "lucide-react";
import { useAqiData } from "@/hooks/useAqiData";

/* ── Types ────────────────────────────────────────────────── */

type Role = "traffic" | "municipal" | "public";

interface RolePanel {
  actions: string[];
  impacts: string[];
  urgency: "low" | "moderate" | "high" | "critical";
  summary: string;
}

interface AiPanels {
  traffic: RolePanel;
  municipal: RolePanel;
  public: RolePanel;
  generatedAt: string;
}

const ROLE_META: Record<Role, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  traffic: {
    label: "Traffic Police",
    icon: Car,
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200",
  },
  municipal: {
    label: "Municipal Authority",
    icon: Building2,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
  public: {
    label: "General Public",
    icon: Users,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
};

const URGENCY_COLORS: Record<string, { badge: string; dot: string }> = {
  low:      { badge: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  moderate: { badge: "bg-yellow-100 text-yellow-700 border-yellow-200",   dot: "bg-yellow-400" },
  high:     { badge: "bg-orange-100 text-orange-700 border-orange-200",   dot: "bg-orange-500" },
  critical: { badge: "bg-red-100 text-red-700 border-red-200",            dot: "bg-red-500"    },
};

/* ── Gemini AI helper ─────────────────────────────────────── */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? "";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODELS = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"];

async function callGemini(prompt: string): Promise<string> {
  let lastErr: Error | null = null;
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 900 },
        }),
      });
      if (!res.ok) throw new Error(`Gemini ${model} error ${res.status}`);
      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (text) return text;
    } catch (e) {
      lastErr = e as Error;
      console.warn(`[Gemini] model ${model} failed:`, (e as Error).message);
    }
  }
  throw lastErr ?? new Error("All Gemini models failed");
}

function buildPrompt(
  location: string,
  aqi: number,
  category: string,
  pm25: number,
  pm10: number,
  windDir: string,
  windSpeed: number,
  temp: number,
  humidity: number,
  predicted: number,
  dominant: string
): string {
  return `You are an AI air quality decision support system for Indian cities.

Current environmental data for **${location}**:
- AQI: ${aqi} (${category})
- PM2.5: ${pm25} µg/m³ | PM10: ${pm10} µg/m³ | Dominant pollutant: ${dominant}
- Wind: ${windSpeed} km/h from ${windDir}
- Temperature: ${temp}°C | Humidity: ${humidity}%
- Predicted AQI (next hour): ${predicted}

Generate precise, hyper-local decision support panels for THREE roles. Return ONLY valid JSON (no markdown, no explanation):

{
  "traffic": {
    "urgency": "low|moderate|high|critical",
    "summary": "One-line situation summary for traffic police at ${location}",
    "actions": ["action1", "action2", "action3"],
    "impacts": ["impact1", "impact2", "impact3"]
  },
  "municipal": {
    "urgency": "low|moderate|high|critical",
    "summary": "One-line situation summary for municipal authority at ${location}",
    "actions": ["action1", "action2", "action3"],
    "impacts": ["impact1", "impact2", "impact3"]
  },
  "public": {
    "urgency": "low|moderate|high|critical",
    "summary": "One-line situation summary for residents of ${location}",
    "actions": ["action1", "action2", "action3"],
    "impacts": ["impact1", "impact2", "impact3"]
  }
}

Rules:
- All actions and impacts must be specific to ${location} and the exact AQI/pollutant values above.
- Traffic actions: vehicle restrictions, signal timing, diversions near high-emission zones.
- Municipal actions: water sprinklers, construction halts, emergency advisories, green cover.
- Public actions: mask recommendations, outdoor activity windows, health precautions.
- Impacts must be quantified (e.g. "Reduces PM2.5 by ~12 µg/m³", "Safe window: 7–9 AM").
- urgency must reflect AQI: <=50→low, 51-100→moderate, 101-200→high, >200→critical.`;
}

function parseAiResponse(raw: string): AiPanels | null {
  try {
    // Strip any accidental markdown fences
    const clean = raw.replace(/```json|```/gi, "").trim();
    const obj = JSON.parse(clean);
    const roles: Role[] = ["traffic", "municipal", "public"];
    for (const r of roles) {
      if (!obj[r]?.actions || !obj[r]?.impacts) return null;
    }
    return { ...obj, generatedAt: new Date().toLocaleTimeString() };
  } catch {
    return null;
  }
}

/* ── Fallback static panels (when AI unavailable) ─────────── */
function buildStaticPanels(aqi: number, windDir: string, windSpeed: number, predicted: number, location: string): AiPanels {
  const urgency = aqi > 200 ? "critical" : aqi > 150 ? "high" : aqi > 100 ? "moderate" : "low";
  return {
    traffic: {
      urgency,
      summary: `AQI ${aqi} at ${location} — adjust traffic flow to reduce vehicular emissions.`,
      actions: [
        `Activate diversion at ${windDir}-facing junctions to reduce congestion`,
        `Increase signal cycle by ${Math.min(30, Math.round(windSpeed * 0.8))} sec at high-emission points`,
        `Restrict heavy diesel vehicles for ${Math.ceil(aqi / 100)} hour(s)`,
      ],
      impacts: [
        `Estimated AQI reduction: -${Math.round(Math.min(25, (aqi - 50) / 4))}%`,
        `Traffic redistribution: ${Math.min(30, Math.round(aqi / 5))}% shift`,
        `Effect visible within ${Math.round(30 + aqi / 10)} min`,
      ],
    },
    municipal: {
      urgency,
      summary: `Dust and industrial emissions elevated at ${location} — deploy mitigation measures.`,
      actions: [
        `Issue health advisory for ${aqi > 150 ? "all" : "sensitive"} residents`,
        `Deploy water sprinklers along ${windDir} sector roads`,
        `Halt construction activity in high-AQI zones for ${Math.ceil(aqi / 100)} hr`,
      ],
      impacts: [
        `Dust suppression: ~${Math.round(aqi * 0.1)} µg/m³ reduction`,
        `Predicted AQI in 1 hr: ${predicted}`,
        `Affected radius: ${Math.round(windSpeed * 0.2 + 1)} km`,
      ],
    },
    public: {
      urgency,
      summary: `Air quality at ${location} is ${urgency}. Take appropriate precautions.`,
      actions: [
        `${aqi > 150 ? "Avoid all" : "Limit"} outdoor activities`,
        `Wear N95 mask${aqi > 100 ? " — mandatory for children and elderly" : " if outdoors > 1 hr"}`,
        `Keep windows closed and run air purifier`,
      ],
      impacts: [
        `Current risk level: ${urgency.toUpperCase()}`,
        `Best outdoor window: ${windSpeed > 12 ? "Early morning (dispersal winds)" : "After 7 PM"}`,
        `PM2.5 exposure limit reached after: ${Math.round(300 / (aqi / 50))} min outdoors`,
      ],
    },
    generatedAt: new Date().toLocaleTimeString(),
  };
}

/* ── Typewriter component ─────────────────────────────────── */
const TypewriterText = ({ text }: { text: string }) => {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(id);
      }
    }, 12);
    return () => clearInterval(id);
  }, [text]);
  return <span>{displayed}</span>;
};

/* ── Main Component ────────────────────────────────────────── */
const DecisionSupport = () => {
  const [geoState, setGeoState] = useState<"idle" | "locating" | "granted" | "denied">("idle");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState("Your Location");

  const [role, setRole] = useState<Role>("traffic");
  const [panels, setPanels] = useState<AiPanels | null>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "thinking" | "done" | "error">("idle");
  const generatingRef = useRef(false);

  const { data, loading, error: aqiError, refresh } = useAqiData(coords?.lat, coords?.lon);

  /* ── Location detection ── */
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) { setGeoState("denied"); return; }
    setGeoState("locating");
    navigator.geolocation.getCurrentPosition(
      async ({ coords: c }) => {
        const lat = parseFloat(c.latitude.toFixed(5));
        const lon = parseFloat(c.longitude.toFixed(5));
        setCoords({ lat, lon });
        setGeoState("granted");
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
          const j = await r.json();
          const city = j.address?.city || j.address?.town || j.address?.village || j.address?.county || "Your Area";
          const state = j.address?.state ?? "";
          setLocationLabel(state ? `${city}, ${state}` : city);
        } catch {
          setLocationLabel(`${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E`);
        }
      },
      () => {
        setGeoState("denied");
        setCoords({ lat: 18.5204, lon: 73.8567 });
        setLocationLabel("Pune, Maharashtra (default)");
        refresh(18.5204, 73.8567);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  }, [refresh]);

  useEffect(() => { detectLocation(); }, [detectLocation]);

  /* ── AI generation ── */
  const generateAiPanels = useCallback(async () => {
    if (!data || generatingRef.current) return;
    generatingRef.current = true;
    setAiStatus("thinking");
    try {
      const prompt = buildPrompt(
        locationLabel,
        data.currentAqi,
        data.category,
        data.currentPm25,
        data.currentPm10,
        data.weather?.windDirectionLabel ?? "N",
        data.weather?.windSpeed ?? 0,
        data.weather?.temperature ?? 25,
        data.weather?.humidity ?? 50,
        data.predictedAqi,
        data.dominant
      );
      const raw = await callGemini(prompt);
      const parsed = parseAiResponse(raw);
      if (parsed) {
        setPanels(parsed);
        setAiStatus("done");
      } else {
        throw new Error("Could not parse AI response");
      }
    } catch (err) {
      console.warn("Gemini failed, using static fallback:", err);
      // Fall back gracefully
      setPanels(buildStaticPanels(
        data.currentAqi,
        data.weather?.windDirectionLabel ?? "N",
        data.weather?.windSpeed ?? 0,
        data.predictedAqi,
        locationLabel
      ));
      setAiStatus("done");
      // Silent fallback — no user-visible error
    } finally {
      generatingRef.current = false;
    }
  }, [data, locationLabel]);

  // Auto-generate when data + location arrive
  useEffect(() => {
    if (data && geoState !== "idle" && geoState !== "locating" && aiStatus === "idle") {
      generateAiPanels();
    }
  }, [data, geoState, aiStatus, generateAiPanels]);

  const handleRegenerate = () => {
    setPanels(null);
    setAiStatus("idle");
    setTimeout(() => generateAiPanels(), 50);
  };

  const panel = panels?.[role];
  const roleMeta = ROLE_META[role];
  const urgencyStyle = panel ? URGENCY_COLORS[panel.urgency] : URGENCY_COLORS.low;

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">
              AI Decision Support
            </h1>
            <p className="text-xs text-muted-foreground">
              Role-based guidance generated by Gemini AI for your location
            </p>
          </div>
        </div>
        <button
          onClick={() => { refresh(coords?.lat, coords?.lon); handleRegenerate(); }}
          className="rounded-lg bg-secondary p-2 text-secondary-foreground hover:bg-secondary/80"
          title="Refresh data and regenerate"
        >
          <RefreshCcw className={`h-4 w-4 ${loading || aiStatus === "thinking" ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── Location strip ── */}
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm ${
        geoState === "locating" ? "border-primary/30 bg-primary/5"
        : geoState === "granted" ? "border-emerald-200 bg-emerald-50"
        : "border-amber-200 bg-amber-50"
      }`}>
        {geoState === "locating"
          ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
          : geoState === "granted"
          ? <Navigation className="h-4 w-4 text-emerald-600" />
          : <MapPin className="h-4 w-4 text-amber-600" />}
        <span className={`text-xs font-medium ${geoState === "granted" ? "text-emerald-700" : "text-amber-700"}`}>
          {geoState === "locating" ? "Detecting location…"
          : geoState === "granted" ? `📍 ${locationLabel}`
          : `📍 ${locationLabel}`}
        </span>
        {coords && (
          <span className="ml-auto text-[10px] text-muted-foreground">
            {coords.lat.toFixed(4)}°N, {coords.lon.toFixed(4)}°E
          </span>
        )}
      </div>

      {(aqiError) && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {aqiError}
        </div>
      )}


      {/* ── Live context bar ── */}
      {data && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: `AQI ${data.currentAqi}`, sub: data.category },
            { label: `PM2.5 ${data.currentPm25}`, sub: "µg/m³" },
            { label: `Wind ${data.weather?.windDirectionLabel}`, sub: `${data.weather?.windSpeed} km/h` },
            { label: `Predicted ${data.predictedAqi}`, sub: "next hr" },
          ].map((p) => (
            <div key={p.label} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 shadow-card">
              <span className="text-xs font-bold text-foreground">{p.label}</span>
              <span className="text-[10px] text-muted-foreground">{p.sub}</span>
            </div>
          ))}
          {panels && (
            <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5">
              <Bot className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-semibold text-primary">AI · {panels.generatedAt}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Role Tabs ── */}
      <div className="flex gap-2 rounded-xl border border-border bg-card p-1 shadow-card">
        {(Object.keys(ROLE_META) as Role[]).map((r) => {
          const m = ROLE_META[r];
          const isActive = role === r;
          return (
            <button
              key={r}
              id={`role-tab-${r}`}
              onClick={() => setRole(r)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
                isActive
                  ? `${m.bg} ${m.border} border ${m.color} shadow-card`
                  : "text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <m.icon className={`h-4 w-4 ${isActive ? m.color : ""}`} />
              <span className="hidden sm:inline">{m.label}</span>
              <span className="sm:hidden">{m.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      {/* ── AI Thinking state ── */}
      {aiStatus === "thinking" && (
        <Card className="p-6 shadow-card">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 animate-pulse text-primary" />
              </div>
            </div>
            <div>
              <p className="font-display font-semibold text-foreground">
                Gemini AI is analysing {locationLabel}…
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Generating role-specific decisions based on live AQI and weather data
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Loading AQI ── */}
      {loading && !data && aiStatus === "idle" && (
        <div className="flex h-32 items-center justify-center gap-3 text-sm text-muted-foreground">
          <Activity className="h-5 w-5 animate-pulse text-primary" />
          Fetching live AQI for your location…
        </div>
      )}

      {/* ── AI Panel ── */}
      {aiStatus === "done" && panel && (
        <div className="grid gap-5 lg:grid-cols-3">

          {/* Summary + Urgency */}
          <div className="lg:col-span-3">
            <div className={`flex flex-wrap items-start gap-3 rounded-2xl border p-4 ${roleMeta.bg} ${roleMeta.border}`}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${roleMeta.bg}`} style={{ filter: "brightness(0.9)" }}>
                <roleMeta.icon className={`h-5 w-5 ${roleMeta.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-display text-sm font-bold ${roleMeta.color}`}>
                    {roleMeta.label}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${urgencyStyle.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${urgencyStyle.dot}`} />
                    {panel.urgency} urgency
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Bot className="h-3 w-3" /> Gemini AI
                  </span>
                </div>
                <p className={`mt-1.5 text-sm font-medium ${roleMeta.color}`}>
                  <TypewriterText text={panel.summary} />
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRegenerate}
                className={`gap-1.5 rounded-lg border text-xs ${roleMeta.border} ${roleMeta.color} hover:${roleMeta.bg}`}
                id="regenerate-ai-btn"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Regenerate
              </Button>
            </div>
          </div>

          {/* Recommended Actions */}
          <Card className="shadow-card lg:col-span-2">
            <div className="p-5">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${roleMeta.bg}`}>
                  <Zap className={`h-4 w-4 ${roleMeta.color}`} />
                </div>
                <h3 className="font-display text-sm font-bold text-foreground">
                  AI Recommended Actions
                </h3>
              </div>
              <ul className="mt-4 space-y-3">
                {panel.actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                      panel.urgency === "critical" ? "bg-red-500"
                      : panel.urgency === "high" ? "bg-orange-500"
                      : panel.urgency === "moderate" ? "bg-yellow-500"
                      : "bg-emerald-500"
                    }`}>{i + 1}</span>
                    <span className="text-sm text-foreground/80">{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* Expected Impact */}
          <Card className="shadow-card">
            <div className="p-5">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${roleMeta.bg}`}>
                  <BarChart3 className={`h-4 w-4 ${roleMeta.color}`} />
                </div>
                <h3 className="font-display text-sm font-bold text-foreground">
                  Expected Impact
                </h3>
              </div>
              <ul className="mt-4 space-y-3">
                {panel.impacts.map((imp, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${roleMeta.color}`} />
                    <span className="text-sm text-muted-foreground">{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* All-roles quick view */}
          <Card className="p-4 shadow-card lg:col-span-3">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Overview — All Roles
              </h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {(Object.keys(ROLE_META) as Role[]).map((r) => {
                const m = ROLE_META[r];
                const p = panels![r];
                const us = URGENCY_COLORS[p.urgency];
                return (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`text-left rounded-xl border p-4 transition-all hover:shadow-card ${
                      role === r ? `${m.bg} ${m.border}` : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <m.icon className={`h-4 w-4 ${m.color}`} />
                      <span className="text-xs font-bold text-foreground">{m.label}</span>
                      <span className={`ml-auto h-2 w-2 rounded-full ${us.dot}`} />
                    </div>
                    <p className="mt-2 text-[11px] leading-snug text-muted-foreground line-clamp-2">
                      {p.summary}
                    </p>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DecisionSupport;
