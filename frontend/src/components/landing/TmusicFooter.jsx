import { useState } from "react";
import { Link } from "react-router-dom";
import { MotionReveal } from "./MotionReveal";

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}

function TmusicLogo() {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: "#d44d0f" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      </div>
      <span className="text-lg font-bold tracking-tight" style={{ color: "#1a1a1a", fontFamily: "Manrope, sans-serif" }}>
        KNOTY
      </span>
    </div>
  );
}

const company = ["Home", "About Us", "Pricing", "How It Works", "Contact"];
const product = ["Sales", "Procurement", "Expenses", "Invoices", "Deliveries"];
const socials = [<FacebookIcon />, <LinkedInIcon />, <InstagramIcon />, <TwitterIcon />];

export function TmusicFooter() {
  const [email, setEmail] = useState("");

  return (
    <div style={{ backgroundColor: "#f2f2f2", fontFamily: "Inter, sans-serif" }}>
      {/* CTA Banner */}
      <div className="px-6 pt-12 pb-0 sm:px-12 lg:px-16">
        <div
          className="relative w-full overflow-hidden rounded-2xl px-8 py-16 text-center"
          style={{
            background:
              "radial-gradient(ellipse at 30% 50%, #e8600a 0%, #c44208 40%, #9e2f02 75%, #7a1e00 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "conic-gradient(from 200deg at 70% 60%, transparent 0deg, rgba(255,120,30,0.25) 60deg, transparent 120deg, rgba(200,60,0,0.2) 200deg, transparent 280deg)",
              mixBlendMode: "overlay",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 80% 30%, rgba(255,140,60,0.35) 0%, transparent 60%)",
              mixBlendMode: "overlay",
            }}
          />

          <MotionReveal className="reveal-up relative z-10">
            <h2
              className="mx-auto max-w-2xl font-extrabold leading-tight text-white"
              style={{ fontFamily: "Manrope, sans-serif", fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
            >
              Let KNOTY take the busywork out of running your business
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.82)" }}>
              From tracking sales to managing invoices and workers — automate the tasks you shouldn't be doing manually.
            </p>
            <Link
              to="/app/login"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold transition hover:bg-gray-100"
              style={{ color: "#1a1a1a" }}
            >
              Get Started <span>→</span>
            </Link>
          </MotionReveal>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 pt-12 pb-10 sm:px-12 lg:px-16" style={{ backgroundColor: "#fff", marginTop: 48 }}>
        <MotionReveal className="stagger-children mx-auto max-w-6xl grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="flex flex-col gap-4">
            <TmusicLogo />
            <p className="text-sm leading-relaxed" style={{ color: "#555", maxWidth: 200 }}>
              Business management system helping companies track sales, procurement, debts, deliveries, expenses and invoices.
            </p>
            <div className="flex items-center gap-4 mt-1" style={{ color: "#666" }}>
              {socials.map((icon, i) => (
                <a key={i} href="#" className="hover:opacity-60 transition-opacity">
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Company column */}
          <div>
            <h4 className="mb-4 text-sm font-bold" style={{ color: "#1a1a1a" }}>Company</h4>
            <ul className="space-y-2.5">
              {company.map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm hover:opacity-60 transition-opacity" style={{ color: "#555" }}>
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Product column */}
          <div>
            <h4 className="mb-4 text-sm font-bold" style={{ color: "#1a1a1a" }}>Product</h4>
            <ul className="space-y-2.5">
              {product.map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm hover:opacity-60 transition-opacity" style={{ color: "#555" }}>
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter column */}
          <div>
            <h4 className="mb-4 text-sm font-bold" style={{ color: "#1a1a1a" }}>Contact Us</h4>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "#555" }}>
              📧 axelkarambiz@gmail.com<br />
              📞 0798 989 741<br />
              📍 Kigali, Norsken House
            </p>
            <div className="flex items-center rounded-full border overflow-hidden" style={{ borderColor: "#e0e0e0" }}>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-gray-400"
                style={{ color: "#1a1a1a" }}
              />
              <button
                className="flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: "#d44d0f", whiteSpace: "nowrap" }}
              >
                Subscribe <span>→</span>
              </button>
            </div>
          </div>
        </MotionReveal>
      </footer>
    </div>
  );
}
