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

