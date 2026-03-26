import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DashboardLayout from "./components/DashboardLayout";
import AirQualityMap from "./pages/dashboard/AirQualityMap";
import PredictionIntelligence from "./pages/dashboard/PredictionIntelligence";
import PollutionSpread from "./pages/dashboard/PollutionSpread";
import ExposureRisk from "./pages/dashboard/ExposureRisk";
import DecisionSupport from "./pages/dashboard/DecisionSupport";
import AqiTrends from "./pages/dashboard/AqiTrends";
import NotFound from "./pages/NotFound";
import ContactUs from "./pages/ContactUs";
import AboutUs from "./pages/AboutUs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<AirQualityMap />} />
            <Route path="predictions" element={<PredictionIntelligence />} />
            <Route path="pollution-spread" element={<PollutionSpread />} />
            <Route path="exposure-risk" element={<ExposureRisk />} />
            <Route path="decision-support" element={<DecisionSupport />} />
            <Route path="trends" element={<AqiTrends />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
