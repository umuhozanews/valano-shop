import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useStore } from "../StoreContext";
import StoreSeo from "../components/StoreSeo";
import { telLink, whatsappLink } from "../lib/format";

export default function StoreContact() {
  const { store } = useStore();
  const phoneHref = telLink(store.phone);
  const waHref = whatsappLink(store.whatsapp, `Hello ${store.name}, I have a question.`);

  const channels = [
    phoneHref && { icon: Phone, label: "Call us", value: store.phone, href: phoneHref },
    waHref && { icon: MessageCircle, label: "WhatsApp", value: "Chat with us now", href: waHref, external: true },
    store.email && { icon: Mail, label: "Email", value: store.email, href: `mailto:${store.email}` },
    store.address && { icon: MapPin, label: "Visit us", value: store.address },
    store.hours && { icon: Clock, label: "Opening hours", value: store.hours },
  ].filter(Boolean);

  return (
    <>
      <StoreSeo store={store} title="Contact Us" description={`Get in touch with ${store.name}. ${store.address}`} />

      <section className="mt-2 overflow-hidden rounded-3xl bg-store-accent px-7 py-12 md:px-14">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-store-brand md:text-4xl">Contact Us</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-store-fg/75">
          Questions about a product, price or delivery? Reach {store.name} on any of the channels below and we will get
          back to you.
        </p>
      </section>

      <section className="mt-8 mb-6 grid gap-4 sm:grid-cols-2">
        {channels.map((channel) => {
          const Icon = channel.icon;
          const content = (
            <>
              <Icon size={20} className="shrink-0 text-store-brand" aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-widest text-store-muted">{channel.label}</div>
                <div className="mt-0.5 truncate text-sm font-semibold text-store-fg">{channel.value}</div>
              </div>
            </>
          );

          return channel.href ? (
            <a
              key={channel.label}
              href={channel.href}
              {...(channel.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="flex items-center gap-4 rounded-2xl bg-store-card p-5 ring-1 ring-store-line/70 transition hover:ring-store-brand/40"
            >
              {content}
            </a>
          ) : (
            <div key={channel.label} className="flex items-center gap-4 rounded-2xl bg-store-soft p-5 ring-1 ring-store-line/60">
              {content}
            </div>
          );
        })}
      </section>
    </>
  );
}
