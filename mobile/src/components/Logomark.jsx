export default function Logomark({ size = 32, className = "" }) {
  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-white shadow-sm border border-gray-200/80 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/logo-round.png"
        alt="Inzira Logo"
        className="h-full w-full rounded-full object-cover"
        onError={(e) => {
          e.target.style.display = "none";
        }}
      />
    </div>
  );
}
