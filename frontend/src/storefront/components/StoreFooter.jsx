import { Link } from "react-router-dom";
import { Clock, Facebook, Instagram, Mail, MapPin, Phone, Truck, Twitter } from "lucide-react";
import { useStore } from "../StoreContext";
import { telLink, whatsappLink } from "../lib/format";

// Lucide has no TikTok glyph, so this mirrors its stroke style and `size` prop.
function TikTokIcon({ size = 18, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

const SOCIAL_ICONS = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  tiktok: TikTokIcon,
};

export default function StoreFooter() {
  const { store, base, categories } = useStore();
  const phoneHref = telLink(store.phone);
  const waHref = whatsappLink(store.whatsapp, `Hello ${store.name}, I would like to place an order.`);
  const socials = Object.entries(store.socials || {}).filter(([, url]) => Boolean(url));

  return (
    <footer className="mt-20 bg-store-brand text-store-brand-fg">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            {store.logo && (
              <img src={store.logo} alt={store.name} className="h-10 w-auto max-w-[130px] object-contain" />
            )}
            <span className="font-display text-lg font-extrabold tracking-tight">{store.name}</span>
          </div>
          <p className="mt-4 max-w-xs text-sm opacity-80">{store.about}</p>
          {store.address && (
            <div className="mt-4 flex items-start gap-2 text-sm opacity-90">
              <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{store.address}</span>
            </div>
          )}
          {socials.length > 0 && (
            <div className="mt-5 flex items-center gap-3">
              {socials.map(([network, url]) => {
                const Icon = SOCIAL_ICONS[network];
                return (
                  <a
                    key={network}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={network}
                    className="grid h-9 w-9 place-items-center rounded-full bg-store-brand-fg/10 transition hover:bg-store-brand-fg/20"
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold">Shop</h4>
          <ul className="mt-4 space-y-2 text-sm opacity-80">
            <li>
              <Link to={`${base}/category/all`} className="hover:underline hover:opacity-100">All Products</Link>
            </li>
            {categories.slice(0, 6).map((category) => (
              <li key={category.slug}>
                <Link to={`${base}/category/${category.slug}`} className="hover:underline hover:opacity-100">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Information</h4>
          <ul className="mt-4 space-y-2 text-sm opacity-80">
            <li><Link to={`${base}/about`} className="hover:underline hover:opacity-100">About Us</Link></li>
            <li><Link to={`${base}/contact`} className="hover:underline hover:opacity-100">Contact Us</Link></li>
            <li><Link to={`${base}/checkout`} className="hover:underline hover:opacity-100">Your Cart</Link></li>
            {store.deliveryNote && (
              <li className="flex items-start gap-2">
                <Truck size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{store.deliveryNote}</span>
              </li>
            )}
            {store.hours && (
              <li className="flex items-start gap-2">
                <Clock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{store.hours}</span>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Get in Touch</h4>
          <ul className="mt-4 space-y-2 text-sm opacity-80">
            {phoneHref && (
              <li>
                <a href={phoneHref} className="flex items-center gap-2 hover:underline hover:opacity-100">
                  <Phone size={14} className="shrink-0" aria-hidden="true" />
                  {store.phone}
                </a>
              </li>
            )}
            {waHref && (
              <li>
                <a href={waHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline hover:opacity-100">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="shrink-0" aria-hidden="true">
                    <path d="M12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413A11.815 11.815 0 0012.05 0" />
                  </svg>
                  Order on WhatsApp
                </a>
              </li>
            )}
            {store.email && (
              <li>
                <a href={`mailto:${store.email}`} className="flex items-center gap-2 hover:underline hover:opacity-100">
                  <Mail size={14} className="shrink-0" aria-hidden="true" />
                  {store.email}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-store-brand-fg/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-5 text-xs opacity-70 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} {store.name}. All rights reserved.</span>
          <span>Powered by <span className="font-semibold opacity-100">Inzira</span></span>
        </div>
      </div>
    </footer>
  );
}
