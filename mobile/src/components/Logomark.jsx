export default function Logomark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="#1F5C4E" />
      <path
        d="M9 27C13 27 13 13 20 13C27 13 27 27 31 27"
        stroke="#E8A33D"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="9" cy="27" r="2.3" fill="#fff" />
      <circle cx="31" cy="27" r="2.3" fill="#E8A33D" />
    </svg>
  );
}
