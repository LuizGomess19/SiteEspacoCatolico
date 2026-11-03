/**
 * Database integration tests — runs every migration + seed inside PGlite
 * (real PostgreSQL compiled to WASM) with a minimal Supabase shim (auth schema,
 * API roles, storage tables) and verifies RLS policies and business rules.
 *
 * Usage: npm run test:db
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';

const root = fileURLToPath(new URL('..', import.meta.url));
const db = new PGlite({ extensions: { pgcrypto, unaccent } });

let passed = 0;
let failed = 0;
const results: string[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    results.push(`  ✔ ${name}`);
  } catch (err) {
    failed++;
    results.push(`  ✘ ${name}\n      ${(err as Error).message}`);
  } finally {
    await asSuperuser();
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function expectError(fn: () => Promise<unknown>, pattern: RegExp) {
  try {
    await fn();
  } catch (err) {
    const message = (err as Error).message;
    assert(pattern.test(message), `Unexpected error: ${message}`);
    return;
  }
  throw new Error(`Expected error matching ${pattern}`);
}

async function asSuperuser() {
  await db.exec(`reset role; reset session authorization; select set_config('request.jwt.claims', '', false);`);
}

/** Simulates a PostgREST request: session user = authenticator, role from JWT. */
async function as(role: 'anon' | 'authenticated' | 'service_role', sub: string | null = null) {
  const claims = JSON.stringify(sub ? { sub, role } : { role });
  await db.exec(`reset role; reset session authorization; set session authorization authenticator; set role ${role};`);
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [claims]);
}

const SHIM = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create role authenticator login noinherit;
  grant anon, authenticated, service_role to authenticator;

  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb,
    created_at timestamptz default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated, service_role;
  grant all on storage.objects to anon, authenticated, service_role;

  -- Mimic Supabase default privileges in the public schema
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const ADMIN = '33333333-3333-4333-8333-333333333333';

const address = {
  recipient_name: 'Maria Teste', cep: '01310100', street: 'Av. Paulista', number: '1000',
  complement: null, district: 'Bela Vista', city: 'São Paulo', state: 'SP', phone: '11999999999',
};

async function main() {
  console.log('Setting up PGlite with Supabase shim...');
  await db.exec(SHIM);

  const migrationsDir = `${root}supabase/migrations`;
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(`${migrationsDir}/${file}`, 'utf8'));
    console.log(`  applied ${file}`);
  }
  await db.exec(readFileSync(`${root}supabase/seed.sql`, 'utf8'));
  console.log('  applied seed.sql\n');

  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${A}', 'a@test.com', '{"full_name":"Cliente A","accepted_terms":true}'),
      ('${B}', 'b@test.com', '{"full_name":"Cliente B"}'),
      ('${ADMIN}', 'admin@test.com', '{"full_name":"Admin"}');
    update public.profiles set role = 'admin' where id = '${ADMIN}';
  `);

  const productId = async (slug: string) =>
    (await db.query<{ id: string }>(`select id from public.products where slug = $1`, [slug])).rows[0].id;
  const variantId = async (slug: string, name: string) =>
    (await db.query<{ id: string }>(
      `select v.id from public.product_variants v join public.products p on p.id = v.product_id where p.slug = $1 and v.name = $2`,
      [slug, name],
    )).rows[0].id;

  const terco = await productId('terco-tradicional-contas-pretas');
  const santoAntonio = await productId('imagem-santo-antonio-com-menino-jesus-20cm');
  const aparecida = await productId('imagem-nossa-senhora-aparecida-resina');
  const aparecida20 = await variantId('imagem-nossa-senhora-aparecida-resina', '20 cm');

  console.log('Running tests:');

  await test('profile is created automatically on signup (trigger)', async () => {
    const r = await db.query<{ full_name: string; accepted_terms_at: string | null }>(
      `select full_name, accepted_terms_at from public.profiles where id = $1`, [A]);
    assert(r.rows[0]?.full_name === 'Cliente A', 'profile not created');
    assert(r.rows[0].accepted_terms_at !== null, 'terms acceptance not recorded');
  });

  await test('anon can read the public catalog view with effective prices', async () => {
    await as('anon');
    const r = await db.query<{ count: number }>(`select count(*)::int as count from public.catalog_products`);
    assert(r.rows[0].count >= 40, `expected demo products, got ${r.rows[0].count}`);
    const ap = await db.query<{ effective_price: string; on_sale: boolean; available_stock: number }>(
      `select effective_price, on_sale, available_stock from public.catalog_products where id = $1`, [aparecida]);
    assert(Number(ap.rows[0].effective_price) === 159.9 && ap.rows[0].on_sale, 'promo price not applied');
    assert(ap.rows[0].available_stock === 24, `variant stock sum expected 24, got ${ap.rows[0].available_stock}`);
  });

  await test('full-text search finds products ignoring accents', async () => {
    await as('anon');
    const r = await db.query<{ name: string }>(
      `select name from public.catalog_products where search_vector @@ websearch_to_tsquery('portuguese', public.immutable_unaccent('terco cristal'))`);
    assert(r.rows.some((x) => x.name.includes('Cristal')), 'search did not match "terco cristal"');
  });

  await test('anon cannot list coupons, orders or profiles', async () => {
    await as('anon');
    const c = await db.query(`select * from public.coupons`);
    assert(c.rows.length === 0, 'coupons leaked to anon');
    await expectError(() => db.query(`select * from public.orders`), /permission denied|denied/i).catch(async () => {
      const o = await db.query(`select * from public.orders`);
      assert(o.rows.length === 0, 'orders leaked');
    });
  });

  await test('anon cannot modify the catalog', async () => {
    await as('anon');
    await expectError(() => db.query(`update public.products set price = 1 where id = $1`, [terco]).then((r) => {
      if ((r.affectedRows ?? 0) === 0) throw new Error('blocked by RLS');
    }), /blocked by RLS|permission denied|row-level security/i);
  });

  await test('customer cannot change own role (column privileges)', async () => {
    await as('authenticated', A);
    await expectError(() => db.query(`update public.profiles set role = 'admin' where id = $1`, [A]), /permission denied/i);
    const ok = await db.query(`update public.profiles set full_name = 'Cliente A Atualizado' where id = $1`, [A]);
    assert(ok.affectedRows === 1, 'customer could not update own name');
  });

  await test('customer manages only own addresses', async () => {
    await as('authenticated', A);
    await db.query(
      `insert into public.addresses (user_id, recipient_name, cep, street, number, district, city, state) values ($1, 'Maria', '01310100', 'Av. Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP')`, [A]);
    await expectError(() => db.query(
      `insert into public.addresses (user_id, recipient_name, cep, street, number, district, city, state) values ($1, 'X', '01310100', 'Rua', '1', 'B', 'C', 'SP')`, [B]),
      /row-level security/i);
    await as('authenticated', B);
    const r = await db.query(`select * from public.addresses`);
    assert(r.rows.length === 0, 'B can see A addresses');
  });

  await test('first address becomes default automatically', async () => {
    const r = await db.query<{ is_default: boolean }>(`select is_default from public.addresses where user_id = $1`, [A]);
    assert(r.rows[0].is_default === true, 'address not default');
  });

  await test('customer persists cart items (own cart only)', async () => {
    await as('authenticated', A);
    const cart = await db.query<{ id: string }>(`insert into public.carts (user_id) values ($1) returning id`, [A]);
    await db.query(`insert into public.cart_items (cart_id, product_id, quantity) values ($1, $2, 2)`, [cart.rows[0].id, terco]);
    await as('authenticated', B);
    const r = await db.query(`select * from public.cart_items`);
    assert(r.rows.length === 0, 'B can see A cart');
  });

  await test('customer cannot call create_order directly', async () => {
    await as('authenticated', A);
    await expectError(() => db.query(`select * from public.create_order($1, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb)`, [A]),
      /permission denied/i);
  });

  let orderId = '';
  await test('server creates order: prices from DB, stock reserved, coupon applied, cart cleared', async () => {
    const before = (await db.query<{ stock: number }>(`select stock from public.products where id = $1`, [terco])).rows[0].stock;
    const vBefore = (await db.query<{ stock: number }>(`select stock from public.product_variants where id = $1`, [aparecida20])).rows[0].stock;
    await as('service_role');
    const r = await db.query<{ order_id: string; order_number: string; total: string }>(
      `select * from public.create_order($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, 'bemvindo10', 'Teste')`,
      [
        A,
        JSON.stringify([
          { product_id: terco, variant_id: null, quantity: 2, unit_price: 0.01 },
          { product_id: aparecida, variant_id: aparecida20, quantity: 1 },
        ]),
        JSON.stringify({ name: 'Cliente A', email: 'a@test.com', cpf: '52998224725', phone: '11999999999' }),
        JSON.stringify(address),
        JSON.stringify({ method: 'pac', name: 'PAC', cost: 20, days: 7 }),
      ],
    );
    orderId = r.rows[0].order_id;
    // subtotal = 2 * 24.90 + 129.90 = 179.70 ; discount 10% = 17.97 ; total = 161.73 + 20 = 181.73
    assert(Number(r.rows[0].total) === 181.73, `unexpected total ${r.rows[0].total}`);
    assert(/^SA-\d+$/.test(r.rows[0].order_number), 'invalid order number');
    await asSuperuser();
    const after = (await db.query<{ stock: number }>(`select stock from public.products where id = $1`, [terco])).rows[0].stock;
    const vAfter = (await db.query<{ stock: number }>(`select stock from public.product_variants where id = $1`, [aparecida20])).rows[0].stock;
    assert(after === before - 2, 'product stock not reserved');
    assert(vAfter === vBefore - 1, 'variant stock not reserved');
    const cart = await db.query(`select ci.* from public.cart_items ci join public.carts c on c.id = ci.cart_id where c.user_id = $1`, [A]);
    assert(cart.rows.length === 0, 'cart not cleared');
    const coupon = await db.query<{ used_count: number }>(`select used_count from public.coupons where code = 'BEMVINDO10'`);
    assert(coupon.rows[0].used_count === 1, 'coupon usage not incremented');
  });

  await test('order requires variant selection when product has variants', async () => {
    await as('service_role');
    await expectError(() => db.query(`select * from public.create_order($1, $2::jsonb, '{"name":"A","email":"a@test.com"}'::jsonb, $3::jsonb, '{"method":"pac","name":"PAC","cost":0}'::jsonb)`,
      [A, JSON.stringify([{ product_id: aparecida, quantity: 1 }]), JSON.stringify(address)]), /Selecione uma opção/);
  });

  await test('order is rejected when stock is insufficient (and nothing is reserved)', async () => {
    const before = (await db.query<{ stock: number }>(`select stock from public.products where id = $1`, [terco])).rows[0].stock;
    await as('service_role');
    await expectError(() => db.query(`select * from public.create_order($1, $2::jsonb, '{"name":"A","email":"a@test.com"}'::jsonb, $3::jsonb, '{"method":"pac","name":"PAC","cost":0}'::jsonb)`,
      [A, JSON.stringify([{ product_id: santoAntonio, quantity: 1 }, { product_id: terco, quantity: 99 }]), JSON.stringify(address)]), /OUT_OF_STOCK/);
    await asSuperuser();
    const after = (await db.query<{ stock: number }>(`select stock from public.products where id = $1`, [terco])).rows[0].stock;
    const sa = (await db.query<{ stock: number }>(`select stock from public.products where id = $1`, [santoAntonio])).rows[0].stock;
    assert(after === before && sa === 18, 'partial stock reservation leaked');
  });

  await test('coupon single-use per customer is enforced', async () => {
    await as('authenticated', A);
    await expectError(() => db.query(`select * from public.preview_coupon('BEMVINDO10', 100)`), /já utilizou/);
    await as('authenticated', B);
    const r = await db.query<{ discount: string }>(`select * from public.preview_coupon('bemvindo10', 100)`);
    assert(Number(r.rows[0].discount) === 10, 'preview discount wrong');
    await expectError(() => db.query(`select * from public.preview_coupon('SANTOANTONIO15', 100)`), /Pedido mínimo/);
  });

  await test('customers see only their own orders and items', async () => {
    await as('authenticated', A);
    const mine = await db.query(`select * from public.orders`);
    const items = await db.query(`select * from public.order_items`);
    assert(mine.rows.length === 1 && items.rows.length === 2, 'A cannot see own order');
    await as('authenticated', B);
    const other = await db.query(`select * from public.orders`);
    const otherItems = await db.query(`select * from public.order_items`);
    assert(other.rows.length === 0 && otherItems.rows.length === 0, 'B can see A order');
  });

  await test('customer cannot update order status or totals', async () => {
    await as('authenticated', A);
    const r = await db.query(`update public.orders set total = 0 where id = $1`, [orderId]);
    assert((r.affectedRows ?? 0) === 0, 'customer updated order');
    await expectError(() => db.query(`select public.set_order_status($1, 'paid')`, [orderId]), /FORBIDDEN/);
  });

  await test('payment webhook update (service role) approves order and counts sales', async () => {
    const salesBefore = (await db.query<{ sales_count: number }>(`select sales_count from public.products where id = $1`, [terco])).rows[0].sales_count;
    await as('authenticated', A);
    await expectError(() => db.query(`select public.apply_payment_update($1, 'mercadopago', '123', 'approved', null, 'pix', 'pix', 1, 181.73, 175, 'a@test.com', now())`, [orderId]), /permission denied/i);
    await as('service_role');
    const res = await db.query<{ apply_payment_update: string }>(
      `select public.apply_payment_update($1, 'mercadopago', '123', 'approved', 'accredited', 'pix', 'pix', 1, 181.73, 175, 'a@test.com', now())`, [orderId]);
    assert(res.rows[0].apply_payment_update === 'paid', `unexpected result ${res.rows[0].apply_payment_update}`);
    // idempotent: same notification again
    await db.query(`select public.apply_payment_update($1, 'mercadopago', '123', 'approved', 'accredited', 'pix', 'pix', 1, 181.73, 175, 'a@test.com', now())`, [orderId]);
    await asSuperuser();
    const o = await db.query<{ status: string; paid_at: string | null }>(`select status, paid_at from public.orders where id = $1`, [orderId]);
    assert(o.rows[0].status === 'paid' && o.rows[0].paid_at, 'order not marked as paid');
    const p = await db.query(`select * from public.payments where order_id = $1`, [orderId]);
    assert(p.rows.length === 1, 'payment not recorded exactly once');
    const salesAfter = (await db.query<{ sales_count: number }>(`select sales_count from public.products where id = $1`, [terco])).rows[0].sales_count;
    assert(salesAfter === salesBefore + 2, 'sales_count not incremented');
  });

  await test('underpaid notification does not approve the order', async () => {
    await as('service_role');
    const r = await db.query<{ order_id: string }>(
      `select * from public.create_order($1, $2::jsonb, '{"name":"B","email":"b@test.com"}'::jsonb, $3::jsonb, '{"method":"pac","name":"PAC","cost":10}'::jsonb)`,
      [B, JSON.stringify([{ product_id: santoAntonio, quantity: 1 }]), JSON.stringify(address)]);
    const res = await db.query<{ apply_payment_update: string }>(
      `select public.apply_payment_update($1, 'mercadopago', '999', 'approved', null, 'pix', 'pix', 1, 1.00, 1, 'b@test.com', now())`, [r.rows[0].order_id]);
    assert(res.rows[0].apply_payment_update === 'amount_mismatch', 'underpayment accepted');
    // customer cancels -> stock restored
    await as('authenticated', B);
    await db.query(`select public.customer_cancel_order($1)`, [r.rows[0].order_id]);
    await asSuperuser();
    const sa = (await db.query<{ stock: number }>(`select stock from public.products where id = $1`, [santoAntonio])).rows[0].stock;
    assert(sa === 18, `stock not restored after cancel (${sa})`);
  });

  await test('admin updates status with tracking code and history', async () => {
    await as('authenticated', ADMIN);
    await db.query(`select public.set_order_status($1, 'preparing', 'Separando itens')`, [orderId]);
    await db.query(`select public.set_order_status($1, 'shipped', 'Postado', 'BR123456789BR', null)`, [orderId]);
    const o = await db.query<{ status: string; tracking_code: string; shipped_at: string }>(
      `select status, tracking_code, shipped_at from public.orders where id = $1`, [orderId]);
    assert(o.rows[0].status === 'shipped' && o.rows[0].tracking_code === 'BR123456789BR' && o.rows[0].shipped_at, 'status not updated');
    await expectError(() => db.query(`select public.set_order_status($1, 'cancelled')`, [orderId]), /já enviados/);
    await as('authenticated', A);
    const h = await db.query(`select * from public.order_status_history where order_id = $1`, [orderId]);
    assert(h.rows.length >= 4, 'history not visible to owner');
  });

  await test('reviews: customer submissions are moderated; approval updates rating', async () => {
    await as('authenticated', A);
    await db.query(`insert into public.reviews (product_id, user_id, author_name, rating, comment, is_approved) values ($1, $2, 'Cliente A', 4, 'Muito bom', true)`, [terco, A]);
    await as('anon');
    const hidden = await db.query(`select * from public.reviews where product_id = $1`, [terco]);
    assert(hidden.rows.length === 0, 'unapproved review visible');
    await as('authenticated', ADMIN);
    await db.query(`update public.reviews set is_approved = true where product_id = $1`, [terco]);
    await asSuperuser();
    const r = await db.query<{ verified_purchase: boolean }>(`select verified_purchase from public.reviews where product_id = $1`, [terco]);
    assert(r.rows[0].verified_purchase === true, 'verified purchase not detected');
    const p = await db.query<{ rating_avg: string; rating_count: number }>(`select rating_avg, rating_count from public.products where id = $1`, [terco]);
    assert(Number(p.rows[0].rating_avg) === 4 && p.rows[0].rating_count === 1, 'rating not refreshed');
  });

  await test('admin manages catalog; customer cannot', async () => {
    await as('authenticated', ADMIN);
    const r = await db.query(`update public.products set price = 27.90 where id = $1`, [terco]);
    assert(r.affectedRows === 1, 'admin could not update product');
    await db.query(`insert into public.categories (name, slug) values ('Nova Categoria', 'nova-categoria')`);
    await as('authenticated', A);
    const r2 = await db.query(`update public.products set price = 1 where id = $1`, [terco]);
    assert((r2.affectedRows ?? 0) === 0, 'customer updated product');
    await expectError(() => db.query(`insert into public.categories (name, slug) values ('X', 'x-cat')`), /row-level security/i);
  });

  await test('admin dashboard and reports are admin-only', async () => {
    await as('authenticated', ADMIN);
    const d = await db.query<{ admin_dashboard: { revenue: number; paid_orders: number } }>(
      `select public.admin_dashboard(now() - interval '30 days', now() + interval '1 day')`);
    assert(Number(d.rows[0].admin_dashboard.revenue) === 181.73, `revenue ${d.rows[0].admin_dashboard.revenue}`);
    const rep = await db.query(`select public.admin_sales_report(now() - interval '30 days', now() + interval '1 day')`);
    assert(rep.rows.length === 1, 'report failed');
    await as('authenticated', A);
    await expectError(() => db.query(`select public.admin_dashboard(now() - interval '30 days', now())`), /FORBIDDEN/);
  });

  await test('storage uploads are admin-only', async () => {
    await as('authenticated', A);
    await expectError(() => db.query(`insert into storage.objects (bucket_id, name) values ('store-media', 'products/x.jpg')`), /row-level security/i);
    await as('authenticated', ADMIN);
    await db.query(`insert into storage.objects (bucket_id, name) values ('store-media', 'products/x.jpg')`);
  });

  await test('LGPD export returns only own data', async () => {
    await as('authenticated', A);
    const r = await db.query<{ export_my_data: { profile: { id: string }; orders: unknown[] } }>(`select public.export_my_data()`);
    assert(r.rows[0].export_my_data.profile.id === A, 'wrong profile exported');
    assert(r.rows[0].export_my_data.orders.length === 1, 'orders not exported');
  });

  await test('expired unpaid orders are cancelled and stock released', async () => {
    await as('service_role');
    const r = await db.query<{ order_id: string }>(
      `select * from public.create_order($1, $2::jsonb, '{"name":"B","email":"b@test.com"}'::jsonb, $3::jsonb, '{"method":"pickup","name":"Retirada","cost":0}'::jsonb)`,
      [B, JSON.stringify([{ product_id: santoAntonio, quantity: 3 }]), JSON.stringify(address)]);
    await asSuperuser();
    await db.query(`update public.orders set expires_at = now() - interval '1 hour' where id = $1`, [r.rows[0].order_id]);
    const n = await db.query<{ cancel_expired_orders: number }>(`select public.cancel_expired_orders()`);
    assert(n.rows[0].cancel_expired_orders === 1, 'expired order not cancelled');
    const sa = (await db.query<{ stock: number }>(`select stock from public.products where id = $1`, [santoAntonio])).rows[0].stock;
    assert(sa === 18, 'stock not released');
  });

  console.log(results.join('\n'));
  console.log(`\n${passed} passed, ${failed} failed`);
  await db.close();
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

