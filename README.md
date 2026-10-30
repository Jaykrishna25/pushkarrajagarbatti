# Pushkar Raj Agarbatti — website

A scroll-driven fragrance experience with a working cart: Vite 6 · React 19 · TypeScript (strict) · Tailwind CSS v4 · Lenis.

```bash
npm install
npm run dev      # http://localhost:5173
npm run lint     # tsc --noEmit
npm run build    # type-check + production build → dist/
npm run preview  # serve dist/ at http://localhost:4173
```

> **Status: preview build.** All product names, prices, stock levels and the pack artwork are **sample placeholders**. They're labelled as samples on the page. Nothing about the company (its history, ingredients, process, certifications, contact details or policies) has been written in, because none of it has been verified yet. Search the code for `TODO(brand)`.

---

## What's on the page

| Section | File | What it does |
|---|---|---|
| Smoke reveal (hero) | `components/SmokeHero.tsx` | Pinned stage (420svh desktop, 300svh mobile). It starts in darkness with an ember and a thread of smoke. Light then opens behind a cusped arch, the pack rises in, and the headline and message appear. The camera pushes through the arch and the light floods to ivory. |
| Our Story | `components/BrandStory.tsx` | Starts on the same ivory the hero ends on, so there's no visible cut. A framed "living still" unmasks as it enters, with editorial copy beside it. |
| Fragrance Journey | `components/FragranceJourney.tsx` | One lit panel per mood. Desktop: pinned horizontal travel. Touch/tablet and reduced motion: a native swipe carousel with snap points. Previous/next buttons and keyboard focus work in both modes. |
| Our Craft | `components/Craftsmanship.tsx` | A macro shot of the glowing tip that pulls back to the full composition while three captions hand over to one another. |
| Shop | `components/Shop.tsx` | Category filter, product cards with pack selection, a detail drawer with quantity, and stock states. |
| Good to know | `components/Trust.tsx` | Built only from known facts: the moods and packs in the catalogue, general incense-safety guidance, and policies (each shown as "will be published" until supplied). |
| Closing scene | `components/FinalCTA.tsx` | Returns to the dark and the smoke, with **Explore the Collection** linking back to the shop. |
| Footer | `components/Footer.tsx` | Navigation, product links, contact, policies (opened in a drawer) and copyright. |
| Cart | `components/CartDrawer.tsx` | Quantities, removal, line totals, subtotal, an empty state, and the checkout boundary. |

### Engine

- `lib/scroll.ts` runs **one rAF loop** for the whole page. Lenis advances first, then each scroll-driven component reads its own rect and writes `transform`/`opacity` through refs. Scrolling never triggers a React re-render. React state is used only for real application state: cart, drawers, selected pack, menu, filter.
- `lib/math.ts` holds `clamp`, `lerp`, `range`, easings, `pinProgress` (pinned sections) and `passProgress` (sections that scroll past).
- `lib/smoke.ts` draws the procedural incense smoke on a 2D canvas. It combines thin strands that start laminar at the ember and break into turbulence as they climb, soft wisps shed from the strands, and motes drifting in the light. No WebGL and no animation library are used. Particle counts drop on mobile, and each canvas only draws while it's on screen.
- **Reduced motion:** nothing is pinned, smooth scrolling is off, the smoke is drawn as a still frame, and all copy is visible without scrolling through an animation.

### Cart and money

- All money is **integer paise** (₹1 = 100). The cart stores only `productId`, `variantId` and `qty`, and prices are always looked up from the catalogue. A tampered or stale `localStorage` cart is re-validated on load: unknown or out-of-stock lines are dropped and quantities are clamped.
- Out-of-stock packs can't be added. Per-pack limits (`maxQty`) are enforced, and a toast confirms each add.
- The cart persists per device and syncs across open tabs.

---

## Before launch: what the brand needs to supply

Everything is configured in two files: **`src/data/brand.ts`** (words, contact, policies, logo) and **`src/data/products.ts`** (catalogue).

### 1. Catalogue → `src/data/products.ts`
Replace the four `sample-*` products with the real ones. Keep product names exactly as printed on the pack. For each product, set `sample: false` and fill in:
`id`, `slug`, `name`, `category`, `mood` (`floral | woody | devotional | fresh` controls the panel's colour and texture; add more moods in `moods` if needed), `description`, `details`, `images`, and `variants[]` (`label`, `pricePaise`, optional `originalPricePaise`, `stock`, optional `maxQty`).
If a field isn't known, leave it out rather than guessing.

### 2. Assets → `public/`

| File | Size / ratio | Purpose |
|---|---|---|
| `public/brand/logo.svg` (or `.png`) | vector, or ≥ 600px wide, transparent | Header and footer. Then set `brand.logo` in `brand.ts`. |
| `public/products/<slug>-front.webp` | 1200×1500 (4:5), transparent or plain background | Product image. Add it to the product's `images[]`, and it replaces the concept pack everywhere automatically. |
| `public/products/<slug>-alt-*.webp` | 1200×1500 | Extra angles (optional). |
| `public/brand/og.jpg` | 1200×630 | Social sharing image. Then un-comment the `og:image` tags in `index.html`. |
| `public/icons/favicon.svg` | square | Replace the placeholder flame icon. |

The empty `backgrounds/`, `atmosphere/` and `textures/` folders are there for photography if you later replace the drawn scenes.

### 3. Words and details → `src/data/brand.ts`
- `story.paragraphs`: the verified brand story. Then set `story.placeholder = false`.
- `tagline`: currently the campaign line *"Where Fragrance Meets Divinity."*, used as creative direction. Replace it with the approved line.
- `contact`, `social`, `legalName`: hidden while `null`.
- `policies[].body`: shipping, returns, privacy and terms text.
- `previewNotice`: set to `null` once the real catalogue is in. This removes the "sample" notices.

---

## Checkout (needs a server)

The site does **not** take payments by itself, and it never reports an order as placed. **Proceed to checkout** calls `startCheckout()` in `src/lib/checkout.ts`:

```
POST {VITE_CHECKOUT_ENDPOINT}
{"items":[{"productId":"…","variantId":"…","qty":1}]}
→ 200 {"redirectUrl":"https://…payment page…"}
```

Your server (a serverless function is enough) must:
1. Look up every product, variant, **price**, stock, shipping and tax itself. Never trust prices from the browser.
2. Create the order or payment session with your provider (Razorpay, Cashfree, Stripe, …) using its **secret key**, which stays on the server.
3. Return the provider's hosted payment URL.
4. Confirm payment through the provider's **webhook**, not the redirect, before marking an order paid or reducing stock.

Until `VITE_CHECKOUT_ENDPOINT` is set, the cart says plainly that online checkout isn't connected. If you fill in `contact.whatsapp` or `contact.email`, it also offers to send the order as a message.

Copy `.env.example` to `.env.local` to configure. Only `VITE_*` values reach the browser, so never put a secret there.

## Deploy

`npm run build` produces a static `dist/` folder that runs on any static host (Vercel, Netlify, Cloudflare Pages, Firebase Hosting). Set `VITE_CHECKOUT_ENDPOINT` and `VITE_SITE_URL` in the host's environment settings.

Fonts load from Google Fonts: Cormorant Garamond (display), Hanken Grotesk (text) and IBM Plex Mono (labels). To self-host them, download the files into `public/fonts/` and replace the `<link>` in `index.html` with `@font-face` rules.
