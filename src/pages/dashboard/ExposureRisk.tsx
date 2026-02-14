import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ShieldAlert, Heart } from "lucide-react";
import riskIllustration from "@/assets/risk-illustration.png";
import exposureActionIllustration from "@/assets/exposure-action-illustration.png";

const riskData = [
  { name: "Risk", value: 72 },
  { name: "Safe", value: 28 },
];

const COLORS = ["hsl(36,90%,55%)", "hsl(120,15%,92%)"];

const ExposureRisk = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
        <div>
          <h1 className="font-display text-lg font-bold text-foreground sm:text-xl">Exposure Risk Assessment</h1>
          <p className="text-[10px] text-muted-foreground sm:text-xs">Health impact estimation based on AQI and exposure duration</p>
        </div>
      </div>

      {/* Top section: Form + Illustration */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        <Card className="p-4 shadow-card sm:p-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <label className="text-sm text-foreground sm:w-44">Exposure Duration (minutes)</label>
              <Input placeholder="Enter duration (e.g., 60)" className="flex-1" />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <label className="text-sm text-foreground sm:w-44">Activity Level</label>
              <Select>
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
            <div className="flex justify-center pt-2">
              <Button className="w-full rounded-full px-8 sm:w-auto">Calculate Risk</Button>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-center">
          <img src={riskIllustration} alt="Risk gauge" className="h-32 w-auto sm:h-48" />
        </div>
      </div>

      {/* Bottom section: Donut + Actions */}
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
            <p className="text-sm font-bold text-foreground">MODERATE RISK</p>
            <p className="text-xs text-muted-foreground">72/100</p>
          </div>
        </Card>

        <Card className="p-4 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
            <div className="flex-1">
              <h3 className="font-display text-base font-bold text-foreground sm:text-lg">Recommended Action</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• Reduce outdoor duration</li>
                <li>• Avoid peak traffic hours</li>
                <li>• Use N95 mask if exposed</li>
              </ul>
            </div>
            <img src={exposureActionIllustration} alt="Action" className="mx-auto h-24 w-auto sm:mx-0 sm:h-32" />
          </div>
        </Card>
      </div>

      <Card className="bg-warning/10 p-3 shadow-card sm:p-4">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-destructive" />
          <h3 className="font-display text-sm font-bold text-destructive sm:text-base">Health Advisory</h3>
        </div>
        <p className="mt-2 text-xs text-foreground sm:text-sm">
          Prolonged outdoor exposure may cause respiratory discomfort. Limit activity duration and wear protective mask.
        </p>
      </Card>
    </div>
  );
};

export default ExposureRisk;
