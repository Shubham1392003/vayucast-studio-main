import { Link } from "react-router-dom";
import {
  Wind,
  Target,
  Eye,
  Heart,
  Users,
  BarChart3,
  MapPin,
  Shield,
  Leaf,
  Zap,
  Globe,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import vayucastLogo from "@/assets/vayucast-logo.png";

/* ── Data ────────────────────────────────────────────────── */

const stats = [
  { value: "15+", label: "Cities Covered", icon: MapPin },
  { value: "50K+", label: "Active Users", icon: Users },
  { value: "99.2%", label: "Uptime SLA", icon: Shield },
  { value: "24/7", label: "Real-time Monitoring", icon: Zap },
];

const values = [
  {
    icon: Leaf,
    title: "Environmental Responsibility",
    desc: "Every feature we build serves one goal: cleaner air for every citizen. We embed sustainability into our code.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Eye,
    title: "Radical Transparency",
    desc: "Our data sources, model accuracy rates and methodology are publicly documented — no black boxes.",
    color: "text-sky-600",
    bg: "bg-sky-50",
  },
  {
    icon: Heart,
    title: "Community First",
    desc: "We partner with local health departments, schools and NGOs to deliver air-quality insights where they matter most.",
    color: "text-rose-500",
    bg: "bg-rose-50",
  },
  {
    icon: BarChart3,
    title: "Data-Driven Decisions",
    desc: "Our ML models are continuously retrained on CPCB sensor feeds so predictions stay sharp and actionable.",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    icon: Globe,
    title: "Pan-India Reach",
    desc: "Starting with Tier-1 cities and rapidly expanding to Tier-2 and rural monitoring stations across all states.",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    icon: Award,
    title: "Research-Backed",
    desc: "Built in collaboration with environmental science researchers and validated against ground truth sensor networks.",
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
];

const team = [
  {
    name: "Shubham Kshirsagar",
    role: "Project Lead & Full-Stack Developer",
    initials: "SK",
    color: "from-emerald-500 to-teal-600",
    desc: "Architected the VayuCast platform end-to-end — from the React frontend to the Python ML pipeline.",
  },
  {
    name: "Team Member 2",
    role: "ML & Data Engineer",
    initials: "TM",
    color: "from-sky-500 to-blue-600",
    desc: "Built the LSTM-based AQI forecasting models and automated the CPCB data ingestion pipeline.",
  },
  {
    name: "Team Member 3",
    role: "Backend & DevOps",
    initials: "T3",
    color: "from-violet-500 to-purple-600",
    desc: "Designed the REST API, managed cloud deployment and ensured 99%+ platform uptime.",
  },
];

const timeline = [
  {
    year: "2024",
    title: "Idea & Research",
    desc: "Identified the gap in accessible, real-time air quality data for Indian cities. Started literature review and dataset exploration.",
  },
  {
    year: "2024",
    title: "MVP Development",
    desc: "Built the first prototype with static AQI data, a Leaflet map view, and a basic ML model trained on historical CPCB records.",
  },
  {
    year: "2025",
    title: "Live Sensor Integration",
    desc: "Connected to live CPCB API feeds for 10 Indian cities. Launched real-time monitoring with animated map overlays.",
  },
  {
    year: "2026",
    title: "Predictive Intelligence",
    desc: "Deployed LSTM-based 24-hour AQI forecasting, pollution spread simulation, and exposure risk scoring for all supported cities.",
  },
];

/* ── Component ───────────────────────────────────────────── */

const AboutUs = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-hero-gradient py-20 md:py-28">
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full opacity-25"
          style={{
            background:
              "radial-gradient(circle, hsl(130 50% 55% / 0.4), transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 right-0 h-64 w-64 rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, hsl(142 70% 45% / 0.35), transparent 70%)",
          }}
        />

        <div className="container relative grid items-center gap-12 md:grid-cols-2">
          <div className="animate-fade-in space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
              <Wind className="h-4 w-4" />
              Our Story
            </span>
            <h1 className="font-display text-4xl font-extrabold leading-tight text-foreground sm:text-5xl md:text-6xl">
              About{" "}
              <span className="text-gradient-primary">VayuCast</span>
            </h1>
            <p className="max-w-lg text-base text-muted-foreground md:text-lg">
              VayuCast is a final-year engineering project born from a simple
              belief: every citizen deserves to know the quality of the air they
              breathe — in real time, for free.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/dashboard">
                <Button size="lg" className="rounded-xl">
                  Explore the Map
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="rounded-xl">
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>

          {/* Mission card */}
          <div
            className="animate-fade-in rounded-2xl p-6 shadow-card md:p-8"
            style={{
              background:
                "linear-gradient(135deg, hsl(130 50% 32% / 0.08), hsl(142 70% 45% / 0.05))",
              border: "1px solid hsl(130 50% 32% / 0.2)",
              animationDelay: "0.2s",
            }}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Our Mission
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              To democratize access to environmental intelligence by combining
              real-time sensor data, machine learning forecasts, and intuitive
              visualizations — empowering individuals, researchers, and
              policymakers to make informed decisions for a healthier India.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Real-time AQI", "ML Predictions", "Pollution Spread", "Exposure Risk"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                  >
                    {tag}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="container -mt-8 relative z-10 pb-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="animate-fade-in flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent">
                <s.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-display text-2xl font-extrabold text-foreground">
                  {s.value}
                </p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Values ── */}
      <section className="container py-16 md:py-20">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            What We Stand For
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The principles that guide every decision at VayuCast.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((v, i) => (
            <div
              key={v.title}
              className="animate-fade-in rounded-2xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-card-hover"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${v.bg}`}
              >
                <v.icon className={`h-5 w-5 ${v.color}`} />
              </div>
              <h3 className="font-display text-base font-semibold text-foreground">
                {v.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {v.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Timeline ── */}
      <section className="bg-hero-gradient py-14 md:py-20">
        <div className="container">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              Our Journey
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              From a college idea to a production-ready platform.
            </p>
          </div>

          <div className="relative mx-auto mt-12 max-w-3xl">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 h-full w-0.5 bg-border md:left-1/2 md:-ml-px" />

            <div className="space-y-10">
              {timeline.map((item, i) => (
                <div
                  key={i}
                  className={`relative flex gap-6 md:gap-0 ${
                    i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  {/* Dot */}
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-card shadow-card md:absolute md:left-1/2 md:-ml-6 md:top-0">
                    <span className="font-display text-xs font-bold text-primary">
                      {item.year.slice(2)}
                    </span>
                  </div>

                  {/* Card */}
                  <div
                    className={`w-full rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover md:w-[calc(50%-2.5rem)] ${
                      i % 2 === 0 ? "md:mr-auto md:pr-8" : "md:ml-auto md:pl-8"
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      {item.year}
                    </span>
                    <h3 className="font-display mt-1 text-base font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className="container py-16 md:py-20">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            Meet the Team
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The engineers and researchers building VayuCast.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member, i) => (
            <div
              key={member.name}
              className="animate-fade-in group flex flex-col items-center rounded-2xl border border-border bg-card p-7 text-center shadow-card transition-shadow hover:shadow-card-hover"
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              {/* Avatar */}
              <div
                className={`flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${member.color} text-2xl font-extrabold text-white shadow-lg`}
              >
                {member.initials}
              </div>
              <h3 className="font-display mt-4 text-lg font-semibold text-foreground">
                {member.name}
              </h3>
              <span className="mt-1 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-primary">
                {member.role}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {member.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-14 md:py-20">
        <div className="container">
          <div
            className="relative overflow-hidden rounded-3xl px-8 py-14 text-center md:px-16"
            style={{
              background:
                "linear-gradient(135deg, hsl(130 50% 32%), hsl(142 70% 38%))",
            }}
          >
            {/* Blobs */}
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20"
              style={{
                background: "radial-gradient(circle, white, transparent 70%)",
              }}
            />
            <div
              className="pointer-events-none absolute -bottom-12 -left-12 h-44 w-44 rounded-full opacity-15"
              style={{
                background: "radial-gradient(circle, white, transparent 70%)",
              }}
            />

            <h2 className="font-display relative text-2xl font-extrabold text-white md:text-4xl">
              Ready to breathe smarter?
            </h2>
            <p className="relative mx-auto mt-3 max-w-md text-sm text-white/80 md:text-base">
              Explore real-time AQI data, 24-hour forecasts, and pollution
              spread maps for your city — completely free.
            </p>
            <div className="relative mt-7 flex flex-wrap justify-center gap-3">
              <Link to="/dashboard">
                <Button
                  size="lg"
                  className="rounded-xl bg-white font-bold text-primary hover:bg-white/90"
                  id="cta-explore-map"
                >
                  Explore the Map
                </Button>
              </Link>
              <Link to="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-xl border-white/40 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                  id="cta-contact"
                >
                  Get in Touch
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card py-6 md:py-8">
        <div className="container flex flex-col items-center gap-3 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <img src={vayucastLogo} alt="VayuCAST" className="h-8 sm:h-9 md:h-10" />
          <p>© 2026 VayuCast. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default AboutUs;
