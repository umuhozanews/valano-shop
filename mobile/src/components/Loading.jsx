import Logomark from "./Logomark";

export default function Loading({ label = "Loading DataBridge..." }) {
  return (
    <div className="flex h-full min-h-[75vh] w-full flex-col items-center justify-center gap-6 p-6 text-center select-none font-manrope">
      {/* Animated Glowing Round Logo & Spinning Orbit Ring */}
      <div className="relative flex items-center justify-center p-4">
        {/* Soft Background Pulse Glow */}
        <div className="absolute inset-0 rounded-full bg-[#D4F06B]/40 blur-2xl animate-pulse" />

        {/* Orbit Spinning Ring */}
        <div className="absolute h-28 w-28 rounded-full border-4 border-transparent border-t-[#D4F06B] border-r-[#D4F06B] animate-spin duration-1000" />

        {/* Centered Round Logo Badge */}
        <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-white border-2 border-gray-100 shadow-2xl p-1 overflow-hidden transition-transform duration-300 hover:scale-105">
          <Logomark size={88} className="rounded-full shadow-none border-none" />
        </div>
      </div>

      {/* Brand & App Title */}
      <div className="flex flex-col items-center gap-1">
        <h2 className="font-manrope text-2xl font-black tracking-tight text-gray-900">
          INZIRA SYSTEM
        </h2>
        <p className="font-manrope text-[11px] font-extrabold tracking-widest text-gray-500 uppercase">
          DataBridge Mobile Suite
        </p>
      </div>

      {/* Shimmer Loading Progress Bar */}
      <div className="h-1.5 w-44 overflow-hidden rounded-full bg-gray-200/80 relative">
        <div className="h-full w-full rounded-full bg-[#D4F06B] animate-shimmer" />
      </div>

      {label && (
        <span className="text-xs font-bold text-gray-400 animate-pulse">
          {label}
        </span>
      )}
    </div>
  );
}
