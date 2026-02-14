import { Card } from "@/components/ui/card";
import { ArrowUp } from "lucide-react";
import airQualityIllustration from "@/assets/air-quality-illustration.png";

const AirQualityMap = () => {
  return (
    <div className="flex h-full flex-col gap-0 lg:flex-row">
      {/* Map area */}
      <div className="relative min-h-[300px] flex-1 sm:min-h-[400px]">
        <iframe
          src="https://www.openstreetmap.org/export/embed.html?bbox=-99.22%2C19.35%2C-99.08%2C19.45&layer=mapnik"
          className="h-full w-full border-0"
          title="Air Quality Map"
        />
        {/* Junction markers overlaid */}
        <div className="absolute bottom-4 left-4 rounded-xl bg-card p-2 shadow-card sm:bottom-32 sm:left-1/3 sm:p-3">
          <p className="text-[10px] text-muted-foreground sm:text-xs">Junction A – Central Market</p>
          <div className="mt-1 flex items-center gap-2 sm:gap-3">
            <div>
              <span className="text-[10px] text-muted-foreground sm:text-xs">AQI</span>
              <p className="font-display text-xl font-bold text-foreground sm:text-2xl">124</p>
            </div>
            <span className="rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-warning-foreground sm:px-3 sm:py-1 sm:text-xs">
              MODERATE
            </span>
          </div>
        </div>
        <div className="absolute right-4 top-4 rounded-xl bg-card p-2 shadow-card sm:right-1/3 sm:top-1/3 sm:p-3">
          <p className="text-[10px] text-muted-foreground sm:text-xs">Junction B – Central Market</p>
          <div className="mt-1 flex items-center gap-2 sm:gap-3">
            <div>
              <span className="text-[10px] text-muted-foreground sm:text-xs">AQI</span>
              <p className="font-display text-xl font-bold text-foreground sm:text-2xl">50</p>
            </div>
            <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-success-foreground sm:px-3 sm:py-1 sm:text-xs">
              Low
            </span>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full space-y-4 overflow-y-auto border-t border-border bg-card p-4 lg:w-72 lg:border-l lg:border-t-0 xl:w-80">
        <div className="flex justify-center">
          <img src={airQualityIllustration} alt="Air quality" className="h-24 w-auto sm:h-32" />
        </div>

        <h3 className="text-center font-display text-base font-bold text-foreground sm:text-lg">
          Air Quality Overview
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 text-center shadow-card">
            <p className="text-xs text-muted-foreground">Current AQI</p>
            <p className="font-display text-2xl font-bold text-primary sm:text-3xl">124</p>
            <p className="text-[10px] text-muted-foreground">Dominant Pollutant: PM2.5</p>
            <span className="mt-1 inline-block rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-warning-foreground">
              Moderate
            </span>
          </Card>
          <Card className="p-3 text-center shadow-card">
            <p className="text-xs text-muted-foreground">1 Hour Forecast</p>
            <div className="flex items-center justify-center gap-1">
              <p className="font-display text-2xl font-bold text-destructive sm:text-3xl">148</p>
              <ArrowUp className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-[10px] text-muted-foreground">Predicted AQI</p>
            <p className="text-[10px] text-muted-foreground">Confidence: 87%</p>
          </Card>
        </div>

        <Card className="p-3 shadow-card">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs font-semibold text-foreground">Spread Impact</p>
              <p className="text-[11px] text-muted-foreground">Wind: South-East</p>
              <p className="text-[11px] text-muted-foreground">Speed: 14 km/h</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Affected Areas:</p>
              <p className="text-[11px] text-muted-foreground">Junction B <span className="font-bold text-destructive">+22 AQI</span></p>
              <p className="text-[11px] text-muted-foreground">Junction C <span className="font-bold text-destructive">+15 AQI</span></p>
            </div>
          </div>
        </Card>

        <Card className="p-3 shadow-card">
          <p className="text-xs font-semibold text-foreground">Exposure Risk</p>
          <div className="mt-2 flex justify-center">
            <span className="rounded-full border-2 border-warning px-4 py-1 text-xs font-bold text-warning">
              MODERATE RISK
            </span>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Prolonged outdoor exposure may cause discomfort. Limit activity and wear protective mask.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default AirQualityMap;
