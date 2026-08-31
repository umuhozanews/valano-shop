import { useEffect } from "react";

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

function upsertLink(rel, href) {
  let element = document.head.querySelector(`link[rel="${rel}"][data-store-seo="true"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    element.setAttribute("data-store-seo", "true");
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
  return element;
}

// The app is a single-page bundle with one static index.html, so each storefront
// writes its own title, description, social preview and Organization schema at
// runtime. Everything is restored on unmount to keep the dashboard's own head
// tags intact when a user navigates back out of a store.
export default function StoreSeo({ store, title, description, image }) {
  useEffect(() => {
    if (!store) return undefined;

    const previousTitle = document.title;
    const pageTitle = title ? `${title} — ${store.name}` : `${store.name} — ${store.tagline}`;
    const pageDescription = (description || store.about || store.tagline || "").slice(0, 300);
    const pageImage = image || store.logo || "";
    const canonical = window.location.origin + window.location.pathname;

    document.title = pageTitle;
    upsertMeta('meta[name="description"]', { name: "description", content: pageDescription });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: pageTitle });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: pageDescription });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    if (pageImage) {
      upsertMeta('meta[property="og:image"]', { property: "og:image", content: pageImage });
      upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: pageImage });
    }
    upsertLink("canonical", canonical);
    if (store.logo) upsertLink("icon", store.logo);

    const schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.dataset.storeSeo = "true";
    schema.textContent = JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "Store",
        name: store.name,
        url: `${window.location.origin}/shop/${store.slug}`,
        ...(store.logo ? { logo: store.logo } : {}),
        ...(store.phone ? { telephone: store.phone } : {}),
        ...(store.email ? { email: store.email } : {}),
        ...(store.address ? { address: { "@type": "PostalAddress", streetAddress: store.address, addressCountry: "RW" } } : {}),
        ...(store.hours ? { openingHours: store.hours } : {}),
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: store.name,
        url: `${window.location.origin}/shop/${store.slug}`,
        potentialAction: {
          "@type": "SearchAction",
          target: `${window.location.origin}/shop/${store.slug}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ]);
    document.head.appendChild(schema);

    return () => {
      document.title = previousTitle;
      schema.remove();
      document.head.querySelectorAll('link[data-store-seo="true"]').forEach((node) => node.remove());
    };
  }, [store, title, description, image]);

  return null;
}
