-- ============================================================================
-- Pushkar Raj Agarbatti — shop database
-- Run once in Supabase: Dashboard → SQL Editor → paste → Run.
--
-- Security model
--   • Anyone may READ active products, variants and the public site settings.
--   • Only users listed in public.admins may change catalogue, settings or orders.
--   • Orders are CREATED only by the create-order Edge Function (service role),
--     which re-prices everything server-side. Browsers can never write prices.
--   • Payments are marked paid only by mark_order_paid(), callable only by the
--     service role after a Razorpay signature has been verified.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  category text not null default '',
  mood text not null default 'devotional' check (mood in ('floral', 'woody', 'devotional', 'fresh')),
  description text not null default '',
  details text[] not null default '{}',
  -- [{ "path": "products/<file>.webp", "alt": "...", "width": 1200, "height": 1500 }]
  images jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label text not null check (length(trim(label)) > 0),
  price_paise integer not null check (price_paise >= 0),
  original_price_paise integer check (original_price_paise is null or original_price_paise >= 0),
  stock_status text not null default 'in_stock' check (stock_status in ('in_stock', 'low_stock', 'out_of_stock')),
  -- null = stock not counted; otherwise decremented when an order is paid.
  stock_qty integer check (stock_qty is null or stock_qty >= 0),
  max_qty integer check (max_qty is null or max_qty > 0),
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists variants_product_idx on public.variants (product_id);

-- ---------------------------------------------------------------------------
-- Site settings (contact, policies, story, shipping …) — one JSON row.
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.settings (key, value) values ('site', '{}'::jsonb) on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 1001) unique,
  status text not null default 'pending_payment' check (
    status in ('pending_payment', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'payment_failed', 'payment_review')
  ),
  -- { name, phone, email, line1, line2, city, state, pincode }
  customer jsonb not null,
  subtotal_paise integer not null check (subtotal_paise >= 0),
  shipping_paise integer not null default 0 check (shipping_paise >= 0),
  total_paise integer not null check (total_paise >= 0),
  razorpay_order_id text unique,
  razorpay_payment_id text,
  tracking text not null default '',
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.variants (id) on delete set null,
  -- Snapshot at time of purchase, so later catalogue edits never rewrite history.
  product_name text not null,
  variant_label text not null,
  unit_price_paise integer not null check (unit_price_paise >= 0),
  qty integer not null check (qty > 0),
  line_total_paise integer not null check (line_total_paise >= 0)
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
drop trigger if exists variants_touch on public.variants;
create trigger variants_touch before update on public.variants for each row execute function public.touch_updated_at();
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();
drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings for each row execute function public.touch_updated_at();

-- Keep stock_status in step with a counted stock_qty.
create or replace function public.sync_stock_status()
returns trigger language plpgsql as $$
begin
  if new.stock_qty is not null then
    new.stock_status := case
      when new.stock_qty = 0 then 'out_of_stock'
      when new.stock_qty <= 5 then 'low_stock'
      else 'in_stock'
    end;
  end if;
  return new;
end $$;
drop trigger if exists variants_stock on public.variants;
create trigger variants_stock before insert or update on public.variants for each row execute function public.sync_stock_status();

-- Admins may move an order through fulfilment, but never rewrite its money or payment fields.
create or replace function public.guard_order_update()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.subtotal_paise <> old.subtotal_paise or new.shipping_paise <> old.shipping_paise
       or new.total_paise <> old.total_paise
       or new.razorpay_order_id is distinct from old.razorpay_order_id
       or new.razorpay_payment_id is distinct from old.razorpay_payment_id
       or new.paid_at is distinct from old.paid_at
       or new.customer <> old.customer then
      raise exception 'Only status, tracking and notes can be changed on an order';
    end if;
    if new.status = 'paid' and old.status <> 'paid' then
      raise exception 'Orders are marked paid by the payment system, not by hand';
    end if;
    if old.status in ('pending_payment', 'payment_failed') and new.status in ('packed', 'shipped', 'delivered') then
      raise exception 'This order has not been paid';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists orders_guard on public.orders;
create trigger orders_guard before update on public.orders for each row execute function public.guard_order_update();

-- ---------------------------------------------------------------------------
-- Payment confirmation (service role only)
-- ---------------------------------------------------------------------------
create or replace function public.mark_order_paid(p_razorpay_order_id text, p_payment_id text, p_amount_paise integer)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders;
begin
  select * into o from public.orders where razorpay_order_id = p_razorpay_order_id for update;
  if not found then
    raise exception 'Unknown order %', p_razorpay_order_id;
  end if;

  -- Idempotent: webhook and browser verification may both arrive.
  if o.status not in ('pending_payment', 'payment_failed') then
    return o;
  end if;

  if p_amount_paise <> o.total_paise then
    update public.orders set status = 'payment_review', razorpay_payment_id = p_payment_id,
      admin_note = trim(admin_note || E'\nAmount paid (' || p_amount_paise || ' paise) does not match order total.')
      where id = o.id returning * into o;
    return o;
  end if;

  update public.orders set status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now()
    where id = o.id returning * into o;

  -- Count stock down where it is tracked.
  update public.variants v
     set stock_qty = greatest(0, v.stock_qty - i.qty)
    from public.order_items i
   where i.order_id = o.id and i.variant_id = v.id and v.stock_qty is not null;

  return o;
end $$;

revoke all on function public.mark_order_paid(text, text, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.admins enable row level security;
alter table public.products enable row level security;
alter table public.variants enable row level security;
alter table public.settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins for select to authenticated using (user_id = auth.uid());

drop policy if exists "public reads active products" on public.products;
create policy "public reads active products" on public.products for select to anon, authenticated using (active or public.is_admin());
drop policy if exists "admins write products" on public.products;
create policy "admins write products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public reads active variants" on public.variants;
create policy "public reads active variants" on public.variants for select to anon, authenticated using (active or public.is_admin());
drop policy if exists "admins write variants" on public.variants;
create policy "admins write variants" on public.variants for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public reads settings" on public.settings;
create policy "public reads settings" on public.settings for select to anon, authenticated using (true);
drop policy if exists "admins write settings" on public.settings;
create policy "admins write settings" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins read orders" on public.orders;
create policy "admins read orders" on public.orders for select to authenticated using (public.is_admin());
drop policy if exists "admins update orders" on public.orders;
create policy "admins update orders" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins read order items" on public.order_items;
create policy "admins read order items" on public.order_items for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Product photos: public bucket, admin-only uploads.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
  on conflict (id) do update set public = true;

drop policy if exists "admins upload product images" on storage.objects;
create policy "admins upload product images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admins update product images" on storage.objects;
create policy "admins update product images" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admins delete product images" on storage.objects;
create policy "admins delete product images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
