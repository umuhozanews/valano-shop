import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "../StoreContext";
import { ProductImage } from "./Bits";

const ROTATE_MS = 6000;

export default function HeroCarousel() {
  const { heroSlides, base, store } = useStore();
  const [index, setIndex] = useState(0);
  const count = heroSlides.length;

  const go = useCallback((next) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = setInterval(() => setIndex((current) => (current + 1) % count), ROTATE_MS);
    return () => clearInterval(timer);
  }, [count]);

  if (!count) return null;

  return (
    <section
      aria-label={`${store.name} highlights`}
      className="relative overflow-hidden rounded-3xl bg-store-accent"
      style={{ minHeight: 380 }}
    >
      <div className="relative" style={{ minHeight: 380 }}>
        {heroSlides.map((slide, slideIndex) => {
          const isActive = slideIndex === index;
          const target = slide.productId ? `${base}/product/${slide.productId}` : `${base}/category/all`;
          return (
            <div
              key={`${slide.title}-${slideIndex}`}
              aria-hidden={!isActive}
              className={`absolute inset-0 transition-opacity duration-700 ${isActive ? "z-10 opacity-100" : "z-0 opacity-0"}`}
            >
              <div className="grid h-full grid-cols-1 items-center gap-4 px-7 py-7 md:grid-cols-2 md:px-14 md:py-8">
                <div className="flex flex-col justify-center">
                  {slide.badge && (
                    <span className="mb-3 inline-block self-start rounded-full bg-store-brand px-4 py-1.5 text-xs font-extrabold tracking-widest text-store-brand-fg">
                      {slide.badge}
                    </span>
                  )}
                  <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-store-brand sm:text-3xl md:text-4xl">
                    {slide.title}
                  </h1>
                  {slide.subtitle && (
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-store-fg/70">{slide.subtitle}</p>
                  )}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      to={target}
                      className="inline-flex items-center rounded-full bg-store-brand px-6 py-2.5 text-sm font-semibold text-store-brand-fg shadow-sm transition hover:opacity-90"
                    >
                      {slide.ctaLabel || "Shop Now"}
                    </Link>
                    <Link
                      to={`${base}/category/all`}
                      className="inline-flex items-center rounded-full border border-store-brand px-6 py-2.5 text-sm font-semibold text-store-brand transition hover:bg-store-brand/5"
                    >
                      Browse All
                    </Link>
                  </div>
                </div>

                {/* A slide with no photo keeps the text full-width rather than
                    leaving a zero-width placeholder column. */}
                {slide.image && (
                  <div className="hidden h-full items-end justify-center pt-4 md:flex">
                    <ProductImage
                      src={slide.image}
                      alt={slide.title}
                      className="h-full max-h-72 w-auto rounded-2xl object-contain drop-shadow-xl lg:max-h-80"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-store-card/80 text-store-fg shadow transition hover:bg-store-card"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-store-card/80 text-store-fg shadow transition hover:bg-store-card"
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
            {heroSlides.map((slide, slideIndex) => (
              <button
                key={`dot-${slideIndex}`}
                type="button"
                onClick={() => go(slideIndex)}
                aria-label={`Go to slide ${slideIndex + 1}`}
                className={`h-2 rounded-full transition-all ${
                  slideIndex === index ? "w-6 bg-store-brand" : "w-2 bg-store-brand/30"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
