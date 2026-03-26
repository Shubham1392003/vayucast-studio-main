import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Leaf,
  Car,
  Factory,
  Home,
  TreePine,
  Recycle,
  Wind,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Bike,
  Zap,
  Droplets,
  ShieldCheck,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import vayucastLogo from "@/assets/vayucast-logo.png";

/* ── Data ─────────────────────────────────────────────────── */

const aqiLevels = [
  {
    range: "0 – 50",
    label: "Good",
    color: "bg-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    advice: "Air quality is satisfactory. Enjoy outdoor activities freely.",
    actions: ["Open windows for fresh air", "Walk or cycle outside", "No special precautions needed"],
  },
  {
    range: "51 – 100",
    label: "Satisfactory",
    color: "bg-lime-400",
    text: "text-lime-700",
    bg: "bg-lime-50",
    border: "border-lime-200",
    advice: "Acceptable air quality. Sensitive individuals may feel mild effects.",
    actions: ["Limit prolonged outdoor exertion if sensitive", "Keep windows open", "Stay hydrated"],
  },
  {
    range: "101 – 200",
    label: "Moderate",
    color: "bg-yellow-400",
    text: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    advice: "Sensitive groups (elderly, children, asthma) should reduce outdoor activity.",
    actions: ["Wear N95 mask if outdoors > 2 hrs", "Reduce morning outdoor exercise", "Use air purifier indoors"],
  },
  {
    range: "201 – 300",
    label: "Poor",
    color: "bg-orange-500",
    text: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    advice: "Health effects possible for everyone. Limit outdoor exposure.",
    actions: ["Wear N95/KN95 mask outdoors", "Keep windows closed", "Avoid burning garbage or biomass"],
  },
  {
    range: "301 – 400",
    label: "Very Poor",
    color: "bg-red-500",
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    advice: "Serious health effects. Avoid unnecessary outdoor exposure.",
    actions: ["Stay indoors as much as possible", "Use HEPA air purifier", "See a doctor if experiencing symptoms"],
  },
  {
    range: "401 – 500",
    label: "Severe",
    color: "bg-purple-700",
    text: "text-purple-800",
    bg: "bg-purple-50",
    border: "border-purple-200",
    advice: "Emergency conditions. All activities should be moved indoors.",
    actions: ["Do NOT go outdoors", "Seal window gaps with damp cloth", "Call emergency services if breathless"],
  },
];

const categories = [
  {
    icon: Car,
    label: "Transport",
    color: "text-sky-600",
    bg: "bg-sky-50",
    tips: [
      "Carpool or use public transport at least 3 days a week",
      "Switch to CNG, EV or hybrid vehicles",
      "Avoid idling the engine for more than 30 seconds",
      "Walk or cycle for distances under 2 km",
      "Service your vehicle regularly — faulty engines emit 3× more pollutants",
    ],
  },
  {
    icon: Home,
    label: "At Home",
    color: "text-amber-600",
    bg: "bg-amber-50",
    tips: [
      "Switch to LPG / induction from wood or coal-burning stoves",
      "Never burn leaves, trash or plastic in the open",
      "Use natural paints and adhesives with low VOC content",
      "Install exhaust fans in kitchens and bathrooms",
      "Grow air-purifying indoor plants: Peace Lily, Spider Plant, Aloe Vera",
    ],
  },
  {
    icon: Factory,
    label: "Industry & Govt.",
    color: "text-violet-600",
    bg: "bg-violet-50",
    tips: [
      "Demand compliance with CPCB emission norms from local industries",
      "Support anti-stubble burning campaigns and alternatives",
      "Advocate for green public procurement policies",
      "Report illegal waste burning to your local authority",
      "Support investment in metro rail, BRT and cycle tracks",
    ],
  },
  {
    icon: TreePine,
    label: "Green Spaces",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    tips: [
      "Plant at least one tree every year — native species preferred",
      "Create rooftop or balcony gardens to absorb CO₂",
      "Participate in city plantation drives",
      "Avoid cutting trees; report illegal felling",
      "Create green corridors along roads to act as dust barriers",
    ],
  },
  {
    icon: Recycle,
    label: "Waste & Energy",
    color: "text-teal-600",
    bg: "bg-teal-50",
    tips: [
      "Segregate waste at source: wet, dry, hazardous",
      "Compost kitchen waste instead of landfilling",
      "Install rooftop solar panels to reduce dependency on coal power",
      "Choose energy-efficient appliances (BEE 5-star rated)",
      "Reduce single-use plastic — production releases toxic pollutants",
    ],
  },
  {
    icon: Wind,
    label: "Community Action",
    color: "text-rose-500",
    bg: "bg-rose-50",
    tips: [
      "Organise awareness drives in schools and RWAs",
      "Share AQI data from VayuCast on social media daily",
      "Petition local bodies to publish real-time pollution data",
      "Participate in Odd-Even driving schemes during pollution emergencies",
      "Build community air-quality alert WhatsApp / Telegram groups",
    ],
  },
];

const checklistItems = [
  "I use public transport or carpool at least twice a week",
  "I do NOT burn garbage, leaves or crop residue",
  "I own or plan to buy an electric / CNG vehicle",
  "I have at least one air-purifying plant at home",
  "I check AQI before stepping outdoors",
  "I wear an N95 mask when AQI > 150",
  "I segregate household waste before disposal",
  "I have reported pollution violations in my area",
];

const resources = [
  { title: "CPCB National AQI Dashboard", url: "https://cpcb.nic.in/", icon: BookOpen },
  { title: "MoEFCC Air Quality Guidelines", url: "https://moef.gov.in/", icon: ShieldCheck },
  { title: "WHO Air Quality Database", url: "https://www.who.int/data/gho/data/themes/air-pollution", icon: BookOpen },
  { title: "SAFAR India AQI Forecast", url: "https://safar.tropmet.res.in/", icon: Wind },
];

/* ── Component ────────────────────────────────────────────── */

const PollutionPrevention = () => {
  const [openCategory, setOpenCategory] = useState<number | null>(0);
  const [checked, setChecked] = useState<boolean[]>(Array(checklistItems.length).fill(false));
  const [activeAqi, setActiveAqi] = useState<number>(0);

  const checkedCount = checked.filter(Boolean).length;

  const toggle = (i: number) => {
    const next = [...checked];
    next[i] = !next[i];
    setChecked(next);
  };

  const scoreLabel =
    checkedCount >= 7
      ? "🌟 Eco Champion!"
      : checkedCount >= 5
      ? "🌿 Green Citizen"
      : checkedCount >= 3
      ? "🌱 Getting There"
      : "💡 Just Getting Started";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-hero-gradient py-20 md:py-28">
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, hsl(130 50% 55% / 0.4), transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(142 70% 45% / 0.35), transparent 70%)" }}
        />

        <div className="container relative text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            <Leaf className="h-4 w-4" />
            Act Now. Breathe Better.
          </span>
          <h1 className="font-display mt-4 text-4xl font-extrabold leading-tight text-foreground sm:text-5xl md:text-6xl">
            Pollution{" "}
            <span className="text-gradient-primary">Prevention</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            Air pollution is responsible for over{" "}
            <span className="font-semibold text-foreground">1.67 million deaths</span> in India every year.
            The good news? Up to 80% of outdoor air pollution is preventable through individual and
            collective action.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a href="#tips">
              <Button size="lg" className="rounded-xl" id="hero-see-tips">
                See Prevention Tips
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <a href="#checklist">
              <Button size="lg" variant="outline" className="rounded-xl" id="hero-checklist">
                Take the Pledge Checklist
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ── AQI Action Guide ── */}
      <section className="container py-16 md:py-20" id="aqi-guide">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            AQI Action Guide
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Know what to do at every air quality level. Click a level to see recommended actions.
          </p>
        </div>

        {/* AQI level tabs */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {aqiLevels.map((lvl, i) => (
            <button
              key={lvl.label}
              id={`aqi-tab-${lvl.label.toLowerCase().replace(" ", "-")}`}
              onClick={() => setActiveAqi(i)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                activeAqi === i
                  ? `${lvl.bg} ${lvl.border} ${lvl.text} shadow-card`
                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${lvl.color}`} />
              {lvl.label}
            </button>
          ))}
        </div>

        {/* Active AQI card */}
        {(() => {
          const lvl = aqiLevels[activeAqi];
          return (
            <div
              className={`mx-auto mt-6 max-w-2xl rounded-2xl border p-6 shadow-card transition-all ${lvl.bg} ${lvl.border}`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className={`h-4 w-4 rounded-full ${lvl.color} shrink-0`} />
                <span className={`font-display text-lg font-bold ${lvl.text}`}>
                  AQI {lvl.range} — {lvl.label}
                </span>
              </div>
              <p className={`mt-3 text-sm ${lvl.text}`}>{lvl.advice}</p>
              <ul className="mt-4 space-y-2">
                {lvl.actions.map((a) => (
                  <li key={a} className="flex items-start gap-2 text-sm text-foreground/80">
                    <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${lvl.text}`} />
                    {a}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <Link to="/dashboard">
                  <Button size="sm" className="rounded-lg" id={`aqi-check-map-${activeAqi}`}>
                    Check Live AQI on Map
                  </Button>
                </Link>
              </div>
            </div>
          );
        })()}
      </section>

      {/* ── Prevention Tips by Category ── */}
      <section className="bg-hero-gradient py-14 md:py-20" id="tips">
        <div className="container">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              Prevention Tips by Category
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Practical steps you can take in every area of life.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-2xl space-y-3">
            {categories.map((cat, i) => (
              <div
                key={cat.label}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
              >
                <button
                  className="flex w-full items-center justify-between px-5 py-4"
                  onClick={() => setOpenCategory(openCategory === i ? null : i)}
                  id={`category-${cat.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${cat.bg}`}>
                      <cat.icon className={`h-5 w-5 ${cat.color}`} />
                    </div>
                    <span className="font-display font-semibold text-foreground">{cat.label}</span>
                  </div>
                  {openCategory === i ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {openCategory === i && (
                  <div className="border-t border-border bg-muted/20 px-5 pb-5 pt-4">
                    <ul className="space-y-3">
                      {cat.tips.map((tip, j) => (
                        <li key={j} className="flex items-start gap-3 text-sm text-muted-foreground">
                          <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${cat.color}`} />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Did You Know ── */}
      <section className="container py-14 md:py-20">
        <h2 className="font-display text-center text-2xl font-bold text-foreground md:text-3xl">
          Did You Know?
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Car, stat: "28%", desc: "of India's PM2.5 pollution comes from vehicle exhaust", color: "text-sky-600", bg: "bg-sky-50" },
            { icon: Factory, stat: "51%", desc: "of Delhi's winter smog is caused by stubble and waste burning", color: "text-orange-600", bg: "bg-orange-50" },
            { icon: Bike, stat: "67%", desc: "reduction in emissions if 1 in 8 car trips switch to cycling", color: "text-emerald-600", bg: "bg-emerald-50" },
            { icon: Zap, stat: "₹1.8L Cr", desc: "economic loss India suffers annually due to air pollution health costs", color: "text-violet-600", bg: "bg-violet-50" },
          ].map((f, i) => (
            <div
              key={f.stat}
              className="animate-fade-in rounded-2xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-card-hover"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${f.bg}`}>
                <f.icon className={`h-5 w-5 ${f.color}`} />
              </div>
              <p className={`font-display text-3xl font-extrabold ${f.color}`}>{f.stat}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pledge Checklist ── */}
      <section className="bg-hero-gradient py-14 md:py-20" id="checklist">
        <div className="container">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              The Clean Air Pledge Checklist
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Check off the actions you already take. See where you stand!
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-xl">
            <div className="rounded-2xl border border-border bg-card shadow-card">
              {/* Progress bar */}
              <div className="border-b border-border px-6 py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground">
                    {checkedCount} / {checklistItems.length} completed
                  </span>
                  <span className="font-bold text-primary">{scoreLabel}</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500"
                    style={{ width: `${(checkedCount / checklistItems.length) * 100}%` }}
                  />
                </div>
              </div>

              <ul className="divide-y divide-border">
                {checklistItems.map((item, i) => (
                  <li key={i}>
                    <label
                      className="flex cursor-pointer items-start gap-3 px-6 py-4 transition-colors hover:bg-muted/30"
                      htmlFor={`pledge-${i}`}
                    >
                      <input
                        id={`pledge-${i}`}
                        type="checkbox"
                        checked={checked[i]}
                        onChange={() => toggle(i)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                      />
                      <span
                        className={`text-sm transition-colors ${
                          checked[i] ? "text-primary line-through opacity-60" : "text-foreground"
                        }`}
                      >
                        {item}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>

              <div className="border-t border-border px-6 py-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Share your score on social media and inspire others to take the{" "}
                  <span className="font-semibold text-primary">#CleanAirPledge</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Outdoor Protection Tips ── */}
      <section className="container py-14 md:py-20">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              Protect Yourself Outdoors
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              When outdoor pollution levels are elevated, protecting yourself is just as
              important as reducing emissions. Here are the essentials:
            </p>
            <ul className="mt-5 space-y-3">
              {[
                { icon: ShieldCheck, tip: "Wear an N95 or KN95 mask — not a cloth mask — when AQI exceeds 150.", color: "text-primary" },
                { icon: Droplets, tip: "Stay hydrated to help your body flush inhaled particulates faster.", color: "text-sky-500" },
                { icon: AlertTriangle, tip: "Avoid exercising outdoors in the morning hours (6–9 AM) when PM2.5 peaks.", color: "text-amber-500" },
                { icon: Zap, tip: "Use the VayuCast 24-hour forecast to plan outdoor activities in advance.", color: "text-violet-500" },
                { icon: Bike, tip: "Run errands by foot or cycle only when AQI is below 100 (Good / Satisfactory).", color: "text-emerald-500" },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent">
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  {item.tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Quick stats card */}
          <div
            className="rounded-3xl p-6 md:p-8"
            style={{
              background: "linear-gradient(135deg, hsl(130 50% 32%), hsl(142 70% 38%))",
            }}
          >
            <h3 className="font-display text-xl font-bold text-white">
              India's Air Quality Reality
            </h3>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {[
                { val: "1.67M", label: "Deaths/year from air pollution" },
                { val: "22", label: "of world's 30 most polluted cities are in India" },
                { val: "40%", label: "of Indians breathe air 5× above WHO limits" },
                { val: "7 yrs", label: "Life expectancy lost in high-pollution zones" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm"
                >
                  <p className="font-display text-2xl font-extrabold text-white">{s.val}</p>
                  <p className="mt-1 text-xs leading-snug text-white/75">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── External Resources ── */}
      <section className="bg-hero-gradient py-12 md:py-16">
        <div className="container">
          <h2 className="font-display text-center text-xl font-bold text-foreground md:text-2xl">
            Official Resources & References
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {resources.map((r) => (
              <a
                key={r.title}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:border-primary/40 hover:shadow-card-hover"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent">
                  <r.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.title}</p>
                  <p className="mt-0.5 text-xs text-primary">Visit →</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="container py-14 md:py-20">
        <div
          className="relative overflow-hidden rounded-3xl px-8 py-14 text-center md:px-16"
          style={{ background: "linear-gradient(135deg, hsl(130 50% 32%), hsl(142 70% 38%))" }}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, white, transparent 70%)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-12 -left-12 h-44 w-44 rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, white, transparent 70%)" }}
          />
          <h2 className="font-display relative text-2xl font-extrabold text-white md:text-4xl">
            Start by knowing your air quality
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-sm text-white/80 md:text-base">
            Use VayuCast's live AQI map and 24-hour forecasts to make smarter everyday choices
            — from when to go for a run to when to keep your kids indoors.
          </p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/dashboard">
              <Button
                size="lg"
                className="rounded-xl bg-white font-bold text-primary hover:bg-white/90"
                id="cta-open-map"
              >
                Open Live Map
              </Button>
            </Link>
            <Link to="/contact">
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl border-white/40 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                id="cta-contact-prevention"
              >
                Partner With Us
              </Button>
            </Link>
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

export default PollutionPrevention;
