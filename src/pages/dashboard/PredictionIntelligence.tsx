import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { 
  ArrowUp, ArrowDown, Brain, RefreshCcw, Activity, 
  Car, Info, Database, MapPin 
} from "lucide-react";
import { useAqiData } from "@/hooks/useAqiData";

const CONFIDENCE_COLORS = ["hsl(130,50%,32%)", "hsl(36,90%,55%)"];
const ML_BACKEND_URL = import.meta.env.VITE_ML_BACKEND_URL || "http://localhost:5000";

const PredictionIntelligence = () => {
  const { data, loading, error, refresh } = useAqiData();
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── Fetch History ──────────────────────────────────────────────────────────
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${ML_BACKEND_URL}/api/history`);
      const json = await res.json();
      if (json.success) {
        setHistory(json.history.map((h: any) => ({
          ...h,
          time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actual: h.currentAqi,
          predicted: h.predictedAqi
        })));
      }
    } catch (e) {
      console.error("History fetch error:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const handleRefresh = () => {
    refresh();
    fetchHistory();
  };

  const confidenceData = [
    { name: "Reliable", value: data?.confidence ?? 0 },
    { name: "Variability",  value: Math.max(0, 100 - (data?.confidence ?? 0)) },
  ];

  const currentAqi   = data?.currentAqi   ?? 0;
  const predictedAqi = data?.predictedAqi ?? 0;
  const aqiChange    = predictedAqi - currentAqi;
  const changePct    = data?.aqiChangePct ?? 0;
  const isIncreasing = aqiChange > 0;

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary shadow-sm">
            <Brain className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div>
            <h1 className="font-display text-lg font-extrabold tracking-tight text-foreground sm:text-2xl">
              Prediction Intelligence
            </h1>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground sm:text-[10px]">
                <Database className="h-2.5 w-2.5 text-success" />
                Live Firebase Stream
              </span>
              <span className="text-[9px] text-muted-foreground sm:text-[10px]">·</span>
              <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground sm:text-[10px]">
                <MapPin className="h-2.5 w-2.5" />
                Pune (18.52° N, 73.85° E)
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-full bg-secondary/50 px-2 py-1 text-[9px] font-medium text-muted-foreground sm:flex">
            <Info className="h-3 w-3" />
            8h Sliding Window
          </div>
          <button
            onClick={handleRefresh}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border shadow-sm text-foreground transition-all hover:bg-secondary hover:scale-105 active:scale-95"
            title="Refresh AI"
          >
            <RefreshCcw className={`h-4 w-4 ${loading || historyLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Backend Alert (if error) */}
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs font-medium text-destructive backdrop-blur-sm animate-in slide-in-from-top-2">
          {error}
        </div>
      )}

      {/* ── Dashboard Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card className="group relative overflow-hidden rounded-2xl border-none bg-card p-3 shadow-card transition-all hover:-translate-y-1 hover:shadow-xl sm:p-4">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-primary/20" />
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">Current AQI</p>
          <div className="flex items-baseline gap-1">
            <p className="font-display text-2xl font-black text-destructive sm:text-3xl">
              {data ? currentAqi : "—"}
            </p>
            <span className="text-[10px] text-muted-foreground">US AQI</span>
          </div>
          <div className="mt-2 flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
            <span className="text-[9px] font-medium text-muted-foreground sm:text-[10px]">Real-time {data?.dominant}</span>
          </div>
        </Card>

        <Card className="group relative overflow-hidden rounded-2xl border-none bg-card p-3 shadow-card transition-all hover:-translate-y-1 hover:shadow-xl sm:p-4">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-warning/20" />
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">1hr Forecast</p>
          <div className="flex items-center gap-1.5">
            <p className="font-display text-2xl font-black text-foreground sm:text-3xl">
              {data ? predictedAqi : "—"}
            </p>
            {data && (isIncreasing
              ? <ArrowUp className="h-5 w-5 text-destructive animate-bounce" />
              : <ArrowDown className="h-5 w-5 text-success animate-bounce" />)}
          </div>
          <p className="mt-2 text-[9px] font-medium text-muted-foreground sm:text-[10px]">
             {isIncreasing ? "Trend: Rising" : "Trend: Improving"}
          </p>
        </Card>

        <Card className="group relative overflow-hidden rounded-2xl border-none bg-card p-3 shadow-card transition-all hover:-translate-y-1 hover:shadow-xl sm:p-4">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-info/20" />
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">Traffic Density</p>
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-info sm:h-6 sm:w-6" />
            <p className="font-display text-2xl font-black text-info sm:text-3xl">
              {data ? `${data.trafficDensity}%` : "—"}
            </p>
          </div>
          <p className="mt-2 text-[9px] font-medium text-muted-foreground sm:text-[10px]">Live Google Maps Data</p>
        </Card>

        <Card className="group relative overflow-hidden rounded-2xl border-none bg-card p-3 shadow-card transition-all hover:-translate-y-1 hover:shadow-xl sm:p-4">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-success/20" />
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">Predict Change</p>
          <p className={`font-display text-2xl font-black sm:text-3xl ${isIncreasing ? "text-destructive" : "text-success"}`}>
            {data ? `${changePct > 0 ? "+" : ""}${changePct}%` : "—"}
          </p>
          <p className="mt-2 text-[9px] font-medium text-muted-foreground sm:text-[10px]">vs current hourly</p>
        </Card>

        <Card className="group relative overflow-hidden rounded-2xl border-none bg-card p-3 shadow-card transition-all hover:-translate-y-1 hover:shadow-xl sm:p-4">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-secondary/20" />
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">Reliability</p>
          <div className="flex items-baseline gap-1">
            <p className="font-display text-2xl font-black text-foreground sm:text-3xl">
              {data ? `${data.confidence}%` : "—"}
            </p>
          </div>
          <p className="mt-2 text-[9px] font-medium text-muted-foreground sm:text-[10px]">ML Confidence Index</p>
        </Card>
      </div>

      {/* ── Charts & Insights ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main history chart */}
        <Card className="relative p-3 shadow-card sm:p-6 lg:col-span-2 rounded-2xl border-none bg-card overflow-hidden">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-bold text-foreground sm:text-base">
                Performance Audit: Actual vs Forecasted
              </h3>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold text-muted-foreground">
              8h Archive
              {historyLoading && <RefreshCcw className="h-2.5 w-2.5 animate-spin ml-1" />}
            </div>
          </div>
          
          <div className="h-[280px] w-full sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history.length > 0 ? history : []} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(130,15%,92%)" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 10, fontWeight: 500 }} 
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  tick={{ fontSize: 10, fontWeight: 500 }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                  formatter={(val: number, name: string) => [val, name === "actual" ? "Recorded" : "AI Forecast"]}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 20, fontSize: 11, fontWeight: 500 }} />
                <Line 
                  type="stepAfter" 
                  dataKey="actual" 
                  stroke="hsl(0,0%,20%)" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 2, fill: 'white' }} 
                  name="Recorded AQI" 
                  animationDuration={1500}
                />
                <Line 
                  type="monotone" 
                  dataKey="predicted" 
                  stroke="hsl(130,50%,32%)" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 2, fill: 'white' }} 
                  name="AI Forecast" 
                  strokeDasharray="8 5"
                  animationDuration={2000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {!historyLoading && history.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm">
              <p className="text-xs font-medium text-muted-foreground italic">
                Gathering historical performance logs... (awaiting next 15m cycle)
              </p>
            </div>
          )}
        </Card>

        {/* Breakdown Analytics */}
        <div className="flex flex-col gap-4">
          <Card className="flex-1 p-4 rounded-2xl border-none bg-card shadow-card">
            <h3 className="mb-4 text-center font-display text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground sm:text-xs">
              Sensitivity Breakdown
            </h3>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.factors ?? []}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {(data?.factors ?? []).map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "hsl(210,80%,55%)" : i === 1 ? "hsl(25,95%,60%)" : "hsl(142,70%,45%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-center text-[9px] text-muted-foreground leading-relaxed px-2">
              Our AI weights <span className="font-bold text-foreground">Traffic</span> as the primary pollution vector in your urban sector.
            </p>
          </Card>

          <Card className="flex-1 p-4 rounded-2xl border-none bg-card shadow-card">
            <h3 className="mb-4 text-center font-display text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground sm:text-xs">
              Model Precision Profile
            </h3>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={confidenceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {confidenceData.map((_, i) => (
                      <Cell key={i} fill={CONFIDENCE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex justify-center gap-4">
              <div className="flex items-center gap-1.5 text-[9px] font-bold">
                <div className="h-2 w-2 rounded-full bg-[hsl(130,50%,32%)]" /> Reliable
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-bold">
                <div className="h-2 w-2 rounded-full bg-[hsl(36,90%,55%)]" /> Varied
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PredictionIntelligence;
