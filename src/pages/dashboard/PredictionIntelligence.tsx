import { Card } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { ArrowUp, Brain } from "lucide-react";

const lineData = [
  { time: "10 AM", actual: 112, predicted: 110 },
  { time: "11 AM", actual: 118, predicted: 120 },
  { time: "12 PM", actual: 125, predicted: 128 },
  { time: "1 PM", actual: 130, predicted: 138 },
  { time: "2 PM", actual: 135, predicted: 142 },
  { time: "3 PM", actual: 140, predicted: 150 },
  { time: "4 PM", actual: 140, predicted: 155 },
];

const factorData = [
  { name: "Traffic", value: 55 },
  { name: "Wind Speed", value: 25 },
  { name: "Wind Dir", value: 15 },
];

const confidenceData = [
  { name: "Confident", value: 87 },
  { name: "Uncertain", value: 13 },
];

const CONFIDENCE_COLORS = ["hsl(36,90%,55%)", "hsl(130,50%,32%)"];

const PredictionIntelligence = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Brain className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
        <div>
          <h1 className="font-display text-lg font-bold text-foreground sm:text-xl">Prediction Intelligence</h1>
          <p className="text-[10px] text-muted-foreground sm:text-xs">AI-driven AQI forecasting and impact analysis</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Card className="flex items-center gap-2 rounded-xl border-l-4 border-l-primary p-2 shadow-card sm:p-3">
          <div>
            <p className="text-[10px] text-muted-foreground sm:text-xs">Current AQI:</p>
            <p className="font-display text-lg font-bold text-destructive sm:text-xl">124</p>
            <p className="text-[9px] text-muted-foreground sm:text-[10px]">Dominant Pollutant: PM2.5</p>
          </div>
        </Card>
        <Card className="flex items-center gap-2 rounded-xl border-l-4 border-l-warning p-2 shadow-card sm:p-3">
          <div>
            <p className="text-[10px] text-muted-foreground sm:text-xs">Predicted AQI:</p>
            <div className="flex items-center gap-1">
              <p className="font-display text-lg font-bold text-foreground sm:text-xl">148</p>
              <ArrowUp className="h-3 w-3 text-destructive sm:h-4 sm:w-4" />
            </div>
            <p className="text-[9px] text-muted-foreground sm:text-[10px]">Forecasted Increase</p>
          </div>
        </Card>
        <Card className="flex items-center gap-2 rounded-xl border-l-4 border-l-success p-2 shadow-card sm:p-3">
          <div>
            <p className="text-[10px] text-muted-foreground sm:text-xs">Change:</p>
            <p className="font-display text-lg font-bold text-primary sm:text-xl">+19%</p>
            <p className="text-[9px] text-muted-foreground sm:text-[10px]">Compared to current hour</p>
          </div>
        </Card>
        <Card className="flex items-center gap-2 rounded-xl border-l-4 border-l-info p-2 shadow-card sm:p-3">
          <div>
            <p className="text-[10px] text-muted-foreground sm:text-xs">Confidence:</p>
            <p className="font-display text-lg font-bold text-foreground sm:text-xl">87%</p>
            <p className="text-[9px] text-muted-foreground sm:text-[10px]">Model Reliability</p>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main line chart */}
        <Card className="p-3 shadow-card sm:p-4 lg:col-span-2">
          <h3 className="mb-2 text-center font-display text-xs font-bold text-foreground sm:text-sm">
            Actual vs Predicted AQI
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(130,15%,88%)" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="actual" stroke="hsl(0,0%,50%)" strokeWidth={2} dot={{ r: 3 }} name="Actual AQI" />
              <Line type="monotone" dataKey="predicted" stroke="hsl(130,50%,32%)" strokeWidth={2} dot={{ r: 3 }} name="Predicted AQI" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Right column */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <Card className="p-3 shadow-card sm:p-4">
            <h3 className="mb-2 text-center font-display text-[10px] font-bold text-foreground sm:text-xs">
              Factor Contribution to AQI
            </h3>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={factorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(130,15%,88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(210,80%,55%)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-3 shadow-card sm:p-4">
            <h3 className="mb-2 text-center font-display text-[10px] font-bold text-foreground sm:text-xs">
              Prediction Confidence
            </h3>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={confidenceData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" label={({ value }) => `${value}%`}>
                  {confidenceData.map((_, i) => (
                    <Cell key={i} fill={CONFIDENCE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PredictionIntelligence;
