import { MotionReveal } from "./MotionReveal";

const LIME = "#c8ff00";

function CalendarMock() {
  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{ backgroundColor: "#111", minHeight: 190, fontFamily: "Inter, sans-serif" }}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-xs font-semibold text-white">January 2026</span>
        <span
          className="rounded-full px-2.5 py-0.5 text-[12px] font-bold"
          style={{ backgroundColor: LIME, color: "#000" }}
        >
          Add new +
        </span>
      </div>
      <div className="grid grid-cols-3 px-4 gap-2 text-[11px] text-gray-500 mb-1">
        {["MON", "TUE", "WED"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-3 px-4 gap-2 text-white font-bold text-xl mb-2">
        {[26, 27, 28].map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
      <div className="px-4 pb-3 space-y-1">
        <div className="flex gap-2 items-start">
          <span className="text-[10px] text-gray-500 w-8 flex-shrink-0">2 pm</span>
          <div
            className="flex-1 rounded px-2 py-1"
            style={{ backgroundColor: "#2a5cff", minHeight: 28 }}
          >
            <p className="text-[10px] font-semibold text-white leading-tight">Intro Call – Prime Design</p>
            <p className="text-[9px] text-blue-200">1:00pm – 2pm</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-[10px] text-gray-500 w-8">3 pm</span>
          <div className="flex-1 rounded bg-gray-800 px-2 py-0.5">
            <p className="text-[9px] text-gray-300">30 min</p>
          </div>
        </div>
        <div className="flex gap-2 items-center ml-10">
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-blue-400 font-medium">▶ Join with Google Meet</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlackMock() {
  return (
    <div
      className="w-full rounded-xl overflow-hidden flex"
      style={{ backgroundColor: "#1a1d21", minHeight: 190, fontFamily: "Inter, sans-serif" }}
    >
      <div className="w-28 flex-shrink-0 border-r border-gray-700 pt-3 px-2">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-white text-xs font-bold">INZIRA</span>
        </div>
        {["Threads", "Huddles", "Drafts & sent", "Directories"].map((item) => (
          <p key={item} className="text-[10px] text-gray-400 py-0.5 px-1">{item}</p>
        ))}
        <p className="text-[10px] text-gray-500 mt-2 px-1 uppercase tracking-wider">Channels</p>
        {["product-launch"].map((c) => (
          <p key={c} className="text-[10px] text-gray-400 py-0.5 px-1"># {c}</p>
        ))}
        <p
          className="text-[10px] py-0.5 px-1 font-semibold"
          style={{ color: LIME }}
        >
          # onboarding
        </p>
        <p className="text-[10px] text-gray-400 py-0.5 px-1"># general <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 ml-0.5" /></p>
      </div>

      <div className="flex-1 flex flex-col pt-3 px-3">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700">
          <span className="text-xs font-bold text-white"># onboarding</span>
          <div className="flex gap-1">
            <div className="w-5 h-5 rounded bg-gray-700" />
            <div className="w-5 h-5 rounded bg-gray-700" />
          </div>
        </div>
        <div className="space-y-2 flex-1">
          <Message name="Robert Hayes" time="10:35 AM" text="Joined #onboarding" />
          <Message name="INZIRA" time="10:36 AM" text="Hey! Welcome to INZIRA 🔥" highlight />
        </div>
        <div className="mt-2 rounded-lg border border-gray-600 px-3 py-1.5 flex items-center justify-between">
          <span className="text-[10px] text-gray-500">Message #onboarding</span>
          <span className="text-gray-500 text-xs">◎</span>
        </div>
      </div>
    </div>
  );
}

function Message({ name, time, text, highlight }) {
  return (
    <div className="flex gap-2 items-start">
      <div
        className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
        style={{ backgroundColor: highlight ? "#4a90d9" : "#5a3e6b" }}
      >
        {name[0]}
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-semibold text-white">{name}</span>
          <span className="text-[9px] text-gray-500">{time}</span>
        </div>
        <p className="text-[10px] text-gray-300">{text}</p>
      </div>
    </div>
  );
}

function DesignMock() {
  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{ backgroundColor: "#111", minHeight: 190, fontFamily: "Inter, sans-serif" }}
    >
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gray-800">
        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="ml-3 text-[10px] text-gray-400 font-medium">hippotech.rw</span>
        <div className="ml-auto flex gap-1">
          {["Home", "About", "Pricing", "Team"].map((t) => (
            <span key={t} className="text-[9px] text-gray-500">{t}</span>
          ))}
          <span
            className="text-[9px] font-bold rounded px-1"
            style={{ backgroundColor: LIME, color: "#000" }}
          >
            Start
          </span>
        </div>
      </div>

      <div className="relative px-4 py-3">
        <div className="absolute top-2 right-6 flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-[9px] text-purple-300 bg-purple-900 rounded px-1">Casey</span>
          </div>
        </div>
        <div className="absolute bottom-6 left-8 flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-[9px] text-green-300 bg-green-900 rounded px-1">Jordan</span>
        </div>
        <div className="absolute bottom-3 left-6 flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: LIME }} />
          <span className="text-[9px] font-bold rounded px-1" style={{ backgroundColor: "#3a4a00", color: LIME }}>Taylor</span>
        </div>

        <div className="rounded-lg bg-gray-900 border border-gray-700 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-white">LOGO</span>
          </div>
          <div className="bg-gray-800 rounded p-2 mb-1.5">
            <p className="text-[10px] font-bold text-white leading-tight">Manage smarter.</p>
            <p className="text-[10px] font-bold text-white leading-tight">Grow faster.</p>
            <p className="text-[9px] text-gray-400 mt-0.5">Track sales, invoices & more daily.</p>
            <div
              className="mt-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold inline-block"
              style={{ backgroundColor: LIME, color: "#000" }}
            >
              Get started
            </div>
          </div>
          <div className="flex gap-0.5 mt-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-3 h-3 rounded bg-gray-700" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolBadge({ icon, label }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm font-medium" style={{ color: "#1a1a2e" }}>{label}</span>
    </div>
  );
}

function SlackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="1" y="6.5" width="4" height="4" rx="1.2" fill="#E01E5A" />
      <rect x="6.5" y="1" width="4" height="4" rx="1.2" fill="#36C5F0" />
      <rect x="1" y="12" width="4" height="4" rx="1.2" fill="#2EB67D" />
      <rect x="12" y="6.5" width="4" height="4" rx="1.2" fill="#ECB22E" />
      <rect x="6.5" y="12" width="4" height="4" rx="1.2" fill="#36C5F0" />
      <rect x="12" y="12" width="4" height="4" rx="1.2" fill="#2EB67D" />
      <rect x="6.5" y="6.5" width="4" height="4" rx="1.2" fill="#ECB22E" />
    </svg>
  );
}

function TrelloIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="4" fill="#0052CC" />
      <rect x="3.5" y="3.5" width="5" height="10" rx="1" fill="white" />
      <rect x="11" y="3.5" width="5" height="7" rx="1" fill="white" />
    </svg>
  );
}

function MeetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="1" y="4" width="12" height="12" rx="2" fill="#00AC47" />
      <path d="M13 8l6-3v10l-6-3V8z" fill="#00832D" />
      <rect x="3" y="6" width="8" height="8" rx="1" fill="#00AC47" />
      <rect x="1" y="4" width="12" height="12" rx="2" fill="none" stroke="#00AC47" strokeWidth="0.5" />
    </svg>
  );
}

const steps = [
  {
    mock: <CalendarMock />,
    step: "Step 1",
    title: "Book an intro call",
    desc: "We discuss your business needs and show you how INZIRA fits your operations.",
  },
  {
    mock: <SlackMock />,
    step: "Step 2",
    title: "Choose your plan & onboard",
    desc: "Pick Basic (30k RWF) or Extended (60k RWF with EBM), and we set up your system.",
  },
  {
    mock: <DesignMock />,
    step: "Step 3",
    title: "Manage your business",
    desc: "Start tracking sales, procurement, debts, workers and invoices — all in one place.",
  },
];

export function HowItWorksSection() {
  return (
    <section
      className="w-full px-6 py-16 sm:px-12 lg:px-16"
      style={{ backgroundColor: "#e8e8e8", fontFamily: "Inter, sans-serif" }}
    >
      <MotionReveal className="reveal-up text-center mb-12">
        <p className="text-sm font-medium mb-3" style={{ color: "#555" }}>
          <span style={{ color: "#999" }}>//</span> Up and running in less than 24 hours
        </p>
        <h2
          className="font-extrabold tracking-tight"
          style={{
            fontFamily: "Manrope, sans-serif",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            color: "#0f0f1a",
          }}
        >
          Here's how it works
        </h2>
      </MotionReveal>

      <MotionReveal className="stagger-children mx-auto max-w-6xl grid grid-cols-1 gap-5 md:grid-cols-3">
        {steps.map(({ mock, step, title, desc }) => (
          <div
            key={step}
            className="hover-lift rounded-2xl p-5 flex flex-col gap-4"
            style={{
              backgroundColor: "#f5f5f7",
              border: "1px solid #dcdce4",
            }}
          >
            <div className="rounded-xl overflow-hidden">{mock}</div>

            <span
              className="inline-block rounded px-3 py-0.5 text-xs font-bold w-fit"
              style={{ backgroundColor: LIME, color: "#0f0f1a" }}
            >
              {step}
            </span>

            <div>
              <h3
                className="text-lg font-bold leading-snug"
                style={{ fontFamily: "Manrope, sans-serif", color: "#0f0f1a" }}
              >
                {title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: "#555" }}>
                {desc}
              </p>
            </div>
          </div>
        ))}
      </MotionReveal>

      <MotionReveal className="reveal-up mx-auto mt-10 max-w-2xl">
        <div
          className="hover-lift flex flex-wrap items-center justify-center gap-6 rounded-2xl bg-white px-8 py-4"
          style={{ border: "1px solid #dcdce4" }}
        >
          <ToolBadge icon={<SlackIcon />} label="Real-time sales & expense tracking" />
          <div className="w-px h-4 bg-gray-200 hidden sm:block" />
          <ToolBadge icon={<TrelloIcon />} label="EBM integration for fiscal compliance" />
          <div className="w-px h-4 bg-gray-200 hidden sm:block" />
          <ToolBadge icon={<MeetIcon />} label="Daily maintenance & support" />
        </div>
      </MotionReveal>
    </section>
  );
}
