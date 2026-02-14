import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter } from "recharts";
import { BarChart3 } from "lucide-react";

const aqiTrendData = [
  { time: "11 AM", aqi: 118 },
  { time: "12 PM", aqi: 125 },
  { time: "1 PM", aqi: 130 },
  { time: "2 PM", aqi: 138 },
  { time: "3 PM", aqi: 145 },
  { time: "4 PM", aqi: 155 },
];

const trafficCorrelationData = [
  { time: "11 AM", traffic: 40, aqi: 118 },
  { time: "12 PM", traffic: 60, aqi: 120 },
  { time: "1 PM", traffic: 70, aqi: 115 },
  { time: "2 PM", traffic: 80, aqi: 118 },
  { time: "3 PM", traffic: 90, aqi: 120 },
  { time: "4 PM", traffic: 100, aqi: 120 },
];

const windScatterData = [
  { wind: 2, aqi: 168 },
  { wind: 4, aqi: 155 },
  { wind: 6, aqi: 142 },
  { wind: 8, aqi: 138 },
  { wind: 10, aqi: 130 },
  { wind: 14, aqi: 120 },
  { wind: 16, aqi: 110 },
];

const hotspots = [
  { rank: 1, location: "Central Market Junction", aqi: 182, risk: "High" },
  { rank: 2, location: "Ring Road – Sector 4", aqi: 168, risk: "High" },
  { rank: 3, location: "Metro Station Circle", aqi: 154, risk: "Moderate" },
  { rank: 4, location: "Industrial Area Gate", aqi: 142, risk: "Moderate" },
  { rank: 5, location: "Residential Block A", aqi: 128, risk: "Moderate" },
];

const AqiTrends = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
        <div>
          <h1 className="font-display text-lg font-bold text-foreground sm:text-xl">AQI Trend & Correlation Analysis</h1>
          <p className="text-[10px] text-muted-foreground sm:text-xs">Statistical insights derived from traffic flow and wind-based pollution modeling.</p>
        </div>
      </div>

      {/* Top charts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-3 shadow-card sm:p-4">
          <h3 className="mb-2 text-center font-display text-xs font-bold text-foreground sm:text-sm">AQI Trend – Past 6 Hours</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={aqiTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(130,15%,88%)" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="aqi" stroke="hsl(210,80%,55%)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-3 shadow-card sm:p-4">
          <h3 className="mb-2 text-center font-display text-xs font-bold text-foreground sm:text-sm">Traffic vs AQI Correlation</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trafficCorrelationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(130,15%,88%)" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="traffic" stroke="hsl(210,80%,55%)" strokeWidth={2} dot={{ r: 3 }} name="Traffic Index" />
              <Line type="monotone" dataKey="aqi" stroke="hsl(36,90%,55%)" strokeWidth={2} dot={{ r: 3 }} name="AQI" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-3 shadow-card sm:p-4">
          <h3 className="mb-2 text-center font-display text-xs font-bold text-foreground sm:text-sm">Wind Speed vs AQI Impact</h3>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(130,15%,88%)" />
              <XAxis dataKey="wind" name="Wind Speed" tick={{ fontSize: 10 }} />
              <YAxis dataKey="aqi" name="AQI" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Scatter data={windScatterData} fill="hsl(210,80%,55%)" />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>

        <Card className="overflow-x-auto p-3 shadow-card sm:p-4">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 text-left font-semibold text-foreground">Rank</th>
                <th className="pb-3 text-left font-semibold text-foreground">Location</th>
                <th className="pb-3 text-left font-semibold text-foreground">AQI</th>
                <th className="pb-3 text-left font-semibold text-foreground">Risk</th>
              </tr>
            </thead>
            <tbody>
              {hotspots.map((h) => (
                <tr key={h.rank} className="border-b border-border/50">
                  <td className="py-2.5 text-muted-foreground sm:py-3">{h.rank}</td>
                  <td className="py-2.5 text-foreground sm:py-3">{h.location}</td>
                  <td className="py-2.5 font-bold text-foreground sm:py-3">{h.aqi}</td>
                  <td className="py-2.5 sm:py-3">
                    <span className="flex items-center gap-1.5">
                      {h.risk}
                      <span className={`inline-block h-3 w-3 rounded-full ${
                        h.risk === "High" ? "bg-destructive" : "bg-warning"
                      }`} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
};

export default AqiTrends;
