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
