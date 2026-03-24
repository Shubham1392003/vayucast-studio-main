import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wind, Thermometer, Droplets, Eye } from "lucide-react";
import Navbar from "@/components/Navbar";
import heroIllustration from "@/assets/hero-illustration.png";
import vayucastLogo from "@/assets/vayucast-logo.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-hero-gradient">
        <div className="container grid min-h-[calc(100vh-4rem)] items-center gap-8 py-12 md:gap-12 md:py-16 md:grid-cols-2">
          <div className="animate-fade-in space-y-5 text-center md:space-y-6 md:text-left">
            <h1 className="font-display text-3xl font-extrabold leading-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
              Welcome to <span className="text-gradient-primary">VayuCast</span>
            </h1>
            <p className="mx-auto max-w-lg text-base text-muted-foreground md:mx-0 md:text-lg">
              An environmental quality monitoring and prediction system. Track air quality in real-time, predict pollution trends, and make informed decisions for a healthier future.
            </p>

            {/* Weather widget */}
            <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start md:gap-4">
              <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-2.5 shadow-card sm:px-4 sm:py-3">
                <Thermometer className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                <span className="font-display text-xl font-bold text-foreground sm:text-2xl">20° C</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-2.5 shadow-card sm:px-4 sm:py-3">
                <Droplets className="h-4 w-4 text-info sm:h-5 sm:w-5" />
                <span className="text-xs text-muted-foreground sm:text-sm">65% Humidity</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-2.5 shadow-card sm:px-4 sm:py-3">
                <Eye className="h-4 w-4 text-success sm:h-5 sm:w-5" />
                <span className="text-xs text-muted-foreground sm:text-sm">Good AQI</span>
              </div>
            </div>

            <div className="flex justify-center gap-3 md:justify-start">
              <Link to="/login">
                <Button size="lg">Login</Button>
              </Link>
              <Link to="/signup">
                <Button size="lg" variant="outline">Sign Up</Button>
              </Link>
            </div>
          </div>

          <div className="flex justify-center" style={{ animationDelay: "0.2s" }}>
            <img
              src={heroIllustration}
              alt="VayuCast air quality monitoring illustration"
              className="w-full max-w-xs animate-fade-in rounded-2xl sm:max-w-sm md:max-w-lg"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-12 md:py-20">
        <h2 className="mb-8 text-center font-display text-2xl font-bold text-foreground md:mb-12 md:text-3xl">
          Key Features
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Wind, title: "Real-time AQI Monitoring", desc: "Monitor air quality index across multiple locations in real-time." },
            { icon: Eye, title: "Prediction Intelligence", desc: "AI-powered predictions to forecast air quality trends accurately." },
            { icon: Droplets, title: "Pollution Spread Analysis", desc: "Visualize pollution dispersion patterns across geographic regions." },
          ].map((f, i) => (
            <div
              key={f.title}
              className="animate-fade-in rounded-xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-card-hover"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-display text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6 md:py-8">
        <div className="container flex flex-col items-center gap-3 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <img src={vayucastLogo} alt="VayuCAST" className="h-8 sm:h-9 md:h-10" />
          <p>© 2026 VayuCast. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
