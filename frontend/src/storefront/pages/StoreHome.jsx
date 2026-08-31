import { useStore } from "../StoreContext";
import HeroCarousel from "../components/HeroCarousel";
import Catalog from "../components/Catalog";
import CategoryGrid from "../components/CategoryGrid";
import BrandStrip from "../components/BrandStrip";
import TrustBadges from "../components/TrustBadges";
import StoreSeo from "../components/StoreSeo";

export default function StoreHome() {
  const { store, products, heroSlides } = useStore();

  return (
    <>
      <StoreSeo store={store} image={heroSlides[0]?.image} />
      <HeroCarousel />
      <Catalog products={products} title="All Products" enableCategoryFilter />
      <CategoryGrid />
      <BrandStrip />
      <TrustBadges />
      <section className="mt-14 mb-4 overflow-hidden rounded-3xl bg-store-accent px-7 py-10 md:px-14">
        <h2 className="font-display max-w-2xl text-xl font-extrabold tracking-tight text-store-brand md:text-2xl">
          {store.headline || `Welcome to ${store.name}`}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-store-fg/70">{store.about}</p>
      </section>
    </>
  );
}
