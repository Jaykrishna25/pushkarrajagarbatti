# Pushkar Raj Agarbatti: website and shop admin

The project has two parts:

- **The website** (`/`) is a scroll-driven fragrance experience with a shop, cart and checkout.
- **The admin panel** (`/admin`) is where the business owner adds products, changes prices and stock, handles orders and edits the site's details.

Stack: Vite 6 · React 19 · TypeScript (strict) · Tailwind CSS v4 · Lenis · Supabase (database, login, photo storage, server functions) · Razorpay (payments).

```powershell
npm install
npm run dev        # website → http://localhost:5173   admin → http://localhost:5173/admin.html
npm run lint       # type-check
npm run build      # production build → dist/
npm run preview    # serve dist/ → http://localhost:4173
```

---

## Demo mode vs live mode

| | **Demo mode** (no Supabase keys set) | **Live mode** (Supabase keys set) |
|---|---|---|
| Admin login | "Open demo" button, no password | Owner's email + password |
| Products, prices, settings | Saved **only in that browser** | Saved in the database, seen by every visitor |
| Website shows | Sample products, or the demo edits made in the same browser | The owner's real products |
| Checkout | Says online checkout isn't connected, and offers WhatsApp/email if a contact number is set | Razorpay payment (UPI, cards, netbanking) |

Demo mode lets you show the client how the panel works before any accounts exist. Nothing in it is real, and a yellow banner says so on every admin page.

---

## What the owner can do in `/admin`

- **Overview:** paid orders today, sales this month, orders waiting to be packed or shipped, stock alerts, and the latest orders.
- **Orders:** filter (to pack, packed, shipped, unpaid…) and search by order number, name or phone. Open an order to see the items, totals and delivery address, with buttons to copy the address, call or WhatsApp the customer, add a courier/tracking reference and private notes, and mark it **packed → shipped → delivered** or cancel it.
  - Unpaid orders can't be shipped, and nobody can mark an order paid by hand. Only a verified Razorpay payment does that.
  - Cancelling a paid order warns that the refund must also be issued in Razorpay.
- **Products:** add, edit, hide or delete products. For each product: name, web address, category, look on the website (Floral, Woody, Devotional, Fresh), description, details, and **photos** (resized in the browser, then uploaded).
  - **Packs and prices:** each pack has its own price, optional MRP (shown struck through), optional limit per order, and either a stock count that goes down with every paid order or a manual in-stock / few-left / out-of-stock setting.
- **Settings:** home page headline, contact details (email, phone, WhatsApp, address, hours), social links, **delivery charge and free-delivery threshold**, the four policies, the "Our Story" text, the sample-data notice switch, and password change.

Website changes appear on the site's next page load.

---

## Going live: step by step

You need a Supabase account (free to start) and a Razorpay account. Razorpay requires the business's KYC documents before live payments are enabled.

### 1. Create the database
1. Go to **supabase.com**, create a **New project**, and choose the **Mumbai** region.
2. Open **SQL Editor → New query**, paste the whole of `supabase/migrations/0001_shop.sql`, and click **Run**.
   This creates the tables, security rules and photo storage. It's safe to run again.

### 2. Create the owner's login
1. Go to **Authentication → Sign In / Providers** and turn **off** "Allow new users to sign up". Only accounts you create can exist.
2. Go to **Authentication → Users → Add user**, enter the owner's email and a strong password, and tick **Auto confirm**.
3. Back in the **SQL Editor**, make that user an admin:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'owner@example.com';
   ```
   Repeat these steps for each staff member who needs access.
4. Go to **Authentication → URL Configuration**. Set **Site URL** to your website address, and add `https://your-domain/admin` to **Redirect URLs** so "Forgot password" emails work.

### 3. Connect the website
In **Project Settings → API**, copy the **Project URL** and the **anon / publishable key**. Put them in Vercel → **Settings → Environment Variables** (or in `.env.local` for local testing):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Redeploy. The site now reads products from the database. **The database starts empty**, so sign in at `/admin` and add products. (The sample products only appear in demo mode.)

> The anon key is public by design: the security rules decide what it can do. **Never** put the `service_role` key or the Razorpay secret in a `VITE_` variable.

### 4. Payments (Razorpay)
1. In Razorpay, go to **Settings → API Keys** and generate keys. Start in **Test mode**.
2. Deploy the three server functions from PowerShell, inside the project folder:
   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=xxx RAZORPAY_WEBHOOK_SECRET=make-up-a-long-random-string ALLOWED_ORIGINS=https://your-domain
   npx supabase functions deploy create-order --no-verify-jwt
   npx supabase functions deploy verify-payment --no-verify-jwt
   npx supabase functions deploy razorpay-webhook --no-verify-jwt
   ```
   Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the functions automatically.
3. In Razorpay, go to **Settings → Webhooks → Add new webhook**:
   - URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/razorpay-webhook`
   - Secret: the same value as `RAZORPAY_WEBHOOK_SECRET`
   - Events: `payment.captured`, `payment.failed`
4. Check that **payment capture** is set to *Automatic* (the Razorpay default).
5. Place a test order on the website using Razorpay's test UPI ID `success@razorpay` or a test card. It should appear in `/admin → Orders` as **Paid · to pack**.
6. When everything works, swap in the **live** keys with `supabase secrets set …` and update the webhook in live mode.

### How a payment works (and why it's safe)
1. The browser sends only **product IDs, pack IDs and quantities**, plus the delivery address.
2. `create-order` looks up every price, checks stock and limits, adds the delivery charge from Settings, saves a *pending* order and opens a Razorpay order for exactly that amount.
3. The customer pays in Razorpay's own window.
4. `verify-payment` checks Razorpay's signature with the secret key and confirms the payment with Razorpay's API. Only then does the database mark the order **paid** and count the stock down. The webhook does the same independently, so the order still completes if the customer closes the tab. Both are safe to repeat.
5. If the amount paid doesn't match the order total, the order is flagged **Check payment** instead of being marked paid.

The database rules enforce all of this, not just the screens: visitors can only read the catalogue; only admins can change products, settings and order status; nobody can rewrite an order's money fields or mark it paid by hand.

---

## Project map

| Path | What |
|---|---|
| `src/components/` | Website sections: `SmokeHero`, `BrandStory`, `FragranceJourney`, `Craftsmanship`, `Shop`, `Trust`, `FinalCTA`, `Footer`, `CartDrawer` |
| `src/data/brand.ts` | Default wording. In live mode, values from Admin → Settings replace it. |
| `src/data/products.ts` | Product types and the **sample** catalogue (demo mode only) |
| `src/data/site.ts` | Loads the catalogue and settings: live database → demo store → samples |
| `src/lib/scroll.ts`, `math.ts`, `smoke.ts` | The single animation loop, scroll maths, and the procedural incense smoke |
| `src/lib/cart.ts`, `checkout.ts` | The cart (integer paise, re-validated against the catalogue) and the Razorpay flow |
| `src/admin/` | The admin panel. `api.ts` is the interface; `supabaseApi.ts` is live and `demoApi.ts` is demo. |
| `supabase/migrations/0001_shop.sql` | Tables, security rules, stock and payment functions |
| `supabase/functions/` | `create-order`, `verify-payment`, `razorpay-webhook` |

## Still to supply before launch
- The logo (`public/brand/logo.svg`, then set `brand.logo` in `src/data/brand.ts`), the favicon, and a 1200×630 `public/brand/og.jpg` for social sharing.
- Real products, prices and photos, entered in `/admin`.
- Contact details, policies and the brand story, entered in `/admin → Settings`. Razorpay and Indian consumer rules expect shipping, returns, privacy and terms to be published.

## Deploy
Push to GitHub and import the repository in Vercel. It detects Vite: the build command is `npm run build` and the output folder is `dist`. `vercel.json` makes `/admin` work and keeps it out of search engines. Add the two `VITE_SUPABASE_*` variables, then redeploy.
