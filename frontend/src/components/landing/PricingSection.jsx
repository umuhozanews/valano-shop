import { Check, Monitor } from "lucide-react";
import { Link } from "react-router-dom";
import { MotionReveal } from "./MotionReveal";

const starterFeatures = [
  "Sales tracking",
  "Procurement management",
  "Debt tracking",
  "Delivery management",
  "Expense & bills recording",
  "Workers & invoices",
];

const proFeatures = [
  "Everything in Starter",
  "EBM integration (tax machine)",
  "Automated invoice generation",
  "Real-time financial reports",
  "Multi-user access",
  "Priority support",
];

const teamFeatures = [
  "Daily system monitoring",
  "Bug fixes & updates",
  "Data backup & security",
  "Performance optimization",
  "Dedicated support agent",
  "Monthly usage report",
];

function FeatureItem({ label }) {
  return (
    <li className="flex items-center gap-2.5 text-sm" style={{ color: "#1a1a2e" }}>
      <span
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: "#1a1a2e" }}
      >
        <Check size={11} color="white" strokeWidth={3} />
      </span>
      {label}
    </li>
  );
}

export function PricingSection() {
  return (
    <section
      className="w-full px-6 py-16 sm:px-12 lg:px-16"
      style={{ backgroundColor: "#ebebf0", fontFamily: "Inter, sans-serif" }}
    >
      <MotionReveal className="reveal-up flex justify-center">
        <span
          className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium"
          style={{ borderColor: "#d0d0da", backgroundColor: "#f5f5fa", color: "#1a1a2e" }}
        >
          <span className="text-base">🌐</span> Our Pricing Plan
        </span>
      </MotionReveal>

      <MotionReveal className="reveal-up">
        <h2
          className="mt-4 text-center font-extrabold tracking-tight"
          style={{ fontFamily: "Manrope, sans-serif", fontSize: "clamp(2rem, 5vw, 3.25rem)", color: "#0f0f1a" }}
        >
          Simple, transparent pricing
        </h2>
      </MotionReveal>

      <MotionReveal className="stagger-children mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-3">
        {/* Starter */}
        <div
          className="hover-lift flex flex-col rounded-2xl p-7"
          style={{ backgroundColor: "#f9f9fb", border: "1px solid #e2e2ea" }}
        >
          <div>
            <h3 className="text-lg font-bold" style={{ color: "#0f0f1a", fontFamily: "Manrope, sans-serif" }}>
              Basic Plan
            </h3>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "#6b6b80" }}>
              Full access to KNOTY system. Manage your business operations with ease and full control.
            </p>
            <p
              className="mt-4 text-2xl font-extrabold"
              style={{ fontFamily: "Manrope, sans-serif", color: "#0f0f1a" }}
            >
              30,000 RWF
            </p>
          </div>

          <Link
            to="/app/login"
            className="mt-5 flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition hover:bg-[#0f0f1a] hover:text-white"
            style={{ borderColor: "#c8c8d4", backgroundColor: "#f0f0f5", color: "#0f0f1a" }}
          >
            <Monitor size={15} />
            Get Basic Plan
          </Link>

          <div className="mt-7">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#9090a8" }}>
              Get Started With
            </p>
            <ul className="space-y-3">
              {starterFeatures.map((f) => (
                <FeatureItem key={f} label={f} />
              ))}
            </ul>
          </div>
        </div>

        {/* Pro Plan */}
        <div
          className="hover-lift flex flex-col rounded-2xl p-7"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e2e2ea",
            boxShadow: "0 8px 40px 0 rgba(0,0,0,0.12)",
          }}
        >
          <div>
            <h3 className="text-xl font-bold" style={{ color: "#0f0f1a", fontFamily: "Manrope, sans-serif" }}>
              Extended Plan
            </h3>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "#6b6b80" }}>
              KNOTY connected with EBM (tax machine). Best for companies requiring full fiscal compliance.
            </p>
            <div className="mt-4 flex items-baseline gap-1">
              <span
                className="text-3xl font-extrabold"
                style={{ fontFamily: "Manrope, sans-serif", color: "#0f0f1a" }}
              >
                60,000 RWF
              </span>
              <span className="text-xs font-medium" style={{ color: "#9090a8" }}>/Month</span>
            </div>
          </div>

          <Link
            to="/app/login"
            className="mt-5 flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-80"
            style={{ backgroundColor: "#0f0f1a" }}
          >
            Get Extended Plan
          </Link>

          <div className="mt-7">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#9090a8" }}>
              Everything In Starter
            </p>
            <ul className="space-y-3">
              {proFeatures.map((f) => (
                <FeatureItem key={f} label={f} />
              ))}
            </ul>
          </div>
        </div>

        {/* Team Plan */}
        <div
          className="hover-lift flex flex-col rounded-2xl p-7"
          style={{ backgroundColor: "#f9f9fb", border: "1px solid #e2e2ea" }}
        >
          <div>
            <h3 className="text-lg font-bold" style={{ color: "#0f0f1a", fontFamily: "Manrope, sans-serif" }}>
              Daily Maintenance
            </h3>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "#6b6b80" }}>
              Keep your KNOTY system running smoothly with our daily monitoring and maintenance service.
            </p>
            <div className="mt-4 flex items-baseline gap-1">
              <span
                className="text-3xl font-extrabold"
                style={{ fontFamily: "Manrope, sans-serif", color: "#0f0f1a" }}
              >
                10,000 RWF
              </span>
              <span className="text-xs font-medium" style={{ color: "#9090a8" }}>/Month</span>
            </div>
          </div>

          <Link
            to="/app/login"
            className="mt-5 flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition hover:bg-[#0f0f1a] hover:text-white"
            style={{ borderColor: "#c8c8d4", backgroundColor: "#f0f0f5", color: "#0f0f1a" }}
          >
            Get Started <span aria-hidden>→</span>
          </Link>

          <div className="mt-7">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#9090a8" }}>
              Includes Per Month
            </p>
            <ul className="space-y-3">
              {teamFeatures.map((f) => (
                <FeatureItem key={f} label={f} />
              ))}
            </ul>
          </div>
        </div>
      </MotionReveal>
    </section>
  );
}
