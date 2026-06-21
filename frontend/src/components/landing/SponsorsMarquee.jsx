import { useEffect, useRef } from "react";
import { MotionReveal } from "./MotionReveal";
import yupLogo from "../../assets/sponsors/yup-initiative.png";
import mtnLogo from "../../assets/sponsors/mtn.png";
import airtelLogo from "../../assets/sponsors/airtel.png";
import rraLogo from "../../assets/sponsors/rra.png";
import bkLogo from "../../assets/sponsors/bk.png";
import equityLogo from "../../assets/sponsors/equity.png";

const sponsors = [
  { name: "YUP Initiative", logo: yupLogo },
  { name: "Gacondo Tech", logo: null },
  { name: "MTN", logo: mtnLogo },
  { name: "AIRTEL", logo: airtelLogo },
  { name: "RRA", logo: rraLogo },
  { name: "BK", logo: bkLogo },
  { name: "EQUITY", logo: equityLogo },
];

function SponsorLogo({ name, logo }) {
  return (
    <div
      className="flex items-center justify-center px-8 py-3 select-none"
      style={{ minWidth: "max-content" }}
    >
      {logo ? (
        <img
          src={logo}
          alt={name}
          className="h-12 w-auto max-w-[140px] object-contain opacity-80 hover:opacity-100 transition-opacity duration-300"
        />
      ) : (
        <span
          className="text-xl font-extrabold tracking-tight opacity-60 hover:opacity-100 transition-opacity duration-300"
          style={{ fontFamily: "Manrope, sans-serif", color: "#0057A8" }}
        >
          {name}
        </span>
      )}
    </div>
  );
}

const track = [...sponsors, ...sponsors, ...sponsors];

export function SponsorsMarquee() {
  const railRef = useRef(null);

  useEffect(() => {
    const id = "sponsors-marquee-kf";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes marquee-left {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-33.333%); }
      }
      .marquee-track {
        animation: marquee-left 28s linear infinite;
        will-change: transform;
      }
      .marquee-track:hover {
        animation-play-state: paused;
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <section
      className="w-full py-14"
      style={{ backgroundColor: "#ffffff", fontFamily: "Inter, sans-serif" }}
    >
      <MotionReveal className="reveal-up text-center mb-10 px-6">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#aaa" }}>
          Proudly supported by
        </p>
        <h2
          className="font-extrabold"
          style={{
            fontFamily: "Manrope, sans-serif",
            fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)",
            color: "#0f0f1a",
          }}
        >
          Our Sponsors & Partners
        </h2>
      </MotionReveal>

      <MotionReveal className="reveal-up overflow-hidden relative">
        <div
          className="pointer-events-none absolute left-0 top-0 h-full w-24 z-10"
          style={{ background: "linear-gradient(to right, #ffffff, transparent)" }}
        />
        <div
          className="pointer-events-none absolute right-0 top-0 h-full w-24 z-10"
          style={{ background: "linear-gradient(to left, #ffffff, transparent)" }}
        />

        <div ref={railRef} className="marquee-track flex items-center">
          {track.map((s, i) => (
            <SponsorLogo key={`${s.name}-${i}`} name={s.name} logo={s.logo} />
          ))}
        </div>
      </MotionReveal>

      <div className="mx-auto mt-12 max-w-6xl px-6">
        <div className="h-px bg-gray-100" />
      </div>
    </section>
  );
}
