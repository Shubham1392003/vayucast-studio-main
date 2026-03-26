import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  Clock,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import vayucastLogo from "@/assets/vayucast-logo.png";

const contactInfo = [
  {
    icon: Mail,
    label: "Email Us",
    value: "support@vayucast.in",
    sub: "We reply within 24 hours",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Phone,
    label: "Call Us",
    value: "+91 98765 43210",
    sub: "Mon – Sat, 9 AM – 6 PM IST",
    color: "text-sky-600",
    bg: "bg-sky-50",
  },
  {
    icon: MapPin,
    label: "Visit Us",
    value: "Pune, Maharashtra, India",
    sub: "Head office location",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    icon: Clock,
    label: "Working Hours",
    value: "Mon – Sat: 9 AM – 6 PM",
    sub: "Sunday closed",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
];

const faqs = [
  {
    q: "How accurate are VayuCast AQI predictions?",
    a: "Our ML models are trained on historical CPCB data and achieve >90% accuracy for 24-hour forecasts.",
  },
  {
    q: "Is VayuCast data freely available?",
    a: "Yes! Real-time monitoring and basic forecasts are free for all users. Advanced analytics require a registered account.",
  },
  {
    q: "Which cities are currently supported?",
    a: "We currently cover 15+ major Indian cities with live sensor feeds and are expanding quarterly.",
  },
];

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

const ContactUs = () => {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setTimeout(() => {
      setStatus("sent");
      setForm({ name: "", email: "", subject: "", message: "" });
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero Banner ── */}
      <section className="relative overflow-hidden bg-hero-gradient py-20 md:py-28">
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, hsl(130 50% 55% / 0.35), transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, hsl(142 70% 45% / 0.3), transparent 70%)",
          }}
        />

        <div className="container relative text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            <MessageSquare className="h-4 w-4" />
            We'd love to hear from you
          </span>
          <h1 className="font-display mt-4 text-4xl font-extrabold leading-tight text-foreground sm:text-5xl md:text-6xl">
            Get in <span className="text-gradient-primary">Touch</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Have a question about air quality in your city, want to collaborate,
            or just say hello? Drop us a message — we respond fast.
          </p>
        </div>
      </section>

      {/* ── Info Cards ── */}
      <section className="container -mt-10 relative z-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {contactInfo.map((item, i) => (
            <div
              key={item.label}
              className="animate-fade-in flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.bg}`}
              >
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-0.5 font-display font-semibold text-foreground">
                  {item.value}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Main Content: Form + Map ── */}
      <section className="container py-16 md:py-20">
        <div className="grid gap-10 lg:grid-cols-5 lg:gap-14">
          {/* Contact Form */}
          <div className="lg:col-span-3">
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              Send us a message
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Fill in the details below and our team will get back to you.
            </p>

            {status === "sent" ? (
              <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 py-16 text-center">
                <CheckCircle className="h-14 w-14 text-emerald-500" />
                <h3 className="font-display text-xl font-bold text-emerald-700">
                  Message Sent!
                </h3>
                <p className="max-w-xs text-sm text-emerald-600">
                  Thanks for reaching out. We'll reply to your email within 24
                  hours.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 border-emerald-400 text-emerald-700 hover:bg-emerald-100"
                  onClick={() => setStatus("idle")}
                >
                  Send another message
                </Button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="mt-8 space-y-5"
                id="contact-form"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="name"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Full Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Aryan Sharma"
                      className="rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none ring-offset-background transition focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="email"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Email Address <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="aryan@example.com"
                      className="rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none ring-offset-background transition focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="subject"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Subject <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    value={form.subject}
                    onChange={handleChange}
                    className="rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none ring-offset-background transition focus:border-primary focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="" disabled>
                      Select a topic…
                    </option>
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Technical Support">Technical Support</option>
                    <option value="Data Partnership">Data Partnership</option>
                    <option value="Research Collaboration">
                      Research Collaboration
                    </option>
                    <option value="Feedback">Feedback</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="message"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Message <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    required
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Tell us how we can help you…"
                    className="resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none ring-offset-background transition focus:border-primary focus:ring-2 focus:ring-ring/30"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={status === "sending"}
                  className="w-full rounded-xl font-semibold"
                  id="submit-contact"
                >
                  {status === "sending" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* Right sidebar: Map placeholder + Social / Quick links */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            {/* Map placeholder */}
            <div className="overflow-hidden rounded-2xl border border-border shadow-card">
              <div className="relative h-52 bg-gradient-to-br from-emerald-50 to-sky-50">
                <iframe
                  title="VayuCast Location – Pune"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d242137.43929748!2d73.72495!3d18.524701!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2bf2e67461101%3A0x828d43bf9d9ee343!2sPune%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                  className="h-full w-full border-none"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <div className="flex items-center gap-3 bg-card px-4 py-3">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Pune, Maharashtra, India – 411001
                </span>
              </div>
            </div>

            {/* Quick social / connect */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h3 className="font-display font-semibold text-foreground">
                Connect with us
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Follow VayuCast for updates on air quality alerts and new
                features.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {[
                  { label: "Twitter / X", href: "#", emoji: "𝕏" },
                  { label: "LinkedIn", href: "#", emoji: "in" },
                  { label: "GitHub", href: "#", emoji: "⌥" },
                  { label: "Instagram", href: "#", emoji: "📷" },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                  >
                    <span className="text-sm">{s.emoji}</span>
                    {s.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Response guarantee badge */}
            <div
              className="flex items-start gap-3 rounded-2xl p-5"
              style={{
                background:
                  "linear-gradient(135deg, hsl(130 50% 32% / 0.08), hsl(142 70% 45% / 0.06))",
                border: "1px solid hsl(130 50% 32% / 0.2)",
              }}
            >
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-display text-sm font-semibold text-foreground">
                  24-Hour Response Guarantee
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Every message is reviewed by our team within one business day.
                  We take every query seriously.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-hero-gradient py-14 md:py-20">
        <div className="container">
          <h2 className="font-display text-center text-2xl font-bold text-foreground md:text-3xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Quick answers to common questions about VayuCast.
          </p>
          <div className="mx-auto mt-10 max-w-2xl space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-card transition-shadow hover:shadow-card-hover"
              >
                <button
                  className="flex w-full items-center justify-between px-5 py-4 text-left font-display text-sm font-semibold text-foreground"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  id={`faq-${i}`}
                >
                  {faq.q}
                  <span
                    className={`ml-3 shrink-0 text-primary text-lg transition-transform ${openFaq === i ? "rotate-45" : ""}`}
                  >
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <div className="border-t border-border bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
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

export default ContactUs;
