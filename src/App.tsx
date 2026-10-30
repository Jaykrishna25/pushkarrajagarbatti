import {useEffect} from 'react';
import {BrandStory} from './components/BrandStory';
import {CartDrawer} from './components/CartDrawer';
import {Craftsmanship} from './components/Craftsmanship';
import {FinalCTA} from './components/FinalCTA';
import {Footer} from './components/Footer';
import {FragranceJourney} from './components/FragranceJourney';
import {Header} from './components/Header';
import {ProductCollection, ProductDetails} from './components/Shop';
import {SmokeHero} from './components/SmokeHero';
import {Toast} from './components/Toast';
import {Trust} from './components/Trust';
import {brand} from './data/brand';
import {useSiteData} from './data/site';
import {useReducedMotion} from './hooks/useReducedMotion';
import {ShopProvider} from './hooks/useShop';
import {startScroll} from './lib/scroll';

/** Structured data: organisation always; products only once they're real (not samples). */
function useStructuredData() {
  const {products} = useSiteData();
  useEffect(() => {
    const site = import.meta.env.VITE_SITE_URL || location.origin;
    const graph: object[] = [{'@type': 'Organization', name: brand.name, url: site, ...(brand.logo ? {logo: new URL(brand.logo.src, site).href} : {})}];
    for (const p of products) {
      if (p.sample || !p.images[0]) continue;
      graph.push({
        '@type': 'Product',
        name: p.name,
        description: p.description,
        category: p.category,
        image: p.images.map((i) => new URL(i.src, site).href),
        brand: {'@type': 'Brand', name: brand.name},
        offers: p.variants.map((v) => ({
          '@type': 'Offer',
          name: v.label,
          priceCurrency: 'INR',
          price: (v.pricePaise / 100).toFixed(2),
          availability: v.stock === 'out_of_stock' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
        })),
      });
    }
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.textContent = JSON.stringify({'@context': 'https://schema.org', '@graph': graph});
    document.head.appendChild(el);
    return () => el.remove();
  }, [products]);
}

export default function App() {
  const reduced = useReducedMotion();
  useEffect(() => startScroll(reduced), [reduced]);
  useStructuredData();

  return (
    <ShopProvider>
      <Header />
      <main id="main">
        <SmokeHero />
        <BrandStory />
        <FragranceJourney />
        <Craftsmanship />
        <ProductCollection />
        <Trust />
        <FinalCTA />
      </main>
      <Footer />
      <ProductDetails />
      <CartDrawer />
      <Toast />
    </ShopProvider>
  );
}
