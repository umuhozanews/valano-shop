import { Link } from "react-router-dom";
import { Users, Handshake, ChevronDown } from "lucide-react";
import bizcoreLogo from "../assets/bizcore-logo.png";
import heroImg from "../assets/bizcore-hero.png";
import { PricingSection } from "../components/landing/PricingSection";
import { HowItWorksSection } from "../components/landing/HowItWorksSection";
import { TmusicFooter } from "../components/landing/TmusicFooter";
import { SponsorsMarquee } from "../components/landing/SponsorsMarquee";
import { CustomersReview } from "../components/landing/CustomersReview";
import { MotionReveal } from "../components/landing/MotionReveal";

const navLinks = ["Home", "About Us", "Features", "Pricing", "Contact"];
const filters = [
  { label: "Module", value: "Sales" },
  { label: "Module", value: "Procurement" },
  { label: "Module", value: "Expenses" },
  { label: "Module", value: "Deliveries" },
  { label: "Plan", value: "30k RWF" },
];

export default function Landing() {
  return (
    <div className="min-h-screen p-2 sm:p-3 motion-gradient-bg">
      <div
        className="relative min-h-[calc(100vh-1rem)] overflow-hidden rounded-lg px-6 py-6 sm:px-12 sm:py-8 lg:px-16"
        style={{ backgroundColor: "#eaf4ff", fontFamily: "Inter, sans-serif" }}
      >
        {/* Nav */}
        <header className="flex items-center justify-between reveal-up active">
          <div
            className="flex items-center px-4 py-2 rounded-2xl"
            style={{ backgroundColor: "#1a1a1a" }}
          >
            <img
              src={bizcoreLogo}
              alt="BizCore Solutions"
              className="h-20 w-auto object-contain"
            />
          </div>

          <nav className="hidden items-center gap-6 text-sm font-medium md:flex" style={{ color: "#0b1c30" }}>
            {navLinks.map((l, i) => (
              <span key={l} className="flex items-center gap-6">
                <a href="#" className="hover:opacity-70 transition-opacity">{l}</a>
                {i < navLinks.length - 1 && <span className="opacity-40">/</span>}
              </span>
            ))}
          </nav>

          <Link
            to="/app/login"
            className="rounded-full border px-5 py-2 text-sm font-semibold transition hover:bg-[#0b1c30] hover:text-white"
            style={{ borderColor: "#0b1c30", color: "#0b1c30" }}
          >
            Staff Login
          </Link>
        </header>

        {/* Hero */}
        <main className="relative mt-10 grid grid-cols-1 gap-8 lg:mt-6 lg:grid-cols-2 lg:gap-4">
          <div className="relative z-10">
            <MotionReveal
              as="h1"
              className="split-reveal font-extrabold leading-[1.05] tracking-tight active"
              style={{ fontFamily: "Manrope, sans-serif", fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
              activeOnMount
            >
              <span className="word" style={{ color: "#7a9a9c" }}>Manage Your</span>
              <br />
              <span className="word" style={{ color: "#0b1c30" }}>Business</span>
              <br />
              <span className="word" style={{ color: "#0b1c30" }}>with KNOTY</span>
            </MotionReveal>

            <MotionReveal className="reveal-up active" activeOnMount>
              <p className="mt-6 max-w-md text-sm leading-relaxed" style={{ color: "#0b1c30" }}>
                KNOTY is a complete business management system — track sales, procurement, debts, deliveries, expenses, bills, workers and invoices all in one place.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/app/login"
                  className="rounded-full px-7 py-3 text-sm font-semibold hover:bg-[#b0c0c8] transition-colors"
                  style={{ backgroundColor: "#c5d6dd", color: "#0b1c30" }}
                >
                  See Features
                </Link>
                <Link
                  to="/app/login"
                  className="rounded-full px-7 py-3 text-sm font-semibold text-white hover:bg-opacity-90 transition-opacity"
                  style={{ backgroundColor: "#0b1c30" }}
                >
                  Get Started
                </Link>
              </div>

              <div className="mt-10 flex items-center gap-12">
                <Stat icon={<Users size={28} />} value="300+" label="Trusted Users" />
                <Stat icon={<Handshake size={28} />} value="9" label="Partners" />
              </div>
            </MotionReveal>
          </div>

          <MotionReveal className="reveal-up flex items-center justify-center active" activeOnMount>
            <img
              src={heroImg}
              alt="KNOTY Business Management"
              className="w-full max-w-[520px] h-auto object-contain rounded-3xl opacity-85"
            />
          </MotionReveal>
        </main>

        {/* Filter bar */}
        <div className="relative z-10 mt-10 lg:mt-16">
          <MotionReveal className="stagger-children grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:items-end active" activeOnMount>
            {filters.map((f) => (
              <div key={f.value}>
                <div className="mb-2 text-sm font-medium" style={{ color: "#0b1c30" }}>{f.label}</div>
                <button
                  className="flex w-full items-center justify-between rounded-full border bg-white px-4 py-2.5 text-sm"
                  style={{ borderColor: "#0b1c30", color: "#0b1c30" }}
                >
                  {f.value}
                  <ChevronDown size={16} />
                </button>
              </div>
            ))}
            <Link
              to="/app/login"
              className="rounded-full px-7 py-2.5 text-sm font-semibold text-center hover:bg-[#b0c0c8] transition-colors"
              style={{ backgroundColor: "#c5d6dd", color: "#0b1c30" }}
            >
              Explore
            </Link>
          </MotionReveal>
        </div>
      </div>
      <PricingSection />
      <HowItWorksSection />
      <CustomersReview />
      <SponsorsMarquee />
      <TmusicFooter />
    </div>
  );
}

function Stat({ icon, value, label }) {
  return (
    <div className="flex items-center gap-3" style={{ color: "#0b1c30" }}>
      {icon}
      <div>
        <div className="text-2xl font-bold leading-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
          {value}
        </div>
        <div className="text-xs">{label}</div>
      </div>
    </div>
  );
}
