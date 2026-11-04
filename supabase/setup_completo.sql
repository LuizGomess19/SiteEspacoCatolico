-- =============================================================================
-- SETUP COMPLETO DO BANCO DE DADOS (SUPABASE POSTGRESQL)
-- Espaço Católico Santo Antônio
-- Copie e cole todo este arquivo no SQL Editor do Supabase e clique em RUN.
-- =============================================================================

-- >>> INICIO: supabase/migrations/20261101000001_schema.sql <<<
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


-- >>> INICIO: supabase/migrations/20261101000002_functions.sql <<<
-- =============================================================================
-- Functions, triggers and business rules
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Role helpers
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- True when the current request comes from the service role (trusted server)
-- or from a direct database session (SQL editor / pg_cron). Note: we check
-- session_user (not current_user) because inside SECURITY DEFINER functions
-- current_user is the function owner.
create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
      or coalesce((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'), '') = 'service_role'
      or session_user in ('postgres', 'supabase_admin');
$$;

-- -----------------------------------------------------------------------------
-- Profile bootstrap: create a profile row whenever a new auth user signs up.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, marketing_opt_in, accepted_terms_at)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce((new.raw_user_meta_data ->> 'marketing_opt_in')::boolean, false),
    case when (new.raw_user_meta_data ->> 'accepted_terms')::boolean then now() else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- Only admins (or the service role) may change roles.
create or replace function public.admin_set_user_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_admin() or public.is_service_role()) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() and p_role <> 'admin' then
    raise exception 'Você não pode remover seu próprio acesso de administrador.';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
end;
$$;

-- Keep a single default address per user.
create or replace function public.ensure_single_default_address()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_default then
    update public.addresses
      set is_default = false
      where user_id = new.user_id and id <> new.id and is_default;
  elsif not exists (
    select 1 from public.addresses where user_id = new.user_id and id <> new.id and is_default
  ) then
    new.is_default := true;
  end if;
  return new;
end;
$$;

drop trigger if exists addresses_single_default on public.addresses;
create trigger addresses_single_default
  before insert or update of is_default on public.addresses
  for each row execute function public.ensure_single_default_address();

-- -----------------------------------------------------------------------------
-- Pricing helpers
-- -----------------------------------------------------------------------------
create or replace function public.product_effective_price(p public.products)
returns numeric
language sql
stable
as $$
  select case
    when p.promo_price is not null
      and (p.promo_starts_at is null or p.promo_starts_at <= now())
      and (p.promo_ends_at is null or p.promo_ends_at >= now())
    then p.promo_price
    else p.price
  end;
$$;

-- -----------------------------------------------------------------------------
-- Coupon validation (shared by preview and order creation)
-- -----------------------------------------------------------------------------
create or replace function public.evaluate_coupon(
  p_code text,
  p_subtotal numeric,
  p_shipping_cost numeric,
  p_user_id uuid
)
returns table (coupon_id uuid, code text, type public.coupon_type, discount numeric, free_shipping boolean, message text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.coupons;
  v_user_uses integer;
  v_discount numeric := 0;
begin
  select * into c from public.coupons where public.coupons.code = upper(trim(p_code));

  if not found or not c.is_active then
    raise exception 'COUPON_INVALID:Cupom inválido ou inativo.';
  end if;
  if c.starts_at is not null and c.starts_at > now() then
    raise exception 'COUPON_INVALID:Este cupom ainda não está válido.';
  end if;
  if c.ends_at is not null and c.ends_at < now() then
    raise exception 'COUPON_INVALID:Este cupom expirou.';
  end if;
  if c.max_uses is not null and c.used_count >= c.max_uses then
    raise exception 'COUPON_INVALID:Este cupom atingiu o limite de utilizações.';
  end if;
  if p_subtotal < c.min_order_value then
    raise exception 'COUPON_INVALID:Pedido mínimo para este cupom: R$ %', to_char(c.min_order_value, 'FM999G990D00');
  end if;
  if p_user_id is not null and c.max_uses_per_user is not null then
    select count(*) into v_user_uses
      from public.coupon_redemptions r
      join public.orders o on o.id = r.order_id
      where r.coupon_id = c.id and r.user_id = p_user_id and o.status <> 'cancelled';
    if v_user_uses >= c.max_uses_per_user then
      raise exception 'COUPON_INVALID:Você já utilizou este cupom.';
    end if;
  end if;

  if c.type = 'percent' then
    v_discount := round(p_subtotal * c.value / 100, 2);
  elsif c.type = 'fixed' then
    v_discount := least(c.value, p_subtotal);
  else
    v_discount := 0;
  end if;

  return query select
    c.id, c.code, c.type, v_discount, (c.type = 'free_shipping'),
    coalesce(c.description, 'Cupom aplicado com sucesso.');
end;
$$;

-- Customer-facing preview (uses the authenticated user for per-user limits).
create or replace function public.preview_coupon(p_code text, p_subtotal numeric)
returns table (coupon_id uuid, code text, type public.coupon_type, discount numeric, free_shipping boolean, message text)
language sql
stable
security definer
set search_path = public
as $$
  select * from public.evaluate_coupon(p_code, p_subtotal, 0, auth.uid());
$$;

-- -----------------------------------------------------------------------------
-- Order creation — atomic: validates prices/stock from the DB, reserves stock,
-- applies coupon and clears the customer's cart. Server (service role) only.
-- -----------------------------------------------------------------------------
create or replace function public.create_order(
  p_user_id uuid,
  p_items jsonb,          -- [{ "product_id": uuid, "variant_id": uuid|null, "quantity": int }]
  p_customer jsonb,       -- { name, email, cpf, phone }
  p_address jsonb,        -- address snapshot
  p_shipping jsonb,       -- { method, name, cost, days }
  p_coupon_code text default null,
  p_notes text default null
)
returns table (order_id uuid, order_number text, total numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product public.products;
  v_variant public.product_variants;
  v_has_variants boolean;
  v_qty integer;
  v_unit numeric;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_shipping numeric := coalesce((p_shipping ->> 'cost')::numeric, 0);
  v_coupon record;
  v_coupon_id uuid;
  v_coupon_code text;
  v_order_id uuid;
  v_order_number text;
  v_total numeric;
  v_hours integer;
  v_lines jsonb := '[]'::jsonb;
  v_line jsonb;
begin
  if not public.is_service_role() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART:Seu carrinho está vazio.';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'INVALID:Quantidade de itens excede o limite por pedido.';
  end if;
  if v_shipping < 0 then
    raise exception 'INVALID:Frete inválido.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise exception 'INVALID:Quantidade inválida.';
    end if;

    select * into v_product from public.products
      where id = (v_item ->> 'product_id')::uuid
      for update;
    if not found or not v_product.is_active then
      raise exception 'UNAVAILABLE:Um dos produtos do carrinho não está mais disponível.';
    end if;

    select exists (select 1 from public.product_variants where product_id = v_product.id and is_active)
      into v_has_variants;

    if nullif(v_item ->> 'variant_id', '') is not null then
      select * into v_variant from public.product_variants
        where id = (v_item ->> 'variant_id')::uuid and product_id = v_product.id
        for update;
      if not found or not v_variant.is_active then
        raise exception 'UNAVAILABLE:A opção escolhida de "%" não está mais disponível.', v_product.name;
      end if;
      if v_variant.stock < v_qty then
        raise exception 'OUT_OF_STOCK:Estoque insuficiente para "% - %" (disponível: %).', v_product.name, v_variant.name, v_variant.stock;
      end if;
      v_unit := coalesce(v_variant.price_override, public.product_effective_price(v_product));
      update public.product_variants set stock = stock - v_qty where id = v_variant.id;
      v_line := jsonb_build_object(
        'product_id', v_product.id, 'variant_id', v_variant.id,
        'product_name', v_product.name, 'product_slug', v_product.slug,
        'variant_name', v_variant.name, 'sku', coalesce(v_variant.sku, v_product.sku),
        'unit_price', v_unit, 'quantity', v_qty
      );
    else
      if v_has_variants then
        raise exception 'INVALID:Selecione uma opção para "%".', v_product.name;
      end if;
      if v_product.stock < v_qty then
        raise exception 'OUT_OF_STOCK:Estoque insuficiente para "%" (disponível: %).', v_product.name, v_product.stock;
      end if;
      v_unit := public.product_effective_price(v_product);
      update public.products set stock = stock - v_qty where id = v_product.id;
      v_line := jsonb_build_object(
        'product_id', v_product.id, 'variant_id', null,
        'product_name', v_product.name, 'product_slug', v_product.slug,
        'variant_name', null, 'sku', v_product.sku,
        'unit_price', v_unit, 'quantity', v_qty
      );
    end if;

    v_subtotal := v_subtotal + round(v_unit * v_qty, 2);
    v_lines := v_lines || jsonb_build_array(v_line);
  end loop;

  if nullif(trim(coalesce(p_coupon_code, '')), '') is not null then
    select * into v_coupon from public.evaluate_coupon(p_coupon_code, v_subtotal, v_shipping, p_user_id);
    v_coupon_id := v_coupon.coupon_id;
    v_coupon_code := v_coupon.code;
    v_discount := v_coupon.discount;
    if v_coupon.free_shipping then
      v_shipping := 0;
    end if;
  end if;

  v_total := greatest(v_subtotal - v_discount, 0) + v_shipping;

  select coalesce(order_expiration_hours, 72) into v_hours from public.store_settings where id = 1;
  v_hours := coalesce(v_hours, 72);

  insert into public.orders (
    user_id, customer_name, customer_email, customer_cpf, customer_phone,
    shipping_address, shipping_method, shipping_service_name, shipping_deadline_days,
    subtotal, discount, shipping_cost, total, coupon_id, coupon_code, customer_notes, expires_at
  ) values (
    p_user_id,
    p_customer ->> 'name', p_customer ->> 'email', p_customer ->> 'cpf', p_customer ->> 'phone',
    p_address,
    coalesce(p_shipping ->> 'method', 'standard'),
    coalesce(p_shipping ->> 'name', 'Entrega'),
    nullif(p_shipping ->> 'days', '')::integer,
    v_subtotal, v_discount, v_shipping, v_total,
    v_coupon_id, v_coupon_code, nullif(trim(coalesce(p_notes, '')), ''),
    now() + make_interval(hours => v_hours)
  )
  returning id, public.orders.order_number into v_order_id, v_order_number;

  insert into public.order_items (
    order_id, product_id, variant_id, product_name, product_slug, variant_name, sku,
    image_url, unit_price, quantity, total
  )
  select
    v_order_id,
    (l ->> 'product_id')::uuid,
    nullif(l ->> 'variant_id', '')::uuid,
    l ->> 'product_name',
    l ->> 'product_slug',
    l ->> 'variant_name',
    l ->> 'sku',
    (select i.url from public.product_images i where i.product_id = (l ->> 'product_id')::uuid order by i.sort_order limit 1),
    (l ->> 'unit_price')::numeric,
    (l ->> 'quantity')::integer,
    round((l ->> 'unit_price')::numeric * (l ->> 'quantity')::integer, 2)
  from jsonb_array_elements(v_lines) l;

  insert into public.order_status_history (order_id, status, note, created_by)
  values (v_order_id, 'awaiting_payment', 'Pedido criado pelo cliente.', p_user_id);

  if v_coupon_id is not null then
    insert into public.coupon_redemptions (coupon_id, user_id, order_id)
    values (v_coupon_id, p_user_id, v_order_id);
    update public.coupons set used_count = used_count + 1 where id = v_coupon_id;
  end if;

  -- Clear persisted cart
  delete from public.cart_items ci using public.carts c
    where ci.cart_id = c.id and c.user_id = p_user_id;

  return query select v_order_id, v_order_number, v_total;
end;
$$;

-- -----------------------------------------------------------------------------
-- Stock release (used when an order is cancelled before shipping)
-- -----------------------------------------------------------------------------
create or replace function public.release_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.stock_released then
    return;
  end if;

  update public.product_variants v
    set stock = v.stock + oi.quantity
    from public.order_items oi
    where oi.order_id = p_order_id and oi.variant_id = v.id;

  update public.products p
    set stock = p.stock + oi.quantity
    from public.order_items oi
    where oi.order_id = p_order_id and oi.variant_id is null and oi.product_id = p.id;

  if v_order.paid_at is not null then
    update public.products p
      set sales_count = greatest(p.sales_count - agg.qty, 0)
      from (
        select product_id, sum(quantity)::integer as qty
        from public.order_items where order_id = p_order_id and product_id is not null
        group by product_id
      ) agg
      where p.id = agg.product_id;
  end if;

  if v_order.coupon_id is not null then
    update public.coupons set used_count = greatest(used_count - 1, 0) where id = v_order.coupon_id;
    delete from public.coupon_redemptions where order_id = p_order_id;
  end if;

  update public.orders set stock_released = true where id = p_order_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Order status transitions (admin or service role)
-- -----------------------------------------------------------------------------
create or replace function public.set_order_status(
  p_order_id uuid,
  p_status public.order_status,
  p_note text default null,
  p_tracking_code text default null,
  p_tracking_url text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  if not (public.is_admin() or public.is_service_role()) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND:Pedido não encontrado.';
  end if;

  if v_order.status = 'cancelled' and p_status <> 'cancelled' then
    raise exception 'INVALID:Pedidos cancelados não podem ser reabertos.';
  end if;

  if p_status = 'cancelled' and v_order.status <> 'cancelled' then
    if v_order.status in ('shipped', 'delivered') then
      raise exception 'INVALID:Pedidos já enviados não podem ser cancelados por aqui. Registre uma devolução.';
    end if;
    perform public.release_order_stock(p_order_id);
    update public.orders set cancelled_at = now() where id = p_order_id;
  end if;

  if p_status in ('paid', 'preparing', 'shipped', 'delivered') and v_order.paid_at is null then
    update public.orders set paid_at = now(), payment_status = 'approved' where id = p_order_id;
    update public.products p
      set sales_count = p.sales_count + agg.qty
      from (
        select product_id, sum(quantity)::integer as qty
        from public.order_items where order_id = p_order_id and product_id is not null
        group by product_id
      ) agg
      where p.id = agg.product_id;
  end if;

  if p_status = 'shipped' and v_order.shipped_at is null then
    update public.orders set shipped_at = now() where id = p_order_id;
  end if;
  if p_status = 'delivered' and v_order.delivered_at is null then
    update public.orders set delivered_at = now(), shipped_at = coalesce(shipped_at, now()) where id = p_order_id;
  end if;

  update public.orders
    set status = p_status,
        tracking_code = coalesce(nullif(trim(p_tracking_code), ''), tracking_code),
        tracking_url = coalesce(nullif(trim(p_tracking_url), ''), tracking_url)
    where id = p_order_id
    returning * into v_order;

  insert into public.order_status_history (order_id, status, note, created_by)
  values (p_order_id, p_status, nullif(trim(coalesce(p_note, '')), ''), auth.uid());

  return v_order;
end;
$$;

-- Customer may cancel their own order while it is still awaiting payment.
create or replace function public.customer_cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'NOT_FOUND:Pedido não encontrado.';
  end if;
  if v_order.status <> 'awaiting_payment' then
    raise exception 'INVALID:Apenas pedidos aguardando pagamento podem ser cancelados pelo cliente.';
  end if;
  perform public.release_order_stock(p_order_id);
  update public.orders set status = 'cancelled', cancelled_at = now() where id = p_order_id;
  insert into public.order_status_history (order_id, status, note, created_by)
  values (p_order_id, 'cancelled', 'Cancelado pelo cliente.', auth.uid());
end;
$$;

-- -----------------------------------------------------------------------------
-- Payment notifications (service role only — called by the webhook handler
-- after the payment was fetched directly from the provider API).
-- -----------------------------------------------------------------------------
create or replace function public.apply_payment_update(
  p_order_id uuid,
  p_provider text,
  p_provider_payment_id text,
  p_status text,
  p_status_detail text,
  p_method text,
  p_method_id text,
  p_installments integer,
  p_amount numeric,
  p_net_amount numeric,
  p_payer_email text,
  p_approved_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_result text := 'recorded';
begin
  if not public.is_service_role() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND:Pedido não encontrado.';
  end if;

  insert into public.payments (
    order_id, provider, provider_payment_id, status, status_detail, method, method_id,
    installments, amount, net_amount, payer_email, approved_at
  ) values (
    p_order_id, p_provider, p_provider_payment_id, p_status, p_status_detail, p_method, p_method_id,
    p_installments, coalesce(p_amount, 0), p_net_amount, p_payer_email, p_approved_at
  )
  on conflict (provider, provider_payment_id) do update set
    status = excluded.status,
    status_detail = excluded.status_detail,
    method = excluded.method,
    method_id = excluded.method_id,
    installments = excluded.installments,
    amount = excluded.amount,
    net_amount = excluded.net_amount,
    payer_email = excluded.payer_email,
    approved_at = excluded.approved_at;

  update public.orders
    set payment_status = p_status,
        payment_method = coalesce(p_method, payment_method)
    where id = p_order_id;

  if p_status = 'approved' then
    if coalesce(p_amount, 0) + 0.01 < v_order.total then
      insert into public.order_status_history (order_id, status, note)
      values (p_order_id, v_order.status, 'ATENÇÃO: valor pago (' || p_amount || ') menor que o total do pedido. Verifique.');
      v_result := 'amount_mismatch';
    elsif v_order.status = 'awaiting_payment' then
      perform public.set_order_status(p_order_id, 'paid', 'Pagamento aprovado pelo Mercado Pago (' || coalesce(p_method, '-') || ').');
      v_result := 'paid';
    elsif v_order.status = 'cancelled' then
      insert into public.order_status_history (order_id, status, note)
      values (p_order_id, 'cancelled', 'ATENÇÃO: pagamento aprovado para pedido cancelado. Verifique estoque e reembolso.');
      v_result := 'paid_after_cancel';
    end if;
  elsif p_status in ('refunded', 'charged_back') then
    if v_order.status not in ('cancelled', 'shipped', 'delivered') then
      perform public.set_order_status(p_order_id, 'cancelled', 'Pagamento estornado/reembolsado (' || p_status || ').');
      v_result := 'cancelled';
    else
      insert into public.order_status_history (order_id, status, note)
      values (p_order_id, v_order.status, 'Pagamento ' || p_status || ' no provedor.');
    end if;
  end if;

  return v_result;
end;
$$;

-- Cancels unpaid orders after their expiration (schedule with pg_cron).
create or replace function public.cancel_expired_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_count integer := 0;
begin
  if not (public.is_admin() or public.is_service_role()) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  for v_id in
    select id from public.orders
    where status = 'awaiting_payment' and expires_at is not null and expires_at < now()
  loop
    perform public.release_order_stock(v_id);
    update public.orders set status = 'cancelled', cancelled_at = now() where id = v_id;
    insert into public.order_status_history (order_id, status, note)
    values (v_id, 'cancelled', 'Cancelado automaticamente: prazo de pagamento expirado.');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- Reviews: verified purchase flag, moderation and product rating aggregates
-- -----------------------------------------------------------------------------
create or replace function public.reviews_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_admin() or public.is_service_role()) then
    new.user_id := auth.uid();
    new.is_demo := false;
    if tg_op = 'INSERT' then
      new.is_approved := false;
    else
      new.is_approved := old.is_approved and new.rating = old.rating
        and new.comment is not distinct from old.comment and new.title is not distinct from old.title;
    end if;
  end if;
  if new.user_id is not null then
    new.verified_purchase := exists (
      select 1 from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where o.user_id = new.user_id and oi.product_id = new.product_id
        and o.status in ('paid', 'preparing', 'shipped', 'delivered')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_before_write on public.reviews;
create trigger reviews_before_write
  before insert or update on public.reviews
  for each row execute function public.reviews_before_write();

create or replace function public.refresh_product_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p set
    rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.reviews r where r.product_id = v_product_id and r.is_approved), 0),
    rating_count = (select count(*) from public.reviews r where r.product_id = v_product_id and r.is_approved)
  where p.id = v_product_id;
  return null;
end;
$$;

drop trigger if exists reviews_refresh_rating on public.reviews;
create trigger reviews_refresh_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_product_rating();

-- -----------------------------------------------------------------------------
-- Admin analytics
-- -----------------------------------------------------------------------------
create or replace function public.admin_dashboard(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not (public.is_admin() or public.is_service_role()) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  with paid as (
    select * from public.orders
    where status in ('paid', 'preparing', 'shipped', 'delivered')
      and coalesce(paid_at, created_at) between p_from and p_to
  )
  select jsonb_build_object(
    'revenue', coalesce((select sum(total) from paid), 0),
    'paid_orders', (select count(*) from paid),
    'avg_ticket', coalesce((select round(avg(total), 2) from paid), 0),
    'orders_total', (select count(*) from public.orders where created_at between p_from and p_to),
    'awaiting_payment', (select count(*) from public.orders where status = 'awaiting_payment'),
    'to_ship', (select count(*) from public.orders where status in ('paid', 'preparing')),
    'new_customers', (select count(*) from public.profiles where created_at between p_from and p_to and role = 'customer'),
    'total_customers', (select count(*) from public.profiles where role = 'customer'),
    'status_breakdown', coalesce((
      select jsonb_object_agg(status, qty) from (
        select status, count(*) as qty from public.orders
        where created_at between p_from and p_to group by status
      ) s
    ), '{}'::jsonb),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d::date, 'revenue', coalesce(x.revenue, 0), 'orders', coalesce(x.orders, 0)) order by d)
      from generate_series(date_trunc('day', p_from), date_trunc('day', p_to), interval '1 day') d
      left join (
        select date_trunc('day', coalesce(paid_at, created_at)) as day, sum(total) as revenue, count(*) as orders
        from paid group by 1
      ) x on x.day = d
    ), '[]'::jsonb),
    'top_products', coalesce((
      select jsonb_agg(t) from (
        select oi.product_id, oi.product_name as name, sum(oi.quantity)::integer as quantity, sum(oi.total) as revenue
        from public.order_items oi join paid o on o.id = oi.order_id
        group by oi.product_id, oi.product_name
        order by sum(oi.quantity) desc limit 8
      ) t
    ), '[]'::jsonb),
    'low_stock', coalesce((
      select jsonb_agg(t) from (
        select id, name, slug, available_stock as stock, low_stock_threshold
        from public.catalog_products
        where is_active and available_stock <= low_stock_threshold
        order by available_stock asc limit 10
      ) t
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.admin_sales_report(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not (public.is_admin() or public.is_service_role()) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  with paid as (
    select * from public.orders
    where status in ('paid', 'preparing', 'shipped', 'delivered')
      and coalesce(paid_at, created_at) between p_from and p_to
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'revenue', coalesce((select sum(total) from paid), 0),
      'orders', (select count(*) from paid),
      'items', coalesce((select sum(oi.quantity) from public.order_items oi join paid o on o.id = oi.order_id), 0),
      'discounts', coalesce((select sum(discount) from paid), 0),
      'shipping', coalesce((select sum(shipping_cost) from paid), 0),
      'avg_ticket', coalesce((select round(avg(total), 2) from paid), 0),
      'cancelled', (select count(*) from public.orders where status = 'cancelled' and created_at between p_from and p_to)
    ),
    'by_product', coalesce((
      select jsonb_agg(t order by t.revenue desc) from (
        select oi.product_name as name, oi.sku, sum(oi.quantity)::integer as quantity, sum(oi.total) as revenue
        from public.order_items oi join paid o on o.id = oi.order_id
        group by oi.product_name, oi.sku
      ) t
    ), '[]'::jsonb),
    'by_category', coalesce((
      select jsonb_agg(t order by t.revenue desc) from (
        select coalesce(pc.name, c.name, 'Sem categoria') as name, sum(oi.quantity)::integer as quantity, sum(oi.total) as revenue
        from public.order_items oi
        join paid o on o.id = oi.order_id
        left join public.products p on p.id = oi.product_id
        left join public.categories c on c.id = p.category_id
        left join public.categories pc on pc.id = c.parent_id
        group by 1
      ) t
    ), '[]'::jsonb),
    'by_payment_method', coalesce((
      select jsonb_agg(t order by t.revenue desc) from (
        select coalesce(payment_method, 'não informado') as method, count(*) as orders, sum(total) as revenue
        from paid group by 1
      ) t
    ), '[]'::jsonb),
    'by_state', coalesce((
      select jsonb_agg(t order by t.revenue desc) from (
        select coalesce(shipping_address ->> 'state', '--') as state, count(*) as orders, sum(total) as revenue
        from paid group by 1
      ) t
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- LGPD: export of the customer's own data
-- -----------------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'addresses', coalesce((select jsonb_agg(to_jsonb(a)) from public.addresses a where a.user_id = auth.uid()), '[]'::jsonb),
    'orders', coalesce((
      select jsonb_agg(to_jsonb(o) || jsonb_build_object(
        'items', (select jsonb_agg(to_jsonb(oi)) from public.order_items oi where oi.order_id = o.id)
      ))
      from public.orders o where o.user_id = auth.uid()
    ), '[]'::jsonb),
    'reviews', coalesce((select jsonb_agg(to_jsonb(r)) from public.reviews r where r.user_id = auth.uid()), '[]'::jsonb)
  );
$$;


-- >>> INICIO: supabase/migrations/20261101000003_rls.sql <<<
-- =============================================================================
-- Row Level Security & privileges
-- Principle: customers only see/modify their own data; catalog is public
-- read-only; admins manage everything; sensitive RPCs are service-role only.
-- =============================================================================

alter table public.profiles             enable row level security;
alter table public.addresses            enable row level security;
alter table public.categories           enable row level security;
alter table public.products             enable row level security;
alter table public.product_images       enable row level security;
alter table public.product_variants     enable row level security;
alter table public.carts                enable row level security;
alter table public.cart_items           enable row level security;
alter table public.coupons              enable row level security;
alter table public.coupon_redemptions   enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments             enable row level security;
alter table public.reviews              enable row level security;
alter table public.banners              enable row level security;
alter table public.store_settings       enable row level security;

-- -----------------------------------------------------------------------------
-- Profiles
-- -----------------------------------------------------------------------------
drop policy if exists "profiles: own read" on public.profiles;
create policy "profiles: own read" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: own update" on public.profiles;
create policy "profiles: own update" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Column-level protection: customers cannot change role/email/terms directly.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, cpf, phone, birth_date, marketing_opt_in) on public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- Addresses
-- -----------------------------------------------------------------------------
drop policy if exists "addresses: own all" on public.addresses;
create policy "addresses: own all" on public.addresses
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Catalog: public read of active items, admin write
-- -----------------------------------------------------------------------------
drop policy if exists "categories: public read" on public.categories;
create policy "categories: public read" on public.categories
  for select to anon, authenticated using (is_active or public.is_admin());
drop policy if exists "categories: admin write" on public.categories;
create policy "categories: admin write" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products: public read" on public.products;
create policy "products: public read" on public.products
  for select to anon, authenticated using (is_active or public.is_admin());
drop policy if exists "products: admin write" on public.products;
create policy "products: admin write" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "product_images: public read" on public.product_images;
create policy "product_images: public read" on public.product_images
  for select to anon, authenticated using (true);
drop policy if exists "product_images: admin write" on public.product_images;
create policy "product_images: admin write" on public.product_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "product_variants: public read" on public.product_variants;
create policy "product_variants: public read" on public.product_variants
  for select to anon, authenticated using (is_active or public.is_admin());
drop policy if exists "product_variants: admin write" on public.product_variants;
create policy "product_variants: admin write" on public.product_variants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "banners: public read" on public.banners;
create policy "banners: public read" on public.banners
  for select to anon, authenticated using (
    (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()))
    or public.is_admin()
  );
drop policy if exists "banners: admin write" on public.banners;
create policy "banners: admin write" on public.banners
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "store_settings: public read" on public.store_settings;
create policy "store_settings: public read" on public.store_settings
  for select to anon, authenticated using (true);
drop policy if exists "store_settings: admin write" on public.store_settings;
create policy "store_settings: admin write" on public.store_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Carts
-- -----------------------------------------------------------------------------
drop policy if exists "carts: own all" on public.carts;
create policy "carts: own all" on public.carts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "cart_items: own all" on public.cart_items;
create policy "cart_items: own all" on public.cart_items
  for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- Coupons (codes are never listed publicly; validation goes through RPC)
-- -----------------------------------------------------------------------------
drop policy if exists "coupons: admin all" on public.coupons;
create policy "coupons: admin all" on public.coupons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "coupon_redemptions: admin read" on public.coupon_redemptions;
create policy "coupon_redemptions: admin read" on public.coupon_redemptions
  for select to authenticated using (public.is_admin() or user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Orders: customers read their own; creation only through create_order (server)
-- -----------------------------------------------------------------------------
drop policy if exists "orders: own read" on public.orders;
create policy "orders: own read" on public.orders
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "orders: admin update" on public.orders;
create policy "orders: admin update" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "order_items: own read" on public.order_items;
create policy "order_items: own read" on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "order_status_history: own read" on public.order_status_history;
create policy "order_status_history: own read" on public.order_status_history
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "payments: own read" on public.payments;
create policy "payments: own read" on public.payments
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
  );

revoke insert, delete on public.orders from anon, authenticated;
revoke insert, update, delete on public.order_items from anon, authenticated;
revoke insert, update, delete on public.order_status_history from anon, authenticated;
revoke insert, update, delete on public.payments from anon, authenticated;
revoke insert, update, delete on public.coupon_redemptions from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Reviews
-- -----------------------------------------------------------------------------
drop policy if exists "reviews: public read approved" on public.reviews;
create policy "reviews: public read approved" on public.reviews
  for select to anon, authenticated using (is_approved or user_id = auth.uid() or public.is_admin());

drop policy if exists "reviews: customer insert" on public.reviews;
create policy "reviews: customer insert" on public.reviews
  for insert to authenticated with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "reviews: own or admin update" on public.reviews;
create policy "reviews: own or admin update" on public.reviews
  for update to authenticated using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "reviews: own or admin delete" on public.reviews;
create policy "reviews: own or admin delete" on public.reviews
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- -----------------------------------------------------------------------------
-- Views & functions privileges
-- -----------------------------------------------------------------------------
grant select on public.catalog_products to anon, authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;

-- Helpers used inside RLS policies must be callable by API roles.
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_service_role() to anon, authenticated;
grant execute on function public.immutable_unaccent(text) to anon, authenticated;
grant execute on function public.product_effective_price(public.products) to anon, authenticated;

-- Customer RPCs
grant execute on function public.preview_coupon(text, numeric) to authenticated;
grant execute on function public.customer_cancel_order(uuid) to authenticated;
grant execute on function public.export_my_data() to authenticated;

-- Admin RPCs (each function checks is_admin() internally)
grant execute on function public.set_order_status(uuid, public.order_status, text, text, text) to authenticated;
grant execute on function public.admin_set_user_role(uuid, public.user_role) to authenticated;
grant execute on function public.admin_dashboard(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_sales_report(timestamptz, timestamptz) to authenticated;
grant execute on function public.cancel_expired_orders() to authenticated;

-- Trusted server only (service role key — never exposed to the browser)
grant execute on all functions in schema public to service_role;

-- New functions must not be executable by API roles unless explicitly granted.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;



-- >>> INICIO: supabase/migrations/20261101000004_storage.sql <<<
-- =============================================================================
-- Storage: public bucket for product, category and banner images.
-- Anyone can view; only administrators can upload, replace or delete.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-media',
  'store-media',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "store-media: public read" on storage.objects;
create policy "store-media: public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'store-media');

drop policy if exists "store-media: admin insert" on storage.objects;
create policy "store-media: admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'store-media' and public.is_admin());

drop policy if exists "store-media: admin update" on storage.objects;
create policy "store-media: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'store-media' and public.is_admin())
  with check (bucket_id = 'store-media' and public.is_admin());

drop policy if exists "store-media: admin delete" on storage.objects;
create policy "store-media: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'store-media' and public.is_admin());



-- >>> INICIO: supabase/migrations/20261101000005_customer_account_sync.sql <<<
-- =============================================================================
-- Migration 005: Google OAuth Profile Sync, Per-User Cart Snapshot &
-- Authenticated Customer Order RPC (for Static Export / GitHub Pages + Supabase)
-- =============================================================================

-- 1. Add avatar_url, auth_provider and cart_snapshot to profiles so each user's
--    cart, Google profile picture and personal data stay persisted in their account.
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists auth_provider text not null default 'email',
  add column if not exists cart_snapshot jsonb not null default '[]'::jsonb;

-- Allow authenticated users to update their own avatar_url and cart_snapshot
grant update (full_name, cpf, phone, birth_date, marketing_opt_in, avatar_url, cart_snapshot)
  on public.profiles to authenticated;

-- Allow authenticated users to insert their own profile row if it doesn't exist yet
drop policy if exists "profiles: own insert" on public.profiles;
create policy "profiles: own insert" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());
grant insert on public.profiles to authenticated;

-- 2. Upgrade handle_new_user() trigger to automatically capture Google OAuth
--    fields (full_name, name, avatar_url, picture, provider) as well as email signup fields.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_avatar text;
  v_provider text;
begin
  v_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(new.email, 'Cliente'), '@', 1)
  );
  v_avatar := coalesce(
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(new.raw_user_meta_data ->> 'picture', '')
  );
  v_provider := coalesce(
    nullif(new.raw_app_meta_data ->> 'provider', ''),
    'email'
  );

  insert into public.profiles (
    id, email, full_name, cpf, phone, avatar_url, auth_provider, marketing_opt_in, accepted_terms_at
  )
  values (
    new.id,
    new.email,
    v_name,
    nullif(new.raw_user_meta_data ->> 'cpf', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    v_avatar,
    v_provider,
    coalesce((new.raw_user_meta_data ->> 'marketing_opt_in')::boolean, false),
    case when (new.raw_user_meta_data ->> 'accepted_terms')::boolean then now() else now() end
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    auth_provider = excluded.auth_provider;

  return new;
end;
$$;

-- 3. Ensure authenticated users have full CRUD privileges on their own addresses, carts and cart_items
grant select, insert, update, delete on public.addresses to authenticated;
grant select, insert, update, delete on public.carts to authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select on public.order_status_history to authenticated;

-- 4. RPC for authenticated customers to create an order directly associated with their auth.uid()
--    (Works both with database products and demo/catalog items, strictly isolated to auth.uid())
create or replace function public.create_customer_order(
  p_items jsonb,          -- [{ "product_id": text, "product_name": text, "product_slug": text, "variant_name": text, "unit_price": numeric, "quantity": int }]
  p_customer jsonb,       -- { name, email, cpf, phone }
  p_address jsonb,        -- { street, number, complement, district, city, state, cep }
  p_shipping jsonb,       -- { method, name, cost, days }
  p_payment_method text default 'pix',
  p_notes text default null
)
returns table (order_id uuid, order_number text, total numeric, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_qty integer;
  v_unit numeric;
  v_subtotal numeric := 0;
  v_shipping numeric := greatest(coalesce((p_shipping ->> 'cost')::numeric, 0), 0);
  v_total numeric := 0;
  v_order_id uuid;
  v_order_number text;
  v_created_at timestamptz;
  v_product_uuid uuid;
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED: Faça login na sua conta para finalizar o pedido.' using errcode = '42501';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART: Seu carrinho está vazio.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(coalesce((v_item ->> 'quantity')::integer, 1), 1);
    v_unit := greatest(coalesce((v_item ->> 'unit_price')::numeric, 0), 0);
    v_subtotal := v_subtotal + round(v_unit * v_qty, 2);
  end loop;

  v_total := v_subtotal + v_shipping;

  insert into public.orders (
    user_id,
    status,
    customer_name,
    customer_email,
    customer_cpf,
    customer_phone,
    shipping_address,
    shipping_method,
    shipping_service_name,
    shipping_deadline_days,
    subtotal,
    discount,
    shipping_cost,
    total,
    payment_method,
    payment_status,
    customer_notes
  ) values (
    v_user_id,
    'awaiting_payment',
    coalesce(p_customer ->> 'name', 'Cliente'),
    coalesce(p_customer ->> 'email', ''),
    p_customer ->> 'cpf',
    p_customer ->> 'phone',
    p_address,
    coalesce(p_shipping ->> 'method', 'standard'),
    coalesce(p_shipping ->> 'name', 'Correios / PAC'),
    coalesce((p_shipping ->> 'days')::integer, 5),
    v_subtotal,
    0,
    v_shipping,
    v_total,
    coalesce(p_payment_method, 'pix'),
    'pending',
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id, public.orders.order_number, public.orders.created_at
  into v_order_id, v_order_number, v_created_at;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(coalesce((v_item ->> 'quantity')::integer, 1), 1);
    v_unit := greatest(coalesce((v_item ->> 'unit_price')::numeric, 0), 0);

    begin
      v_product_uuid := (v_item ->> 'product_id')::uuid;
      if not exists (select 1 from public.products where id = v_product_uuid) then
        v_product_uuid := null;
      end if;
    exception when others then
      v_product_uuid := null;
    end;

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      product_slug,
      variant_name,
      unit_price,
      quantity,
      total
    ) values (
      v_order_id,
      v_product_uuid,
      coalesce(v_item ->> 'product_name', 'Artigo Religioso'),
      v_item ->> 'product_slug',
      v_item ->> 'variant_name',
      v_unit,
      v_qty,
      round(v_unit * v_qty, 2)
    );
  end loop;

  insert into public.order_status_history (order_id, status, note, created_by)
  values (v_order_id, 'awaiting_payment', 'Pedido realizado pelo cliente.', v_user_id);

  -- Clear user's cart_snapshot and relational cart_items
  update public.profiles set cart_snapshot = '[]'::jsonb where id = v_user_id;
  delete from public.cart_items ci using public.carts c
    where ci.cart_id = c.id and c.user_id = v_user_id;

  return query select v_order_id, v_order_number, v_total, v_created_at;
end;
$$;

grant execute on function public.create_customer_order(jsonb, jsonb, jsonb, jsonb, text, text) to authenticated;


-- >>> INICIO: supabase/seed.sql <<<
-- =============================================================================
-- DEMO SEED — generated by scripts/generate-seed.ts. Do not edit by hand.
-- All products are flagged is_demo = true and display an "Exemplo" badge.
-- Remove them anytime in Admin > Produtos > "Remover produtos de exemplo".
-- =============================================================================

begin;

-- Store settings
insert into public.store_settings (id, store_name, legal_name, cnpj, email, phone, whatsapp, address, business_hours, instagram_url, facebook_url, youtube_url, origin_cep, free_shipping_threshold, pickup_enabled, pickup_address, shipping_rates, max_installments, order_expiration_hours, announcement)
values (1, 'Espaço Católico Santo Antônio', 'Espaço Católico Santo Antônio (razão social a definir)', '00.000.000/0000-00', 'contato@espacocatolicosantoantonio.com.br', '(00) 0000-0000', '5500000000000', 'Endereço da loja física — configure no painel administrativo', 'Segunda a sexta, 9h às 18h · Sábado, 9h às 13h', 'https://www.instagram.com/espacocatolicosantoantonio', null, null, '01001000', 299, true, 'Retire gratuitamente na loja física (endereço a configurar)', '{"pac":{"name":"PAC (Correios)","base":{"local":18.9,"regional":24.9,"national":32.9},"perKg":{"local":3,"regional":4.5,"national":6},"days":{"local":4,"regional":7,"national":10}},"sedex":{"name":"SEDEX (Correios)","base":{"local":26.9,"regional":36.9,"national":49.9},"perKg":{"local":5,"regional":7,"national":10},"days":{"local":1,"regional":3,"national":5}}}'::jsonb, 6, 72, 'Frete grátis acima de R$ 299 · Parcele em até 6x no cartão · PIX com aprovação imediata')
on conflict (id) do nothing;

-- Categories
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('b7806fe5-be46-4f31-8ca7-94034a08c79d', null, 'Imagens Sacras', 'imagens-sacras', 'Imagens de Nossa Senhora, Jesus Cristo, santos e anjos em resina, madeira e gesso.', 'church', 1) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('48e8911d-a024-4961-8814-41a7894327b5', null, 'Bíblias', 'biblias', 'Bíblias católicas tradicionais, de estudo, infantis e para presente.', 'book-open', 2) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('8da1260c-d316-4f48-8ed4-73d25684f254', null, 'Terços e Rosários', 'tercos-e-rosarios', 'Terços tradicionais, de madeira, de cristal, personalizados e rosários.', 'circle-dot', 3) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('b1d6c963-0418-489f-8f26-31993f1101fb', null, 'Crucifixos e Cruzes', 'crucifixos-e-cruzes', 'Crucifixos de parede, de mesa, cruzes de madeira e crucifixos pessoais.', 'cross', 4) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('d7e1c582-93b5-4f06-81e9-1a80cd8532ea', null, 'Medalhas e Escapulários', 'medalhas-e-escapularios', 'Medalhas de santos e de Nossa Senhora, escapulários e pingentes.', 'medal', 5) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('281d0d86-608f-44e2-8f35-fd1c70618e4e', null, 'Artigos Litúrgicos', 'artigos-liturgicos', 'Cálices, âmbulas, galhetas, objetos para celebrações e vestimentas.', 'wine', 6) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('313e48c4-c85a-4d18-8eac-3eb23548863c', null, 'Livros Católicos', 'livros-catolicos', 'Livros de oração, espiritualidade, vida dos santos, formação e catecismos.', 'library', 7) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('f4fe52a6-f881-4572-8f41-df00beee763e', null, 'Velas e Decoração Religiosa', 'velas-e-decoracao', 'Velas, castiçais, quadros, oratórios e decoração para ambientes.', 'flame', 8) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('0df7777c-b057-4698-809e-9e56827b0ee4', null, 'Presentes Católicos', 'presentes-catolicos', 'Kits religiosos e presentes para batizado, primeira comunhão, crisma e casamento.', 'gift', 9) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('a109fa07-053a-49ab-85af-74d12a37fc0f', 'b7806fe5-be46-4f31-8ca7-94034a08c79d', 'Imagens de Nossa Senhora', 'imagens-nossa-senhora', 'Imagens das diversas invocações de Nossa Senhora.', 'church', 1) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('c5f49f61-12fd-4f05-839f-b4ab48162ad9', 'b7806fe5-be46-4f31-8ca7-94034a08c79d', 'Imagens de Jesus Cristo', 'imagens-jesus-cristo', 'Sagrado Coração, Cristo Redentor, Menino Jesus e mais.', 'church', 2) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('21aab498-b447-4eec-8d3f-67c6fe604fb0', 'b7806fe5-be46-4f31-8ca7-94034a08c79d', 'Imagens de Santos', 'imagens-santos', 'Santo Antônio, São José, São Bento, São Francisco e outros santos.', 'church', 3) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('0a0eb6bd-d415-4641-8ced-78afc5aa0035', 'b7806fe5-be46-4f31-8ca7-94034a08c79d', 'Imagens de Anjos', 'imagens-anjos', 'Anjo da Guarda, São Miguel Arcanjo e anjos decorativos.', 'church', 4) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('586e992e-183a-489a-8722-19b49f396016', 'b7806fe5-be46-4f31-8ca7-94034a08c79d', 'Madeira, Resina e Gesso', 'imagens-madeira-resina-gesso', 'Imagens esculpidas em madeira, resina de alta qualidade e gesso.', 'church', 5) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('50333d2b-d21e-4967-8342-556d5846c6d3', '48e8911d-a024-4961-8814-41a7894327b5', 'Bíblia Tradicional', 'biblia-tradicional', 'Edições católicas completas para leitura diária.', 'book-open', 1) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('bb2f8375-90d2-4879-8437-850fbcb11e8d', '48e8911d-a024-4961-8814-41a7894327b5', 'Bíblia de Estudo', 'biblia-de-estudo', 'Com notas, comentários e mapas para aprofundamento.', 'book-open', 2) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('faee68a6-d906-432a-83dd-6698252aa69e', '48e8911d-a024-4961-8814-41a7894327b5', 'Bíblia Infantil', 'biblia-infantil', 'Ilustradas e com linguagem adequada às crianças.', 'book-open', 3) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('af7af76d-a3b5-4341-8edb-f9b3ad4b8755', '48e8911d-a024-4961-8814-41a7894327b5', 'Bíblia com Capa Especial', 'biblia-capa-especial', 'Capas em couro, zíper, luxo e acabamentos especiais.', 'book-open', 4) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('473a3625-f75d-4229-899a-0177e9771b9d', '48e8911d-a024-4961-8814-41a7894327b5', 'Bíblia de Presente', 'biblia-presente', 'Edições em estojo, ideais para presentear.', 'book-open', 5) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('d25e2448-e7c7-4d14-8504-dc1a7c4b1100', '8da1260c-d316-4f48-8ed4-73d25684f254', 'Terços Tradicionais', 'tercos-tradicionais', 'Modelos clássicos para a oração diária.', 'circle-dot', 1) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('7a283065-7492-40d9-80a1-ea3797e29fbd', '8da1260c-d316-4f48-8ed4-73d25684f254', 'Terços de Nossa Senhora', 'tercos-nossa-senhora', 'Terços dedicados às invocações marianas.', 'circle-dot', 2) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('546e505f-e5e4-4b9b-8a79-eebddb40e037', '8da1260c-d316-4f48-8ed4-73d25684f254', 'Terços de Madeira', 'tercos-madeira', 'Contas em madeira natural e envernizada.', 'circle-dot', 3) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('ef29b320-51d5-4964-83b9-c65ee1099fd8', '8da1260c-d316-4f48-8ed4-73d25684f254', 'Terços de Cristal', 'tercos-cristal', 'Contas de cristal com brilho delicado.', 'circle-dot', 4) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('161b2869-31ed-465d-80a4-462bf6abe6b1', '8da1260c-d316-4f48-8ed4-73d25684f254', 'Rosários', 'rosarios', 'Rosários completos com os mistérios.', 'circle-dot', 5) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('727c5d3a-501d-4bf6-8aa4-e34cd0670f02', '8da1260c-d316-4f48-8ed4-73d25684f254', 'Terços Personalizados', 'tercos-personalizados', 'Terços com nome, data ou medalha especial.', 'circle-dot', 6) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('c30e4dda-0ca3-4cbe-80f4-2384e326a8d2', 'b1d6c963-0418-489f-8f26-31993f1101fb', 'Crucifixos de Parede', 'crucifixos-parede', 'Para abençoar os ambientes da casa.', 'cross', 1) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('33db6a35-3057-4441-854f-0207df94d87d', 'b1d6c963-0418-489f-8f26-31993f1101fb', 'Crucifixos de Mesa', 'crucifixos-mesa', 'Com base, ideais para oratórios e escritórios.', 'cross', 2) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('dd4140eb-73bd-40bf-8118-3e69b23db0a3', 'b1d6c963-0418-489f-8f26-31993f1101fb', 'Cruzes de Madeira', 'cruzes-madeira', 'Cruzes rústicas e trabalhadas em madeira.', 'cross', 3) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('7e6ac41e-c3ce-4522-8bbe-f29465cb5846', 'b1d6c963-0418-489f-8f26-31993f1101fb', 'Crucifixos para Uso Pessoal', 'crucifixos-uso-pessoal', 'Pingentes e crucifixos de bolso.', 'cross', 4) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('f8192e77-bb66-4a43-8e76-01419860d7bf', 'd7e1c582-93b5-4f06-81e9-1a80cd8532ea', 'Medalhas de Santos', 'medalhas-santos', 'São Bento, Santo Antônio, São Miguel e outros.', 'medal', 1) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('982a7df6-1392-4f82-860e-1bf45f4ca7ae', 'd7e1c582-93b5-4f06-81e9-1a80cd8532ea', 'Medalhas de Nossa Senhora', 'medalhas-nossa-senhora', 'Medalha Milagrosa, Aparecida, Fátima e mais.', 'medal', 2) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('738b67da-ffb5-4c3e-89e6-cd60606c0f82', 'd7e1c582-93b5-4f06-81e9-1a80cd8532ea', 'Escapulários', 'escapularios', 'Escapulários em tecido e metal.', 'medal', 3) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('2510065f-87bd-43f3-845b-c7b9b06e53c7', 'd7e1c582-93b5-4f06-81e9-1a80cd8532ea', 'Pingentes Religiosos', 'pingentes-religiosos', 'Pingentes em prata, folheados e aço.', 'medal', 4) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('77946357-038b-4393-8e1c-1589b631f33f', '281d0d86-608f-44e2-8f35-fd1c70618e4e', 'Cálices', 'calices', 'Cálices e patenas para a celebração eucarística.', 'wine', 1) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('bc921ad2-8d06-4136-8e70-ce507977889a', '281d0d86-608f-44e2-8f35-fd1c70618e4e', 'Âmbulas', 'ambulas', 'Âmbulas em diversos tamanhos e acabamentos.', 'wine', 2) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('0a86ccbc-78c2-4dd0-86ab-3dee7e231654', '281d0d86-608f-44e2-8f35-fd1c70618e4e', 'Galhetas', 'galhetas', 'Galhetas em vidro e metal com bandeja.', 'wine', 3) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('379bc534-ea49-4140-8dae-2a160d15bedc', '281d0d86-608f-44e2-8f35-fd1c70618e4e', 'Objetos para Celebrações', 'objetos-celebracoes', 'Turíbulos, navetas, caldeirinhas e mais.', 'wine', 4) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('e283db1e-bece-4502-8811-707033799726', '281d0d86-608f-44e2-8f35-fd1c70618e4e', 'Vestimentas Litúrgicas', 'vestimentas-liturgicas', 'Estolas, casulas e alvas nas cores litúrgicas.', 'wine', 5) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('815f83f6-77d7-4f02-8d89-89f431ff95be', '313e48c4-c85a-4d18-8eac-3eb23548863c', 'Livros de Oração', 'livros-oracao', 'Devocionários, novenas e orações do dia a dia.', 'library', 1) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('4719a68e-b2ed-4a2a-8a29-4f50b7e03326', '313e48c4-c85a-4d18-8eac-3eb23548863c', 'Livros de Espiritualidade', 'livros-espiritualidade', 'Clássicos da espiritualidade católica.', 'library', 2) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('f88c19e3-3611-45d7-8a8e-c3019cdb51ab', '313e48c4-c85a-4d18-8eac-3eb23548863c', 'Livros sobre Santos', 'livros-santos', 'Biografias e escritos dos santos.', 'library', 3) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('abfb1ed5-caa8-4d71-88d3-ccaf34e286cd', '313e48c4-c85a-4d18-8eac-3eb23548863c', 'Livros de Formação Religiosa', 'livros-formacao', 'Doutrina, teologia e formação cristã.', 'library', 4) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('00c18f50-5ea0-4694-8dd5-b27631f533f8', '313e48c4-c85a-4d18-8eac-3eb23548863c', 'Catecismos', 'catecismos', 'Catecismo da Igreja Católica e compêndios.', 'library', 5) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('7e7bbb57-dd16-498b-86b0-90d56e89a68f', 'f4fe52a6-f881-4572-8f41-df00beee763e', 'Velas Religiosas', 'velas-religiosas', 'Velas votivas, de 7 dias e decoradas.', 'flame', 1) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('45163ff5-3874-4939-8d25-44cbb9d078bd', 'f4fe52a6-f881-4572-8f41-df00beee763e', 'Castiçais', 'casticais', 'Castiçais para altar, mesa e oratório.', 'flame', 2) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('1e7e21f7-2bba-4273-8cce-298dce0fe83f', 'f4fe52a6-f881-4572-8f41-df00beee763e', 'Quadros Religiosos', 'quadros-religiosos', 'Quadros sacros com moldura.', 'flame', 3) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('a34d3e19-335f-4125-8d14-155f8e815dc1', 'f4fe52a6-f881-4572-8f41-df00beee763e', 'Oratórios', 'oratorios', 'Oratórios de madeira para imagens.', 'flame', 4) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('1283c6cb-5f72-4a17-877f-ae59bd78cb73', 'f4fe52a6-f881-4572-8f41-df00beee763e', 'Decoração de Ambientes', 'decoracao-ambientes', 'Placas, enfeites e artigos para o lar.', 'flame', 5) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('d06115b1-2a6e-4ef5-86d6-57af2b4707f9', '0df7777c-b057-4698-809e-9e56827b0ee4', 'Kits Religiosos', 'kits-religiosos', 'Kits devocionais prontos para presentear.', 'gift', 1) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('bcf3746d-7bde-4e09-897b-c2c391ef2855', '0df7777c-b057-4698-809e-9e56827b0ee4', 'Presentes para Batizado', 'presentes-batizado', 'Lembranças e presentes para o batizado.', 'gift', 2) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('4f8939e5-8555-4991-843a-e40beda3423d', '0df7777c-b057-4698-809e-9e56827b0ee4', 'Presentes para Primeira Comunhão', 'presentes-primeira-comunhao', 'Terços, livros e kits para a Primeira Eucaristia.', 'gift', 3) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('29845604-1b16-4810-8c4b-eeca97dd37fc', '0df7777c-b057-4698-809e-9e56827b0ee4', 'Presentes para Crisma', 'presentes-crisma', 'Presentes para o sacramento da Confirmação.', 'gift', 4) on conflict (slug) do nothing;
insert into public.categories (id, parent_id, name, slug, description, icon, sort_order) values ('e40c5170-a8c5-42a4-81eb-e4ce16596bc8', '0df7777c-b057-4698-809e-9e56827b0ee4', 'Presentes para Casamento', 'presentes-casamento', 'Bíblias, terços e imagens para os noivos.', 'gift', 5) on conflict (slug) do nothing;

-- Products
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('d483d560-0a90-404c-817d-5b3aee43ae48', '21aab498-b447-4eec-8d3f-67c6fe604fb0', 'Imagem de Santo Antônio com Menino Jesus 20 cm', 'imagem-santo-antonio-com-menino-jesus-20cm', 'Imagem em resina pintada à mão do padroeiro da nossa loja.', 'Santo Antônio de Pádua, Doutor da Igreja e padroeiro dos pobres, representado com o Menino Jesus e o lírio, símbolo de pureza. Peça em resina de alta resistência com pintura artesanal e detalhes dourados.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-001', 149.9, null, 18, null, 'Resina', 650, 10, 20, 8, true, false, true, 142, now() - interval '30 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('9fec9086-01bd-4282-8e4b-84b45a17c27e', 'a109fa07-053a-49ab-85af-74d12a37fc0f', 'Imagem de Nossa Senhora Aparecida em Resina', 'imagem-nossa-senhora-aparecida-resina', 'A Padroeira do Brasil com manto azul bordado e coroa dourada.', 'Imagem de Nossa Senhora da Conceição Aparecida em resina, com manto azul em relevo e coroa dourada. Disponível em três tamanhos, ideal para oratórios, altares e presentes.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-002', 189.9, 159.9, 0, 'Tamanho', 'Resina', 900, 12, 30, 10, true, false, true, 210, now() - interval '31 days') on conflict (slug) do nothing;
insert into public.product_variants (id, product_id, name, sku, price_override, stock, sort_order) values ('0c2a56ac-fae7-4b68-88d7-716e749972d4', '9fec9086-01bd-4282-8e4b-84b45a17c27e', '20 cm', 'DEMO-002-1', 129.9, 12, 0) on conflict do nothing;
insert into public.product_variants (id, product_id, name, sku, price_override, stock, sort_order) values ('ea9c46bf-1442-493b-8893-5c398df4a0a7', '9fec9086-01bd-4282-8e4b-84b45a17c27e', '30 cm', 'DEMO-002-2', null, 8, 1) on conflict do nothing;
insert into public.product_variants (id, product_id, name, sku, price_override, stock, sort_order) values ('e129216a-89b3-42de-84f5-65f8b3113932', '9fec9086-01bd-4282-8e4b-84b45a17c27e', '40 cm', 'DEMO-002-3', 259.9, 4, 2) on conflict do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('746ea420-4346-46fc-8596-88eea7c10788', 'c5f49f61-12fd-4f05-839f-b4ab48162ad9', 'Imagem Sagrado Coração de Jesus 25 cm', 'imagem-sagrado-coracao-de-jesus-25cm', 'Devoção ao Coração de Jesus em resina com acabamento fino.', 'Imagem do Sagrado Coração de Jesus com detalhes em dourado e pintura artesanal. Uma peça que convida à confiança e à consagração da família.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-003', 169.9, null, 10, null, 'Resina', 780, 11, 25, 9, false, false, true, 64, now() - interval '32 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('488e9b1d-e8fe-4861-85d6-e43bf9b59d25', '0a0eb6bd-d415-4641-8ced-78afc5aa0035', 'Imagem São Miguel Arcanjo 30 cm', 'imagem-sao-miguel-arcanjo-30cm', 'O príncipe da milícia celeste em pose de vitória.', 'São Miguel Arcanjo com espada e balança, vencendo o dragão. Resina com pintura envelhecida e detalhes metalizados.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-004', 219.9, null, 6, null, 'Resina', 1100, 14, 30, 12, true, false, true, 58, now() - interval '33 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('79f2d40e-0433-4caa-8295-3fccfb024306', '586e992e-183a-489a-8722-19b49f396016', 'Imagem Nossa Senhora das Graças em Gesso 40 cm', 'imagem-nossa-senhora-das-gracas-gesso-40cm', 'Imagem clássica em gesso com pintura delicada.', 'Nossa Senhora das Graças com os braços estendidos, distribuindo graças a todos que as pedem. Feita em gesso com pintura suave em tons de azul e branco.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-005', 139.9, null, 5, null, 'Gesso', 1800, 16, 40, 12, false, false, true, 31, now() - interval '34 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('62353fef-b1c3-4e8b-8682-20fd0d77f337', '0a0eb6bd-d415-4641-8ced-78afc5aa0035', 'Imagem Anjo da Guarda 15 cm', 'imagem-anjo-da-guarda-15cm', 'Anjo da Guarda protegendo uma criança — ideal para quarto infantil.', 'Delicada imagem do Anjo da Guarda conduzindo uma criança. Perfeita para presentear em batizados e decorar quartos infantis.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-006', 79.9, null, 22, null, 'Resina', 350, 8, 15, 6, false, true, true, 19, now() - interval '5 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('a2afc198-cb09-4fb4-8e2f-368e918efaa0', '586e992e-183a-489a-8722-19b49f396016', 'Imagem São José Esculpida em Madeira 25 cm', 'imagem-sao-jose-madeira-25cm', 'Escultura artesanal em madeira maciça.', 'São José com o Menino Jesus esculpido à mão em madeira maciça, com acabamento em verniz natural. Peça única, cada imagem possui pequenas variações.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-007', 349.9, null, 3, null, 'Madeira maciça', 1200, 10, 25, 9, false, true, true, 7, now() - interval '6 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('690c2309-06af-4bfd-83be-751f0d6d4a71', 'a109fa07-053a-49ab-85af-74d12a37fc0f', 'Imagem Nossa Senhora de Fátima 30 cm', 'imagem-nossa-senhora-de-fatima-30cm', 'Com terço nas mãos e coroa dourada.', 'Nossa Senhora de Fátima em resina branca com detalhes dourados e terço nas mãos. Recorda a mensagem de oração e penitência de 1917.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-008', 179.9, null, 9, null, 'Resina', 850, 11, 30, 10, false, false, true, 45, now() - interval '37 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('b61beef8-c76a-4324-8ee1-8f7a8aaa5730', '50333d2b-d21e-4967-8342-556d5846c6d3', 'Bíblia Sagrada Edição Pastoral', 'biblia-sagrada-edicao-pastoral', 'Tradução acessível com introduções e notas pastorais.', 'Bíblia católica completa, com introduções a cada livro e notas de rodapé que ajudam na leitura orante. Capa cristal, letra média.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-009', 69.9, null, 30, null, 'Papel bíblia', 800, 14, 4, 21, false, false, true, 175, now() - interval '38 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('9034fb64-e2ae-45a0-8173-9e72a2543f4c', 'bb2f8375-90d2-4879-8437-850fbcb11e8d', 'Bíblia de Estudo Católica Comentada', 'biblia-de-estudo-catolica-comentada', 'Comentários, mapas, cronologia e referências cruzadas.', 'Bíblia de estudo com comentários de biblistas católicos, mapas coloridos, tabelas cronológicas e referências cruzadas. Indicada para catequistas e grupos de estudo.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-010', 189.9, 164.9, 12, null, 'Capa dura', 1400, 17, 5, 24, true, false, true, 88, now() - interval '39 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('c393b85f-8c4e-4463-877f-1fe9c6014b27', 'faee68a6-d906-432a-83dd-6698252aa69e', 'Bíblia Infantil Ilustrada', 'biblia-infantil-ilustrada', 'As principais histórias bíblicas com ilustrações coloridas.', 'Histórias do Antigo e do Novo Testamento contadas em linguagem simples, com ilustrações encantadoras para crianças de 4 a 10 anos.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-011', 59.9, null, 25, null, 'Capa dura', 600, 20, 2, 26, false, false, true, 96, now() - interval '40 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('f66c9082-5e1f-435e-841c-81e49053055a', 'af7af76d-a3b5-4341-8edb-f9b3ad4b8755', 'Bíblia Católica Capa de Couro com Zíper', 'biblia-catolica-capa-couro-ziper', 'Capa em couro sintético com zíper e índice lateral.', 'Bíblia completa com capa em couro sintético, fechamento com zíper, índice lateral e fita marcadora. Acabamento elegante e resistente para o uso diário.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-012', 129.9, null, 0, 'Cor', 'Couro sintético', 900, 15, 4, 22, false, true, true, 54, now() - interval '1 days') on conflict (slug) do nothing;
insert into public.product_variants (id, product_id, name, sku, price_override, stock, sort_order) values ('148eb210-d342-4b54-881b-72061e6427c8', 'f66c9082-5e1f-435e-841c-81e49053055a', 'Marrom', 'DEMO-012-1', null, 7, 0) on conflict do nothing;
insert into public.product_variants (id, product_id, name, sku, price_override, stock, sort_order) values ('09a1d1a4-6804-4308-8aa4-87f6a3aed41c', 'f66c9082-5e1f-435e-841c-81e49053055a', 'Preta', 'DEMO-012-2', null, 5, 1) on conflict do nothing;
insert into public.product_variants (id, product_id, name, sku, price_override, stock, sort_order) values ('32802247-0162-4a43-8783-49b17a0ddecf', 'f66c9082-5e1f-435e-841c-81e49053055a', 'Azul-marinho', 'DEMO-012-3', null, 6, 2) on conflict do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('17cd88d8-308d-4f04-85ef-07dada81be60', '473a3625-f75d-4229-899a-0177e9771b9d', 'Bíblia de Presente Branca com Estojo', 'biblia-presente-batizado-branca-estojo', 'Edição branca com página de dedicatória e estojo.', 'Bíblia em capa branca com detalhes dourados, página de dedicatória e estojo de presente. Ideal para batizados, primeira comunhão e casamentos.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-013', 149.9, null, 8, null, 'Capa luxo', 1000, 16, 5, 23, false, false, true, 37, now() - interval '42 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('3c21af85-2e5f-4599-8f96-204751be82dd', 'd25e2448-e7c7-4d14-8504-dc1a7c4b1100', 'Terço Tradicional de Contas Pretas', 'terco-tradicional-contas-pretas', 'Clássico, resistente e ideal para o dia a dia.', 'Terço com contas pretas, entremeio de Nossa Senhora e crucifixo em metal. Corrente reforçada para uso diário.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-014', 24.9, null, 60, null, 'Metal e acrílico', 60, 8, 2, 12, false, false, true, 320, now() - interval '43 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('fd81f047-8461-4d33-8b6c-c1e95d1280ef', '7a283065-7492-40d9-80a1-ea3797e29fbd', 'Terço de Nossa Senhora Aparecida Azul', 'terco-nossa-senhora-aparecida-azul', 'Contas azuis e medalha da Padroeira do Brasil.', 'Terço com contas em tom azul-celeste e entremeio com a imagem de Nossa Senhora Aparecida. Acompanha saquinho de veludo.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-015', 34.9, null, 40, null, 'Metal e cristal acrílico', 70, 8, 2, 12, true, false, true, 260, now() - interval '44 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('996b8753-80b7-4fd7-874e-363979cc6d2b', '546e505f-e5e4-4b9b-8a79-eebddb40e037', 'Terço de Madeira Natural', 'terco-madeira-natural', 'Contas de madeira e crucifixo em madeira.', 'Terço artesanal com contas de madeira natural amarradas em cordão encerado e crucifixo em madeira. Leve e confortável.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-016', 29.9, null, 35, null, 'Madeira', 50, 8, 2, 12, false, false, true, 140, now() - interval '45 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('c1054dfe-769f-4f52-849f-1568763cbac6', 'ef29b320-51d5-4964-83b9-c65ee1099fd8', 'Terço de Cristal', 'terco-de-cristal', 'Contas facetadas que refletem a luz.', 'Terço com contas de cristal facetado, corrente prateada e crucifixo trabalhado. Uma joia de oração para presentear.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-017', 59.9, 49.9, 0, 'Cor', 'Cristal', 80, 8, 2, 12, true, false, true, 118, now() - interval '46 days') on conflict (slug) do nothing;
insert into public.product_variants (id, product_id, name, sku, price_override, stock, sort_order) values ('b88e381f-bddf-4243-8fd7-11fdaf1e3b17', 'c1054dfe-769f-4f52-849f-1568763cbac6', 'Transparente', 'DEMO-017-1', null, 10, 0) on conflict do nothing;
insert into public.product_variants (id, product_id, name, sku, price_override, stock, sort_order) values ('af4db214-6fe3-4ba8-82bd-f81a0ea0f76c', 'c1054dfe-769f-4f52-849f-1568763cbac6', 'Azul', 'DEMO-017-2', null, 8, 1) on conflict do nothing;
insert into public.product_variants (id, product_id, name, sku, price_override, stock, sort_order) values ('7abf30d5-6cde-4971-8c2c-5b83ea10fc5d', 'c1054dfe-769f-4f52-849f-1568763cbac6', 'Rosa', 'DEMO-017-3', null, 6, 2) on conflict do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('1b473948-d4f7-4ca4-856c-714238dc3670', '161b2869-31ed-465d-80a4-462bf6abe6b1', 'Rosário Completo 20 Mistérios', 'rosario-completo-20-misterios', 'Rosário com as quatro coroas dos mistérios.', 'Rosário completo com 20 dezenas para a meditação dos mistérios gozosos, luminosos, dolorosos e gloriosos. Contas em madeira escura.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-018', 89.9, null, 10, null, 'Madeira', 150, 10, 3, 15, false, false, true, 42, now() - interval '47 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('b3cb0509-94d9-4155-8ab1-96e753403811', '727c5d3a-501d-4bf6-8aa4-e34cd0670f02', 'Terço Personalizado com Nome', 'terco-personalizado-com-nome', 'Terço com o nome gravado — informe o nome nas observações do pedido.', 'Terço com contas brancas e letras que formam o nome desejado. Após a compra, informe o nome (até 12 letras) no campo de observações do pedido. Prazo de produção: 3 dias úteis.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-019', 69.9, null, 20, null, 'Acrílico e metal', 70, 8, 2, 12, false, true, true, 23, now() - interval '8 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('457b0744-36a4-4390-8ba9-528a5f91745c', 'd25e2448-e7c7-4d14-8504-dc1a7c4b1100', 'Terço de São Bento em Metal', 'terco-sao-bento-metal', 'Com medalha de São Bento e cruz de proteção.', 'Terço em metal envelhecido com entremeio e crucifixo de São Bento, tradicional sinal de proteção contra o mal.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-020', 39.9, null, 28, null, 'Metal', 90, 8, 2, 12, false, false, true, 99, now() - interval '49 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('2ab67884-2756-4ac0-83b4-6bae3384712c', 'c30e4dda-0ca3-4cbe-80f4-2384e326a8d2', 'Crucifixo de Parede em Madeira 30 cm', 'crucifixo-parede-madeira-30cm', 'Cruz em madeira com Cristo em metal envelhecido.', 'Crucifixo de parede com cruz em madeira nobre e corpo de Cristo em metal com acabamento envelhecido. Acompanha suporte para fixação.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-021', 99.9, null, 14, null, 'Madeira e metal', 500, 16, 30, 3, true, false, true, 77, now() - interval '50 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('d341d93b-e78c-4567-813e-b2718016e603', '33db6a35-3057-4441-854f-0207df94d87d', 'Crucifixo de Mesa com Base', 'crucifixo-mesa-com-base', 'Ideal para oratórios, escritórios e mesas de cabeceira.', 'Crucifixo de mesa com base estável em madeira, cruz trabalhada e Cristo em resina com detalhes dourados.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-022', 89.9, null, 11, null, 'Madeira e resina', 450, 10, 22, 7, false, false, true, 40, now() - interval '51 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('fa7a1c20-1a64-4f7c-86f6-74869b382af8', 'dd4140eb-73bd-40bf-8118-3e69b23db0a3', 'Cruz de Madeira Rústica', 'cruz-madeira-rustica', 'Cruz simples em madeira de demolição.', 'Cruz decorativa em madeira de demolição, com textura rústica e acabamento natural. Cada peça é única.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-023', 49.9, null, 16, null, 'Madeira de demolição', 400, 15, 25, 2, false, false, true, 28, now() - interval '52 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('40f4c545-d42a-40c1-822c-20af03e6978d', '7e6ac41e-c3ce-4522-8bbe-f29465cb5846', 'Crucifixo Pingente Prata 925', 'crucifixo-pingente-prata-925', 'Pingente em prata legítima com acabamento polido.', 'Crucifixo pingente em prata 925 com acabamento polido e detalhes em relevo. Acompanha certificado e embalagem para presente. Corrente vendida separadamente.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-024', 119.9, null, 9, null, 'Prata 925', 30, 5, 2, 7, false, true, true, 33, now() - interval '3 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('e2cf4929-5649-4e8d-8188-b97b589a8241', 'c30e4dda-0ca3-4cbe-80f4-2384e326a8d2', 'Cruz de São Bento de Parede', 'cruz-sao-bento-parede', 'Cruz com medalha de São Bento para proteção do lar.', 'Cruz de parede com a medalha de São Bento ao centro e inscrições tradicionais. Para pendurar na entrada da casa.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-025', 79.9, null, 13, null, 'Metal e madeira', 380, 14, 22, 2, false, false, true, 51, now() - interval '54 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('bf711fd3-3c8d-43c7-862f-f021b1a0f81b', '982a7df6-1392-4f82-860e-1bf45f4ca7ae', 'Medalha Milagrosa Prateada', 'medalha-milagrosa-prateada', 'A medalha revelada a Santa Catarina Labouré.', 'Medalha Milagrosa em metal prateado, com a imagem de Nossa Senhora das Graças e a inscrição "Ó Maria concebida sem pecado, rogai por nós que recorremos a vós".

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-026', 19.9, null, 80, null, 'Metal prateado', 20, 4, 1, 6, false, false, true, 190, now() - interval '55 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('8e4dc31b-f807-4297-8328-4705cef64303', 'f8192e77-bb66-4a43-8e76-01419860d7bf', 'Medalha de São Bento', 'medalha-sao-bento', 'Medalha de proteção com as inscrições tradicionais.', 'Medalha de São Bento em metal dourado, com as inscrições do exorcismo tradicional no verso.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-027', 22.9, null, 70, null, 'Metal dourado', 20, 4, 1, 6, false, false, true, 150, now() - interval '56 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('a51cefc0-f675-42f4-8053-c0a646ff90e8', '738b67da-ffb5-4c3e-89e6-cd60606c0f82', 'Escapulário de Nossa Senhora do Carmo', 'escapulario-nossa-senhora-do-carmo-tecido', 'Escapulário marrom em tecido, tradicional.', 'Escapulário de Nossa Senhora do Carmo em tecido marrom com imagens bordadas. Sinal de consagração a Maria.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-028', 14.9, null, 100, null, 'Tecido', 15, 5, 1, 8, true, false, true, 280, now() - interval '57 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('b773e76f-1db3-43e3-82bb-41c1c0edb8e7', '738b67da-ffb5-4c3e-89e6-cd60606c0f82', 'Escapulário de Aço Inox', 'escapulario-aco-inox', 'Durável, não escurece e pode ser usado no banho.', 'Escapulário em aço inoxidável com medalhas do Sagrado Coração de Jesus e de Nossa Senhora do Carmo. Corrente de 60 cm.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-029', 39.9, null, 45, null, 'Aço inox', 25, 5, 1, 8, false, false, true, 130, now() - interval '58 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('ad859370-01e5-46a4-84f4-0ec2a819ace8', '2510065f-87bd-43f3-845b-c7b9b06e53c7', 'Pingente Santo Antônio Folheado a Ouro', 'pingente-santo-antonio-folheado-ouro', 'Pingente delicado do padroeiro, folheado a ouro 18k.', 'Pingente de Santo Antônio folheado a ouro 18k, com garantia contra defeitos de fabricação. Embalagem para presente inclusa.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-030', 89.9, null, 12, null, 'Folheado a ouro 18k', 15, 3, 1, 5, false, true, true, 21, now() - interval '9 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('e2257c32-8518-4dde-8a1b-05509d7684da', '77946357-038b-4393-8e1c-1589b631f33f', 'Cálice Dourado com Patena', 'calice-dourado-com-patena', 'Cálice em metal com banho dourado e patena.', 'Cálice litúrgico em metal com banho dourado interno e externo, acompanhado de patena. Acabamento cinzelado. Indicado para paróquias e capelas.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-031', 489.9, null, 4, null, 'Metal com banho dourado', 700, 12, 20, 12, false, false, true, 9, now() - interval '60 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('cf3419b0-576e-4c5c-8ffa-a3ce0d002bf8', 'bc921ad2-8d06-4136-8e70-ce507977889a', 'Âmbula Dourada Média', 'ambula-dourada-media', 'Capacidade aproximada de 300 partículas.', 'Âmbula com tampa e cruz, em metal com banho dourado. Capacidade aproximada de 300 partículas.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-032', 389.9, null, 3, null, 'Metal com banho dourado', 650, 12, 22, 12, false, false, true, 6, now() - interval '61 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('896006a4-5ec7-4328-8b3e-7926b911b34c', '0a86ccbc-78c2-4dd0-86ab-3dee7e231654', 'Galhetas de Vidro com Bandeja', 'galhetas-vidro-com-bandeja', 'Par de galhetas com bandeja em metal.', 'Conjunto com duas galhetas de vidro (água e vinho) e bandeja em metal prateado.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-033', 119.9, null, 7, null, 'Vidro e metal', 600, 20, 12, 12, false, false, true, 14, now() - interval '62 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('e1442648-0a22-4474-8f49-aac29c1f5770', '379bc534-ea49-4140-8dae-2a160d15bedc', 'Turíbulo com Naveta', 'turibulo-com-naveta', 'Conjunto para incensação em metal dourado.', 'Turíbulo em metal dourado com correntes e naveta com colher. Para celebrações solenes.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-034', 459.9, null, 2, null, 'Metal dourado', 1500, 15, 30, 15, false, false, true, 4, now() - interval '63 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('1ab2e3dd-4407-4f21-80d8-b62796455515', 'e283db1e-bece-4502-8811-707033799726', 'Estola Sacerdotal Bordada', 'estola-sacerdotal-bordada', 'Estola com bordado de cruz nas cores litúrgicas.', 'Estola sacerdotal em tecido nobre com bordado de cruz dourada nas extremidades. Disponível nas cores do ano litúrgico.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-035', 229.9, null, 0, 'Cor litúrgica', 'Tecido jacquard', 250, 20, 3, 30, false, false, true, 12, now() - interval '64 days') on conflict (slug) do nothing;
insert into public.product_variants (id, product_id, name, sku, price_override, stock, sort_order) values ('40661924-9db9-4bf0-8ce5-006eb9b07bbc', '1ab2e3dd-4407-4f21-80d8-b62796455515', 'Branca', 'DEMO-035-1', null, 3, 0) on conflict do nothing;
insert into public.product_variants (id, product_id, name, sku, price_override, stock, sort_order) values ('a5c676e3-6bf6-47bf-861f-8839310485fb', '1ab2e3dd-4407-4f21-80d8-b62796455515', 'Verde', 'DEMO-035-2', null, 3, 1) on conflict do nothing;
insert into public.product_variants (id, product_id, name, sku, price_override, stock, sort_order) values ('b81e7f53-39d1-4c6f-87d4-4a0d586ccc1b', '1ab2e3dd-4407-4f21-80d8-b62796455515', 'Roxa', 'DEMO-035-3', null, 2, 2) on conflict do nothing;
insert into public.product_variants (id, product_id, name, sku, price_override, stock, sort_order) values ('5307d301-a0b8-47bd-8b44-9f6b77a8c259', '1ab2e3dd-4407-4f21-80d8-b62796455515', 'Vermelha', 'DEMO-035-4', null, 2, 3) on conflict do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('7d837974-801d-4940-8715-f2e685392acc', '815f83f6-77d7-4f02-8d89-89f431ff95be', 'Livro de Orações do Católico', 'livro-oracoes-do-catolico', 'Orações tradicionais, novenas e ladainhas.', 'Devocionário com orações da manhã e da noite, novenas, ladainhas, o santo terço e orações aos santos. Formato de bolso.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-036', 34.9, null, 40, null, 'Brochura', 250, 11, 2, 16, false, false, true, 110, now() - interval '65 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('218cf652-b6f9-4286-85c8-6d24f82267ea', '4719a68e-b2ed-4a2a-8a29-4f50b7e03326', 'Imitação de Cristo', 'imitacao-de-cristo', 'O clássico de Tomás de Kempis.', 'Um dos livros mais lidos da história cristã, com conselhos para a vida interior e a união com Cristo.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-037', 39.9, null, 22, null, 'Brochura', 300, 13, 2, 19, false, false, true, 66, now() - interval '66 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('ec3985cf-0502-4ce3-89db-df615e414057', 'f88c19e3-3611-45d7-8a8e-c3019cdb51ab', 'Vida de Santo Antônio de Pádua', 'vida-de-santo-antonio-de-padua', 'Biografia do Santo dos milagres.', 'A história de Santo Antônio, de Lisboa a Pádua: sua pregação, seus milagres e sua devoção aos pobres. Inclui a trezena de Santo Antônio.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-038', 44.9, null, 18, null, 'Brochura', 320, 14, 2, 21, true, false, true, 72, now() - interval '67 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('415ff732-8417-4406-8136-bf7cb455b97a', '00c18f50-5ea0-4694-8dd5-b27631f533f8', 'Catecismo da Igreja Católica', 'catecismo-da-igreja-catolica', 'Edição típica vaticana em português.', 'O Catecismo da Igreja Católica completo, com índice analítico. Referência para a fé, a liturgia, a moral e a oração cristã.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-039', 79.9, null, 15, null, 'Brochura', 900, 15, 5, 22, false, false, true, 58, now() - interval '68 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('53151ddd-2e96-45a9-86ab-9b97dfadfc65', 'abfb1ed5-caa8-4d71-88d3-ccaf34e286cd', 'Introdução à Vida Devota', 'introducao-a-vida-devota', 'São Francisco de Sales e a santidade no cotidiano.', 'Obra clássica de São Francisco de Sales que mostra como viver a santidade em meio às ocupações diárias.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-040', 42.9, null, 14, null, 'Brochura', 350, 14, 2, 21, false, true, true, 18, now() - interval '9 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('b329e3b6-c79a-4132-8519-f228f3b6c89e', '7e7bbb57-dd16-498b-86b0-90d56e89a68f', 'Vela de 7 Dias Votiva', 'vela-7-dias-votiva', 'Vela em copo de vidro com duração aproximada de 7 dias.', 'Vela votiva de parafina em copo de vidro, com duração aproximada de 7 dias. Para acompanhar suas intenções e novenas.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-041', 16.9, null, 0, 'Cor', 'Parafina e vidro', 450, 7, 14, 7, false, false, true, 230, now() - interval '70 days') on conflict (slug) do nothing;
insert into public.product_variants (id, product_id, name, sku, price_override, stock, sort_order) values ('0a730339-1c92-4e4d-87e3-7163df321581', 'b329e3b6-c79a-4132-8519-f228f3b6c89e', 'Branca', 'DEMO-041-1', null, 40, 0) on conflict do nothing;
insert into public.product_variants (id, product_id, name, sku, price_override, stock, sort_order) values ('08d48d94-73c7-47b0-85d3-8c3a3307780c', 'b329e3b6-c79a-4132-8519-f228f3b6c89e', 'Azul', 'DEMO-041-2', null, 25, 1) on conflict do nothing;
insert into public.product_variants (id, product_id, name, sku, price_override, stock, sort_order) values ('4830143c-f7b9-4e60-85f7-278638bc35a4', 'b329e3b6-c79a-4132-8519-f228f3b6c89e', 'Vermelha', 'DEMO-041-3', null, 20, 2) on conflict do nothing;
insert into public.product_variants (id, product_id, name, sku, price_override, stock, sort_order) values ('a6a1bfe1-d9d6-4ebd-8f18-93c37df07c49', 'b329e3b6-c79a-4132-8519-f228f3b6c89e', 'Amarela', 'DEMO-041-4', null, 15, 3) on conflict do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('dd9141ec-c7a5-4ba8-8c37-f60212e0dac4', '45163ff5-3874-4939-8d25-44cbb9d078bd', 'Castiçal Dourado de Mesa', 'castical-dourado-de-mesa', 'Castiçal em metal dourado para velas de até 5 cm.', 'Castiçal em metal com acabamento dourado, ideal para altares domésticos e oratórios.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-042', 69.9, null, 12, null, 'Metal dourado', 400, 10, 20, 10, false, false, true, 26, now() - interval '71 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('4ea6c109-8362-4915-8704-743bb8c85531', '1e7e21f7-2bba-4273-8cce-298dce0fe83f', 'Quadro Sagrada Família com Moldura', 'quadro-sagrada-familia-moldura', 'Impressão fine art com moldura dourada 30x40 cm.', 'Quadro da Sagrada Família em impressão fine art, moldura dourada e vidro. Tamanho 30x40 cm.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-043', 129.9, null, 8, null, 'Madeira e vidro', 1500, 32, 42, 4, false, false, true, 34, now() - interval '72 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('940b5d29-d99a-430d-809f-2f23bcd54ab1', 'a34d3e19-335f-4125-8d14-155f8e815dc1', 'Oratório de Madeira com Portas', 'oratorio-madeira-com-portas', 'Oratório artesanal com portas e detalhes entalhados.', 'Oratório em madeira com portas, frontão entalhado e espaço interno para imagens de até 20 cm.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-044', 249.9, 219.9, 5, null, 'Madeira', 2200, 25, 40, 15, true, false, true, 27, now() - interval '73 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('46d71a01-f85a-465d-8379-68570da67909', '1283c6cb-5f72-4a17-877f-ae59bd78cb73', 'Placa Decorativa Bênção do Lar', 'placa-decorativa-bencao-do-lar', 'Placa em MDF com a oração de bênção da casa.', 'Placa decorativa em MDF com a oração "Bênção do Lar", impressão de alta definição e furo para fixação.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-045', 59.9, null, 20, null, 'MDF', 500, 20, 30, 1, false, true, true, 15, now() - interval '4 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('075030ae-03c6-4bf2-8169-d5c468092f76', 'd06115b1-2a6e-4ef5-86d6-57af2b4707f9', 'Kit Devocional Santo Antônio', 'kit-devocional-santo-antonio', 'Imagem 12 cm + terço + livreto da trezena.', 'Kit com imagem de Santo Antônio de 12 cm, terço de madeira e livreto com a trezena e orações ao santo. Embalado para presente.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-046', 149.9, 129.9, 10, null, 'Diversos', 700, 18, 12, 22, true, true, true, 48, now() - interval '5 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('628b631f-ccce-4f7b-87e0-ae51393b4457', 'bcf3746d-7bde-4e09-897b-c2c391ef2855', 'Kit Lembrança de Batizado', 'kit-lembranca-batizado', 'Terço infantil, vela de batismo e cartão.', 'Kit com terço infantil, vela de batismo decorada e cartão com oração do Anjo da Guarda, em caixa branca.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-047', 89.9, null, 15, null, 'Diversos', 500, 15, 10, 20, false, false, true, 39, now() - interval '76 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('fefd0a3f-6971-4b93-89cb-ff895e2514e7', '4f8939e5-8555-4991-843a-e40beda3423d', 'Kit Primeira Comunhão', 'kit-primeira-comunhao', 'Terço, livro de orações e vela decorada.', 'Kit para a Primeira Eucaristia com terço branco, livro de orações infantil e vela decorada com cálice e hóstia.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-048', 119.9, null, 12, null, 'Diversos', 650, 18, 10, 24, false, false, true, 44, now() - interval '77 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('ff0e841b-4e38-450f-8a5f-15a918efc0b3', '29845604-1b16-4810-8c4b-eeca97dd37fc', 'Kit Crisma Dons do Espírito Santo', 'kit-crisma-dons-do-espirito-santo', 'Pingente do Divino, terço e cartão dos 7 dons.', 'Kit para o sacramento da Crisma com pingente do Divino Espírito Santo, terço vermelho e cartão com os sete dons.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-049', 109.9, null, 10, null, 'Diversos', 300, 15, 8, 20, false, true, true, 17, now() - interval '8 days') on conflict (slug) do nothing;
insert into public.products (id, category_id, name, slug, short_description, description, sku, price, promo_price, stock, variant_label, material, weight_grams, width_cm, height_cm, length_cm, is_featured, is_new, is_demo, sales_count, created_at) values ('b6c64a50-21cc-4acc-808a-1ea28ae67848', 'e40c5170-a8c5-42a4-81eb-e4ce16596bc8', 'Kit Casamento Bíblia e Terço dos Noivos', 'kit-casamento-biblia-terco-dos-noivos', 'Bíblia branca + terço duplo dos noivos em estojo.', 'Kit para casamento com Bíblia em capa branca, terço dos noivos (dois terços unidos) e estojo com espaço para dedicatória.

Produto de demonstração: substitua pelas informações reais no painel administrativo.', 'DEMO-050', 219.9, null, 6, null, 'Diversos', 1300, 22, 8, 28, false, false, true, 22, now() - interval '79 days') on conflict (slug) do nothing;

-- Reviews (examples)
insert into public.reviews (id, product_id, author_name, rating, title, comment, is_approved, is_demo, created_at) values ('5a50c563-53e7-415f-8e9a-112507dc85db', 'd483d560-0a90-404c-817d-5b3aee43ae48', 'Maria Aparecida S.', 5, 'Linda demais!', 'A imagem é ainda mais bonita pessoalmente. Pintura caprichada e chegou muito bem embalada.', true, true, now() - interval '2 days') on conflict do nothing;
insert into public.reviews (id, product_id, author_name, rating, title, comment, is_approved, is_demo, created_at) values ('5950c3d0-52e7-4fcc-8d9a-0f9206dc8448', 'd483d560-0a90-404c-817d-5b3aee43ae48', 'José Carlos M.', 5, 'Perfeita', 'Comprei para a minha mãe, devota de Santo Antônio. Ela amou!', true, true, now() - interval '5 days') on conflict do nothing;
insert into public.reviews (id, product_id, author_name, rating, title, comment, is_approved, is_demo, created_at) values ('5c50c889-55e7-4485-8c9a-0dff09dc8901', '9fec9086-01bd-4282-8e4b-84b45a17c27e', 'Ana Paula R.', 5, 'Muito bem feita', 'Acabamento impecável e entrega rápida. Recomendo a loja.', true, true, now() - interval '8 days') on conflict do nothing;
insert into public.reviews (id, product_id, author_name, rating, title, comment, is_approved, is_demo, created_at) values ('5b50c6f6-54e7-42f2-8b9a-0c6c08dc876e', '9fec9086-01bd-4282-8e4b-84b45a17c27e', 'Roberto F.', 4, 'Bonita', 'Imagem linda, só achei a coroa um pouco menor do que imaginava.', true, true, now() - interval '11 days') on conflict do nothing;
insert into public.reviews (id, product_id, author_name, rating, title, comment, is_approved, is_demo, created_at) values ('5e50cbaf-4fe7-4b13-8a9a-0ad90bdc8c27', 'fd81f047-8461-4d33-8b6c-c1e95d1280ef', 'Fernanda L.', 5, 'Delicado', 'Terço lindo e resistente. Já comprei outro para presentear.', true, true, now() - interval '14 days') on conflict do nothing;
insert into public.reviews (id, product_id, author_name, rating, title, comment, is_approved, is_demo, created_at) values ('5d50ca1c-4ee7-4980-899a-09460adc8a94', 'c1054dfe-769f-4f52-849f-1568763cbac6', 'Luciana T.', 5, 'Brilha muito', 'As contas de cristal são lindas. Veio num saquinho de veludo muito bonito.', true, true, now() - interval '17 days') on conflict do nothing;
insert into public.reviews (id, product_id, author_name, rating, title, comment, is_approved, is_demo, created_at) values ('6050ced5-51e7-4e39-889a-07b30ddc8f4d', '9034fb64-e2ae-45a0-8173-9e72a2543f4c', 'Pe. Marcos A.', 5, 'Excelente para estudo', 'Comentários sólidos e fiéis ao Magistério. Uso nos encontros de formação.', true, true, now() - interval '20 days') on conflict do nothing;
insert into public.reviews (id, product_id, author_name, rating, title, comment, is_approved, is_demo, created_at) values ('5f50cd42-50e7-4ca6-879a-06200cdc8dba', 'a51cefc0-f675-42f4-8053-c0a646ff90e8', 'Rita de Cássia', 5, 'Tradicional', 'Exatamente como eu procurava. Ótimo preço.', true, true, now() - interval '23 days') on conflict do nothing;
insert into public.reviews (id, product_id, author_name, rating, title, comment, is_approved, is_demo, created_at) values ('6250d1fb-5be7-4df7-869a-1dbdffdc7943', '2ab67884-2756-4ac0-83b4-6bae3384712c', 'Paulo H.', 5, 'Muito bonito', 'Madeira de qualidade, ficou lindo na sala.', true, true, now() - interval '26 days') on conflict do nothing;
insert into public.reviews (id, product_id, author_name, rating, title, comment, is_approved, is_demo, created_at) values ('6150d068-5ae7-4c64-859a-1c2afedc77b0', '075030ae-03c6-4bf2-8169-d5c468092f76', 'Cláudia V.', 5, 'Presente perfeito', 'Dei de presente para minha madrinha e ela se emocionou. Embalagem caprichada!', true, true, now() - interval '29 days') on conflict do nothing;
insert into public.reviews (id, product_id, author_name, rating, title, comment, is_approved, is_demo, created_at) values ('7a2459a0-7dbe-49b4-8b86-9c06452488e8', 'ec3985cf-0502-4ce3-89db-df615e414057', 'Antônio B.', 4, 'Leitura edificante', 'Livro muito bom, linguagem acessível. A trezena no final é um ótimo bônus.', true, true, now() - interval '32 days') on conflict do nothing;
insert into public.reviews (id, product_id, author_name, rating, title, comment, is_approved, is_demo, created_at) values ('7b245b33-7ebe-4b47-8c86-9d9946248a7b', '940b5d29-d99a-430d-809f-2f23bcd54ab1', 'Helena G.', 5, 'Trabalho artesanal lindo', 'O oratório é uma obra de arte. Coube perfeitamente minha imagem de Nossa Senhora.', true, true, now() - interval '35 days') on conflict do nothing;

-- Banners
insert into public.banners (id, title, subtitle, eyebrow, link_url, button_label, position, theme, sort_order) values ('80ec9c0d-08b4-4121-8264-59bba36c5c75', 'Fé que se faz presente em cada detalhe', 'Imagens sacras, terços, bíblias e presentes escolhidos com carinho para a sua devoção.', 'Espaço Católico Santo Antônio', '/produtos', 'Conheça a loja', 'hero', 'navy', 1) on conflict do nothing;
insert into public.banners (id, title, subtitle, eyebrow, link_url, button_label, position, theme, sort_order) values ('7fec9a7a-07b4-4f8e-8164-5828a26c5ae2', 'Terços e Rosários para rezar todos os dias', 'Modelos tradicionais, de cristal e de madeira. Personalize com o nome de quem você ama.', 'Mês do Rosário', '/categoria/tercos-e-rosarios', 'Ver terços', 'hero', 'beige', 2) on conflict do nothing;
insert into public.banners (id, title, subtitle, eyebrow, link_url, button_label, position, theme, sort_order) values ('7eec98e7-06b4-4dfb-8464-5ce1a16c594f', 'Presentes que abençoam', 'Kits para batizado, primeira comunhão, crisma e casamento.', 'Sacramentos', '/categoria/presentes-catolicos', 'Escolher presente', 'hero', 'gold', 3) on conflict do nothing;
insert into public.banners (id, title, subtitle, eyebrow, link_url, button_label, position, theme, sort_order) values ('7dec9754-05b4-4c68-8364-5b4ea06c57bc', '10% OFF na primeira compra', 'Use o cupom BEMVINDO10 no carrinho.', 'Boas-vindas', '/produtos?ofertas=1', 'Aproveitar', 'promo', 'gold', 1) on conflict do nothing;
insert into public.banners (id, title, subtitle, eyebrow, link_url, button_label, position, theme, sort_order) values ('7cec95c1-0cb4-476d-8664-60079f6c5629', 'Frete grátis acima de R$ 299', 'Para compras enviadas por PAC em todo o Brasil.', 'Entrega', '/entrega', 'Saiba mais', 'promo', 'navy', 2) on conflict do nothing;

-- Coupons
insert into public.coupons (code, description, type, value, min_order_value, max_uses_per_user) values ('BEMVINDO10', '10% de desconto na primeira compra', 'percent', 10, 0, 1) on conflict (code) do nothing;
insert into public.coupons (code, description, type, value, min_order_value, max_uses_per_user) values ('FRETEGRATIS', 'Frete grátis em compras acima de R$ 150', 'free_shipping', 0, 150, null) on conflict (code) do nothing;
insert into public.coupons (code, description, type, value, min_order_value, max_uses_per_user) values ('SANTOANTONIO15', '15% de desconto em compras acima de R$ 200', 'percent', 15, 200, 1) on conflict (code) do nothing;

commit;



