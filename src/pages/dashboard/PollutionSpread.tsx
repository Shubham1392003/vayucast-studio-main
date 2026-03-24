import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Radar } from "lucide-react";
import spreadIllustration from "@/assets/spread-illustration.png";

const PollutionSpread = () => {
  return (
    <div className="flex h-full flex-col gap-0 lg:flex-row">
      {/* Left: Controls + Map */}
      <div className="flex flex-1 flex-col">
        {/* Header controls */}
        <div className="flex flex-wrap items-start gap-3 border-b border-border bg-card p-3 sm:gap-6 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Radar className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
            <div>
              <h1 className="font-display text-sm font-bold text-foreground sm:text-lg">Pollution Spread Simulation</h1>
              <p className="text-[10px] text-muted-foreground sm:text-xs">Wind-driven AQI propagation analysis</p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted-foreground sm:inline">Select Source Junction:</span>
              <Select defaultValue="junction-a">
                <SelectTrigger className="w-32 sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="junction-a">Junction A</SelectItem>
                  <SelectItem value="junction-b">Junction B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="hidden sm:block">
              <p className="text-xs text-muted-foreground">Live Wind Data:</p>
              <p className="text-sm font-medium text-foreground">South-East</p>
              <p className="text-xs text-muted-foreground">14 km/h</p>
            </div>
            <Button className="rounded-full px-6 sm:px-8">Run</Button>
          </div>
        </div>

        {/* Map */}
        <div className="relative min-h-[300px] flex-1">
          <iframe
            src="https://www.openstreetmap.org/export/embed.html?bbox=-99.22%2C19.35%2C-99.08%2C19.45&layer=mapnik"
            className="h-full w-full border-0"
            title="Pollution Spread Map"
          />
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full space-y-4 overflow-y-auto border-t border-border bg-card p-4 lg:w-64 lg:border-l lg:border-t-0 xl:w-72">
        <div className="flex justify-center">
          <img src={spreadIllustration} alt="Spread illustration" className="h-20 w-auto sm:h-28" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 shadow-card">
            <p className="text-xs font-semibold text-foreground">Spread Overview</p>
            <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
              <p>Source AQI: <span className="font-bold text-foreground">148</span></p>
              <p>Wind Direction: <span className="font-bold text-foreground">South-East</span></p>
              <p>Spread Radius: <span className="font-bold text-foreground">1.5 km</span></p>
            </div>
          </Card>
          <Card className="p-3 shadow-card">
            <p className="text-xs font-semibold text-foreground">Affected Areas</p>
            <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
              <p>Junction B → <span className="font-bold text-destructive">+22 AQI</span></p>
              <p>Junction C → <span className="font-bold text-destructive">+15 AQI</span></p>
            </div>
          </Card>
        </div>

        <Card className="border-destructive/30 bg-destructive/5 p-3 shadow-card">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-[11px] text-foreground">
              Pollution plume is moving toward a residential zone. Sensitive individuals should limit outdoor exposure.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PollutionSpread;
