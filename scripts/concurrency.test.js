// Prueba de integridad de ventas contra un backend YA corriendo (usa Node 18+, sin dependencias).
//
// ADMIN_EMAIL=admin@ejemplo.com ADMIN_PASSWORD='...' node scripts/concurrency-test.js
//
// Crea un producto y un vendedor de prueba, dispara peticiones en paralelo y al final los borra.
// Úsalo SOLO contra una base de desarrollo.
const crypto = require('crypto');

const API = process.env.API_URL || 'http://localhost:5000/api';
const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Define ADMIN_EMAIL y ADMIN_PASSWORD (un admin existente).');
  process.exit(1);
}

async function call(method, path, { cookie, body, headers } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }), ...headers },
    body: body && JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { /* respuesta sin JSON */ }
  return { status: res.status, data, res };
}

async function login(email, password) {
  const r = await call('POST', '/users/login', { body: { email, password } });
  if (r.status !== 200) throw new Error(`Login fallido para ${email}: ${r.status} ${JSON.stringify(r.data)}`);
  return r.res.headers.get('set-cookie').split(';')[0];
}

const results = [];
function check(name, pass, detail) {
  results.push(pass);
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

async function main() {
  const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const stamp = Date.now();
  const createdSales = [];

  const created = await call('POST', '/products', {
    cookie: admin,
    body: { name: `ZZ-TEST-${stamp}`, category: 'test', price: 10, stock: 5 },
  });
  if (created.status !== 201) throw new Error(`No se pudo crear el producto: ${JSON.stringify(created.data)}`);
  const product = created.data.product;
  const productPayload = { name: product.name, category: 'test', price: 10 };

  const setStock = (stock) =>
    call('PUT', `/products/${product._id}`, { cookie: admin, body: { ...productPayload, stock } });
  const stockNow = async () => (await call('GET', `/products/${product._id}`, { cookie: admin })).data.stock;
  const sell = (quantity, extra = {}) =>
    call('POST', '/sales', {
      cookie: admin,
      headers: { 'Idempotency-Key': crypto.randomUUID(), ...extra },
      body: { products: [{ productId: product._id, quantity }], paymentMethod: 'efectivo' },
    });
  const track = (r) => { if (r.data?.sale?._id) createdSales.push(r.data.sale._id); return r; };

  // A) 20 ventas simultáneas de 1 unidad con stock = 5: solo 5 pueden concretarse
  await setStock(5);
  const a = (await Promise.all(Array.from({ length: 20 }, () => sell(1)))).map(track);
  const aOk = a.filter((r) => r.status === 201).length;
  const aStock = await stockNow();
  check('A. Sin sobreventa: 20 ventas simultáneas con stock 5', aOk === 5 && aStock === 0,
    `ventas creadas=${aOk}, stock final=${aStock}, esperado 5 y 0`);

  // B) El mismo envío repetido 10 veces a la vez (misma Idempotency-Key) descuenta stock una sola vez
  await setStock(10);
  const key = crypto.randomUUID();
  const b = (await Promise.all(Array.from({ length: 10 }, () => sell(1, { 'Idempotency-Key': key })))).map(track);
  const bStock = await stockNow();
  check('B. Un mismo envío repetido descuenta una sola vez', bStock === 9,
    `stock final=${bStock}, esperado 9 (respuestas: ${[...new Set(b.map((r) => r.status))].join(',')})`);

  // C) Dos ventas legítimas idénticas, una tras otra, deben aceptarse
  await setStock(10);
  const c1 = track(await sell(1));
  const c2 = track(await sell(1));
  check('C. Dos ventas idénticas consecutivas son válidas', c1.status === 201 && c2.status === 201,
    `estados=${c1.status},${c2.status}`);

  // D) Un seller no ve las ventas de otros
  const email = `zz-test-${stamp}@example.com`;
  const password = 'Test1234!x';
  await call('POST', '/users/register', { body: { name: 'ZZ Test', email, password } });
  const seller = await login(email, password);
  const list = await call('GET', '/sales', { cookie: seller });
  const one = await call('GET', `/sales/${createdSales[0]}`, { cookie: seller });
  check('D. Un seller no ve ventas ajenas', (list.data?.sales || []).length === 0 && one.status !== 200,
    `ventas visibles=${(list.data?.sales || []).length}, detalle ajeno=${one.status}`);

  // E) Cancelar la misma venta 5 veces a la vez devuelve el stock una sola vez
  await setStock(10);
  const e = track(await sell(3));
  const eAfterSale = await stockNow();
  await Promise.all(Array.from({ length: 5 }, () =>
    call('DELETE', `/sales/${e.data.sale._id}`, { cookie: admin })));
  const eStock = await stockNow();
  check('E. Cancelación concurrente devuelve el stock una sola vez', eAfterSale === 7 && eStock === 10,
    `stock tras vender=${eAfterSale}, tras cancelar=${eStock}, esperado 7 y 10`);

  // F) Editar una venta con cantidad imposible no debe alterar el stock
  await setStock(10);
  const f = track(await sell(2));
  const fBefore = await stockNow();
  const edit = await call('PUT', `/sales/${f.data.sale._id}`, {
    cookie: admin,
    body: { products: [{ productId: product._id, quantity: 50 }], paymentMethod: 'efectivo' },
  });
  const fAfter = await stockNow();
  check('F. Una edición rechazada no altera el stock', edit.status === 400 && fBefore === 8 && fAfter === 8,
    `respuesta=${edit.status}, stock antes=${fBefore}, después=${fAfter}, esperado 8 y 8`);

  // Limpieza
  for (const id of createdSales) await call('DELETE', `/sales/${id}`, { cookie: admin });
  await call('DELETE', `/products/${product._id}`, { cookie: admin });
  const users = await call('GET', '/users/list', { cookie: admin });
  const testUser = (users.data || []).find((u) => u.email === email);
  if (testUser) await call('DELETE', `/users/delete/${testUser._id}`, { cookie: admin });

  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} pruebas pasaron`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});