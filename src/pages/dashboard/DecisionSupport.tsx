import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings } from "lucide-react";
import decisionIllustration from "@/assets/decision-illustration.png";

const DecisionSupport = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
        <div>
          <h1 className="font-display text-lg font-bold text-foreground sm:text-xl">Role-Based Decision Support</h1>
          <p className="text-[10px] text-muted-foreground sm:text-xs">AI-generated recommendations tailored to user role</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        {/* Left: Role selector + recommendations */}
        <div className="space-y-4 sm:space-y-6">
          <Card className="p-4 shadow-card sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <label className="text-sm font-medium text-foreground">Select Role</label>
              <Select>
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
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="p-4 shadow-card sm:p-5">
              <h3 className="font-display text-sm font-bold text-foreground sm:text-base">AI Recommended Actions</h3>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground sm:text-sm">
                <li>• Activate diversion at Junction A</li>
                <li>• Increase signal timing by 15 sec</li>
                <li>• Restrict heavy vehicles for 1 hour</li>
              </ul>
            </Card>
            <Card className="p-4 shadow-card sm:p-5">
              <h3 className="font-display text-sm font-bold text-foreground sm:text-base">Expected Impact</h3>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground sm:text-sm">
                <li>• Estimated AQI reduction: -12%</li>
                <li>• Traffic redistribution: 18% shift</li>
                <li>• Impact time: 45 minutes</li>
              </ul>
            </Card>
          </div>
        </div>

        {/* Right: Illustration */}
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
