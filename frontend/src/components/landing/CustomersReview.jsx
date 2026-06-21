import { MotionReveal } from "./MotionReveal";

const ACCENT = "#0b1c30";
const CARD_BG = "#eaf4ff";
const CARD_BORDER = "#c5d6dd";

function QuoteBadge({ size = 32 }) {
  return (
    <div
      className="flex items-center justify-center rounded-full font-extrabold text-white flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: ACCENT, fontSize: size * 0.38, fontFamily: "Georgia, serif", lineHeight: 1 }}
    >
      "
    </div>
  );
}

function Stars({ count, total = 5 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: total }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < count ? "#F5A623" : "#ccc"}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

function Avatar({ name, size = 40 }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className="flex-shrink-0 rounded-full flex items-center justify-center font-bold text-sm text-white"
      style={{ width: size, height: size, backgroundColor: ACCENT, fontFamily: "Manrope, sans-serif" }}
    >
      {initials}
    </div>
  );
}

const reviews = [
  {
    company: "Gacondo Tech",
    role: "Technology",
    title: "Excellent System",
    quote: "KNOTY made sales and delivery tracking simple.",
    stars: 5,
  },
  {
    company: "Megazi",
    role: "Retail Business",
    title: "Game Changer",
    quote: "Procurement and expenses now take minutes, not days.",
    stars: 5,
  },
  {
    company: "YUP Initiative",
    role: "NGO",
    title: "Highly Recommended",
    quote: "Invoices and debts are easy to manage every day.",
    stars: 5,
  },
  {
    company: "Mie Empire",
    role: "Enterprise",
    title: "Best Investment",
    quote: "One dashboard for workers, bills, and deliveries.",
    stars: 5,
  },
];

function ReviewCard({ company, role, title, quote, stars }) {
  return (
    <div
      className="hover-lift rounded-2xl p-5 flex flex-col gap-4"
      style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, minHeight: 240 }}
    >
      <QuoteBadge size={34} />

      <div>
        <h3 className="font-bold text-base mb-1.5" style={{ color: ACCENT, fontFamily: "Manrope, sans-serif" }}>
          {title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "#3a5068" }}>
          {quote}
        </p>
      </div>

      <div className="mt-auto flex items-center gap-3 pt-4 border-t" style={{ borderColor: CARD_BORDER }}>
        <Avatar name={company} size={40} />
        <div>
          <p className="text-sm font-bold" style={{ color: ACCENT }}>{company}</p>
          <p className="text-xs" style={{ color: "#6b8099" }}>{role}</p>
          <div className="mt-1"><Stars count={stars} /></div>
        </div>
      </div>
    </div>
  );
}

export function CustomersReview() {
  return (
    <section
      className="w-full px-6 py-16 sm:px-12 lg:px-16"
      style={{ backgroundColor: "#ffffff", fontFamily: "Inter, sans-serif" }}
    >
      <MotionReveal className="reveal-up text-center mb-12">
        <div
          className="mx-auto mb-4"
          style={{ width: 2, height: 32, backgroundColor: ACCENT, borderRadius: 2 }}
        />
        <h2
          className="font-bold"
          style={{
            fontFamily: "Manrope, sans-serif",
            fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)",
            color: ACCENT,
          }}
        >
          Customers Review
        </h2>
        <p className="mt-2 text-sm" style={{ color: "#888" }}>
          What our clients say about KNOTY
        </p>
      </MotionReveal>

      <MotionReveal className="stagger-children mx-auto max-w-6xl grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {reviews.map((review) => (
          <ReviewCard key={review.company} {...review} />
        ))}
      </MotionReveal>
    </section>
  );
}
