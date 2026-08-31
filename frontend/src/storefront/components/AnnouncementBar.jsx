import { useEffect, useState } from "react";
import { Clock, Phone, Truck } from "lucide-react";
import { useStore } from "../StoreContext";
import { telLink } from "../lib/format";

// Rotates between whatever the shop actually has to say. A shop that has filled
// in nothing still gets a useful bar from its phone number and opening hours.
function buildMessages(store) {
  const messages = [];
  if (store.announcement) messages.push({ tag: "NEWS", text: store.announcement });
  if (store.deliveryNote) messages.push({ tag: "DELIVERY", text: store.deliveryNote, icon: Truck });
  if (store.hours) messages.push({ tag: "OPEN", text: store.hours, icon: Clock });
  return messages;
}

export default function AnnouncementBar() {
  const { store } = useStore();
  const messages = buildMessages(store);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length < 2) return undefined;
    const timer = setInterval(() => setIndex((current) => (current + 1) % messages.length), 5000);
    return () => clearInterval(timer);
  }, [messages.length]);

  if (!messages.length && !store.phone) return null;

  const active = messages[index % (messages.length || 1)];
  const phoneHref = telLink(store.phone);
  const Icon = active?.icon;

  return (
    <div className="hidden overflow-hidden bg-store-brand text-store-brand-fg md:block">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-4 px-6 text-xs">
        {phoneHref ? (
          <a href={phoneHref} className="flex shrink-0 items-center gap-2 opacity-90 hover:opacity-100">
            <Phone size={12} aria-hidden="true" />
            {store.phone}
          </a>
        ) : (
          <span className="shrink-0 opacity-90">{store.address}</span>
        )}

        {active && (
          <div key={index} className="store-fade-up flex min-w-0 items-center gap-2">
            <span className="rounded-full bg-store-brand-fg/25 px-2 py-0.5 text-[10px] font-extrabold tracking-widest">
              {active.tag}
            </span>
            {Icon && <Icon size={12} aria-hidden="true" />}
            <span className="truncate">{active.text}</span>
          </div>
        )}

        <span className="hidden shrink-0 opacity-90 lg:block">{store.address}</span>
      </div>
    </div>
  );
}
