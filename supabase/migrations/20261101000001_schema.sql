-- =============================================================================
-- Espaço Católico Santo Antônio — Database schema
-- Supabase / PostgreSQL 15+
-- =============================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('customer', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum (
    'awaiting_payment', -- aguardando pagamento
    'paid',             -- pagamento aprovado
    'preparing',        -- em preparação
    'shipped',          -- enviado
    'delivered',        -- entregue
    'cancelled'         -- cancelado
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.coupon_type as enum ('percent', 'fixed', 'free_shipping');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

-- Immutable unaccent wrapper so it can be used in generated columns / indexes.
create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$ select unaccent('unaccent', $1) $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  email              text,
  full_name          text,
  cpf                text,
  phone              text,
  birth_date         date,
  role               public.user_role not null default 'customer',
  marketing_opt_in   boolean not null default false,
  accepted_terms_at  timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles (role);
create or replace trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Addresses
-- -----------------------------------------------------------------------------
create table if not exists public.addresses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  label           text not null default 'Casa',
  recipient_name  text not null,
  phone           text,
  cep             text not null check (cep ~ '^[0-9]{8}$'),
  street          text not null,
  number          text not null,
  complement      text,
  district        text not null,
  city            text not null,
  state           char(2) not null,
  is_default      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses (user_id);
create or replace trigger addresses_updated_at before update on public.addresses
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Categories (supports one level of subcategories through parent_id)
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id               uuid primary key default gen_random_uuid(),
  parent_id        uuid references public.categories (id) on delete set null,
  name             text not null,
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description      text,
  icon             text,
  image_url        text,
  sort_order       integer not null default 0,
  is_active        boolean not null default true,
  seo_title        text,
  seo_description  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists categories_parent_idx on public.categories (parent_id);
create or replace trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Products
-- -----------------------------------------------------------------------------
create table if not exists public.products (
  id                 uuid primary key default gen_random_uuid(),
  category_id        uuid references public.categories (id) on delete set null,
  name               text not null,
  slug               text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description  text,
  description        text,
  sku                text unique,
  price              numeric(10, 2) not null check (price >= 0),
  promo_price        numeric(10, 2) check (promo_price is null or promo_price >= 0),
  promo_starts_at    timestamptz,
  promo_ends_at      timestamptz,
  stock              integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 3,
  variant_label      text, -- e.g. "Tamanho", "Cor", "Modelo"
  material           text,
  weight_grams       integer not null default 300 check (weight_grams > 0),
  width_cm           numeric(6, 1) not null default 15,
  height_cm          numeric(6, 1) not null default 10,
  length_cm          numeric(6, 1) not null default 20,
  is_active          boolean not null default true,
  is_featured        boolean not null default false,
  is_new             boolean not null default false,
  is_demo            boolean not null default false,
  sales_count        integer not null default 0,
  rating_avg         numeric(3, 2) not null default 0,
  rating_count       integer not null default 0,
  seo_title          text,
  seo_description    text,
  search_vector      tsvector generated always as (
    setweight(to_tsvector('portuguese', public.immutable_unaccent(coalesce(name, ''))), 'A') ||
    setweight(to_tsvector('portuguese', public.immutable_unaccent(coalesce(short_description, ''))), 'B') ||
    setweight(to_tsvector('portuguese', public.immutable_unaccent(coalesce(description, ''))), 'C')
  ) stored,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint promo_lower_than_price check (promo_price is null or promo_price < price)
);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_active_idx on public.products (is_active);
create index if not exists products_search_idx on public.products using gin (search_vector);
create index if not exists products_sales_idx on public.products (sales_count desc);
create or replace trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  url         text not null,
  storage_path text,
  alt         text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists product_images_product_idx on public.product_images (product_id, sort_order);

create table if not exists public.product_variants (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products (id) on delete cascade,
  name            text not null,
  sku             text unique,
  price_override  numeric(10, 2) check (price_override is null or price_override >= 0),
  stock           integer not null default 0 check (stock >= 0),
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists product_variants_product_idx on public.product_variants (product_id, sort_order);
create or replace trigger product_variants_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Carts (persisted for logged-in customers; guests use localStorage)
-- -----------------------------------------------------------------------------
create table if not exists public.carts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create or replace trigger carts_updated_at before update on public.carts
  for each row execute function public.set_updated_at();

create table if not exists public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  cart_id     uuid not null references public.carts (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  variant_id  uuid references public.product_variants (id) on delete cascade,
  quantity    integer not null check (quantity > 0 and quantity <= 99),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint cart_items_unique unique nulls not distinct (cart_id, product_id, variant_id)
);
create index if not exists cart_items_cart_idx on public.cart_items (cart_id);
create or replace trigger cart_items_updated_at before update on public.cart_items
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Coupons
-- -----------------------------------------------------------------------------
create table if not exists public.coupons (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,30}$'),
  description        text,
  type               public.coupon_type not null default 'percent',
  value              numeric(10, 2) not null default 0 check (value >= 0),
  min_order_value    numeric(10, 2) not null default 0,
  max_uses           integer,
  max_uses_per_user  integer default 1,
  used_count         integer not null default 0,
  starts_at          timestamptz,
  ends_at            timestamptz,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint percent_range check (type <> 'percent' or value <= 100)
);
create or replace trigger coupons_updated_at before update on public.coupons
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Orders
-- -----------------------------------------------------------------------------
create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id                      uuid primary key default gen_random_uuid(),
  order_number            text not null unique default ('SA-' || nextval('public.order_number_seq')::text),
  user_id                 uuid references auth.users (id) on delete set null,
  status                  public.order_status not null default 'awaiting_payment',
  customer_name           text not null,
  customer_email          text not null,
  customer_cpf            text,
  customer_phone          text,
  shipping_address        jsonb not null,
  shipping_method         text not null,
  shipping_service_name   text not null,
  shipping_deadline_days  integer,
  subtotal                numeric(10, 2) not null check (subtotal >= 0),
  discount                numeric(10, 2) not null default 0 check (discount >= 0),
  shipping_cost           numeric(10, 2) not null default 0 check (shipping_cost >= 0),
  total                   numeric(10, 2) not null check (total >= 0),
  coupon_id               uuid references public.coupons (id) on delete set null,
  coupon_code             text,
  payment_provider        text not null default 'mercadopago',
  payment_method          text,
  payment_status          text not null default 'pending',
  mp_preference_id        text,
  mp_init_point           text,
  tracking_code           text,
  tracking_url            text,
  customer_notes          text,
  admin_notes             text,
  stock_released          boolean not null default false,
  paid_at                 timestamptz,
  shipped_at              timestamptz,
  delivered_at            timestamptz,
  cancelled_at            timestamptz,
  expires_at              timestamptz default (now() + interval '3 days'),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_idx on public.orders (created_at desc);
create or replace trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    uuid references public.products (id) on delete set null,
  variant_id    uuid references public.product_variants (id) on delete set null,
  product_name  text not null,
  product_slug  text,
  variant_name  text,
  sku           text,
  image_url     text,
  unit_price    numeric(10, 2) not null check (unit_price >= 0),
  quantity      integer not null check (quantity > 0),
  total         numeric(10, 2) not null check (total >= 0),
  created_at    timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_product_idx on public.order_items (product_id);

create table if not exists public.order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  status      public.order_status not null,
  note        text,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists order_status_history_order_idx on public.order_status_history (order_id, created_at);

create table if not exists public.coupon_redemptions (
  id          uuid primary key default gen_random_uuid(),
  coupon_id   uuid not null references public.coupons (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,
  order_id    uuid not null references public.orders (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (order_id)
);
create index if not exists coupon_redemptions_user_idx on public.coupon_redemptions (coupon_id, user_id);

-- -----------------------------------------------------------------------------
-- Payments (never stores card data — only provider references and status)
-- -----------------------------------------------------------------------------
create table if not exists public.payments (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references public.orders (id) on delete cascade,
  provider             text not null default 'mercadopago',
  provider_payment_id  text not null,
  status               text not null,
  status_detail        text,
  method               text,
  method_id            text,
  installments         integer,
  amount               numeric(10, 2) not null default 0,
  net_amount           numeric(10, 2),
  payer_email          text,
  approved_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
create index if not exists payments_order_idx on public.payments (order_id);
create or replace trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Reviews
-- -----------------------------------------------------------------------------
create table if not exists public.reviews (
  id                 uuid primary key default gen_random_uuid(),
  product_id         uuid not null references public.products (id) on delete cascade,
  user_id            uuid references auth.users (id) on delete set null,
  author_name        text not null,
  rating             smallint not null check (rating between 1 and 5),
  title              text,
  comment            text,
  is_approved        boolean not null default false,
  verified_purchase  boolean not null default false,
  is_demo            boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index if not exists reviews_one_per_user on public.reviews (product_id, user_id) where user_id is not null;
create index if not exists reviews_product_idx on public.reviews (product_id, is_approved);
create or replace trigger reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Banners
-- -----------------------------------------------------------------------------
create table if not exists public.banners (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  subtitle      text,
  eyebrow       text,
  image_url     text,
  storage_path  text,
  link_url      text,
  button_label  text,
  position      text not null default 'hero' check (position in ('hero', 'promo')),
  theme         text not null default 'navy' check (theme in ('navy', 'gold', 'beige')),
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  starts_at     timestamptz,
  ends_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create or replace trigger banners_updated_at before update on public.banners
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Store settings (singleton row id = 1)
-- -----------------------------------------------------------------------------
create table if not exists public.store_settings (
  id                       integer primary key default 1 check (id = 1),
  store_name               text not null default 'Espaço Católico Santo Antônio',
  legal_name               text,
  cnpj                     text,
  email                    text,
  phone                    text,
  whatsapp                 text,
  address                  text,
  business_hours           text,
  instagram_url            text,
  facebook_url             text,
  youtube_url              text,
  origin_cep               text default '01001000',
  free_shipping_threshold  numeric(10, 2) default 299.00,
  pickup_enabled           boolean not null default true,
  pickup_address           text,
  shipping_rates           jsonb not null default '{}'::jsonb,
  max_installments         integer not null default 6,
  order_expiration_hours   integer not null default 72,
  ga_measurement_id        text,
  meta_pixel_id            text,
  announcement             text,
  updated_at               timestamptz not null default now()
);
create or replace trigger store_settings_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Catalog view with effective (promotional) price — respects caller RLS.
-- -----------------------------------------------------------------------------
create or replace view public.catalog_products
with (security_invoker = true) as
select
  p.*,
  case
    when p.promo_price is not null
      and (p.promo_starts_at is null or p.promo_starts_at <= now())
      and (p.promo_ends_at is null or p.promo_ends_at >= now())
    then p.promo_price
    else p.price
  end as effective_price,
  (
    p.promo_price is not null
    and (p.promo_starts_at is null or p.promo_starts_at <= now())
    and (p.promo_ends_at is null or p.promo_ends_at >= now())
  ) as on_sale,
  coalesce(
    (select sum(v.stock) from public.product_variants v where v.product_id = p.id and v.is_active),
    p.stock
  )::integer as available_stock,
  (select i.url from public.product_images i where i.product_id = p.id order by i.sort_order, i.created_at limit 1) as cover_url,
  c.slug as category_slug,
  c.name as category_name,
  c.parent_id as category_parent_id
from public.products p
left join public.categories c on c.id = p.category_id;
