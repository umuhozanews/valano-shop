import { Award, Lock, MessageCircle, ShieldCheck, Truck } from "lucide-react";
import { useStore } from "../StoreContext";

// The backend names an icon per badge; this keeps the mapping in one place so an
// unknown name degrades to a sensible default instead of crashing the page.
const ICONS = {
  "shield-check": ShieldCheck,
  truck: Truck,
  lock: Lock,
  award: Award,
  "message-circle": MessageCircle,
};

export default function TrustBadges() {
  const { trustBadges } = useStore();
  if (!trustBadges.length) return null;

  return (
    <section className="mt-14">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {trustBadges.map((badge) => {
          const Icon = ICONS[badge.icon] || ShieldCheck;
          return (
            <div
              key={badge.title}
              className="flex flex-col items-center gap-2 rounded-2xl bg-store-soft p-5 text-center ring-1 ring-store-line/60"
            >
              <Icon size={24} className="text-store-brand" aria-hidden="true" />
              <div className="text-sm font-semibold text-store-fg">{badge.title}</div>
              <div className="text-xs text-store-muted">{badge.detail}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
