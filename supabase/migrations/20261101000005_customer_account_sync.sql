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

