const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { createOrder } = require('./create-order');

assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Run with npm run test:orders; a local emulator is required.');
initializeApp({ projectId: 'demo-restaurant-rate-limit' });
const db = getFirestore();
before(() => db.doc('menuItems/demo').set({ name: 'Rice', price: 60, category: 'Rice', soldOut: false }));
const payload = {
  form: { customerName: 'Demo', phone: '0812345678', address: 'Demo address', notes: '', lineId: '' },
  items: [{ id: 'demo', name: 'Rice', price: 60, quantity: 1 }],
  total: 60,
};

test('concurrent submissions save exactly five orders and reject the rest', async () => {
  const uid = `concurrent-${Date.now()}`;
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => createOrder(db, { auth: { uid }, data: payload })));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 5);
  const rejected = results.filter(r => r.status === 'rejected');
  assert.equal(rejected.length, 3);
  rejected.forEach(r => assert.equal(r.reason.code, 'resource-exhausted'));
  const orders = await db.collection('orders').where('ownerUid', '==', uid).get();
  assert.equal(orders.size, 5);
  orders.docs.forEach(doc => {
    assert.equal(doc.data().status, 'new');
    assert.equal(doc.data().paymentSlipPath, null);
    assert.equal(doc.data().total, 60);
  });
  assert.equal((await db.doc(`rateLimits/${uid}`).get()).data().count, 5);
});

test('unauthenticated and malformed orders never reach the database', async () => {
  await assert.rejects(createOrder(null, { data: payload }), { code: 'unauthenticated' });
  for (const data of [null, { ...payload, total: 1 }, { ...payload, items: [] },
    { ...payload, form: { ...payload.form, phone: 'invalid' } },
    { ...payload, items: [{ ...payload.items[0], quantity: -1 }] }]) {
    await assert.rejects(createOrder(null, { auth: { uid: 'invalid' }, data }), { code: 'invalid-argument' });
  }
});

test('expired windows reset and server-owned fields cannot be supplied by the client', async () => {
  const { Timestamp } = require('firebase-admin/firestore');
  const uid = `expired-${Date.now()}`;
  await db.doc(`rateLimits/${uid}`).set({ count: 5, windowStart: Timestamp.fromMillis(Date.now() - 3600001) });
  const result = await createOrder(db, { auth: { uid }, data: { ...payload,
    form: { ...payload.form, ownerUid: 'stranger', status: 'delivered' } } });
  const order = (await db.doc(`orders/${result.orderId}`).get()).data();
  assert.equal(order.ownerUid, uid);
  assert.equal(order.status, 'new');
  assert.equal((await db.doc(`rateLimits/${uid}`).get()).data().count, 1);
});

test('database failures reject the request', async () => {
  const unavailable = { collection: () => ({ doc: () => ({}) }), doc: () => ({}),
    runTransaction: async () => { throw new Error('unavailable'); } };
  await assert.rejects(createOrder(unavailable, { auth: { uid: 'offline' }, data: payload }), /unavailable/);
});

test('Firestore rules prevent bypassing the callable with a direct write', async () => {
  const { initializeTestEnvironment, assertFails } = require('@firebase/rules-unit-testing');
  const { doc, setDoc } = require('firebase/firestore');
  const { readFileSync } = require('node:fs');
  const env = await initializeTestEnvironment({ projectId: 'demo-restaurant-rate-limit',
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } });
  try {
    const client = env.authenticatedContext('bypass', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
    await assertFails(setDoc(doc(client, 'orders', 'bypass'), { ...payload.form, items: payload.items,
      total: 60, status: 'new', ownerUid: 'bypass', paymentSlipUrl: null, paymentSlipPath: null, createdAt: new Date() }));
    await assertFails(setDoc(doc(client, 'rateLimits', 'bypass'), { count: 0 }));
  } finally { await env.cleanup(); }
});

test('a failed order write rolls back the counter', async () => {
  const uid = `rollback-${Date.now()}`;
  const existingOrder = db.collection('orders').doc();
  await existingOrder.set({ existing: true });
  const collisionDb = { doc: path => db.doc(path),
    collection: () => ({ doc: () => existingOrder }),
    runTransaction: (...args) => db.runTransaction(...args) };
  await assert.rejects(createOrder(collisionDb, { auth: { uid }, data: payload }));
  assert.equal((await db.doc(`rateLimits/${uid}`).get()).exists, false);
  assert.deepEqual((await existingOrder.get()).data(), { existing: true });
});

test('customers can read only their own orders and cannot attach another customer’s slip', async () => {
  const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
  const { doc, setDoc, getDoc, updateDoc } = require('firebase/firestore');
  const { readFileSync } = require('node:fs');
  const env = await initializeTestEnvironment({ projectId: 'demo-restaurant-rate-limit',
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } });
  try {
    await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'orders', 'owned'), {
      ownerUid: 'owner', status: 'unpaid', paymentSlipPath: null,
    }));
    const owner = env.authenticatedContext('owner', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
    const stranger = env.authenticatedContext('stranger', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
    await assertSucceeds(getDoc(doc(owner, 'orders', 'owned')));
    await assertFails(getDoc(doc(stranger, 'orders', 'owned')));
    await assertFails(updateDoc(doc(stranger, 'orders', 'owned'), { paymentSlipPath: 'slips/stranger/receipt.jpg' }));
    await assertFails(updateDoc(doc(owner, 'orders', 'owned'), { paymentSlipPath: 'slips/stranger/receipt.jpg' }));
    await assertSucceeds(updateDoc(doc(owner, 'orders', 'owned'), { paymentSlipPath: 'slips/owner/receipt.jpg' }));
    await assertSucceeds(updateDoc(doc(owner, 'orders', 'owned'), { fcmToken: 'demo-token' }));
    await assertFails(updateDoc(doc(owner, 'orders', 'owned'), { status: 'delivered' }));
  } finally { await env.cleanup(); }
});

test('email sign-in alone grants no staff access; the staff claim does', async () => {
  const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
  const { doc, setDoc, getDoc, updateDoc } = require('firebase/firestore');
  const { readFileSync } = require('node:fs');
  const env = await initializeTestEnvironment({ projectId: 'demo-restaurant-rate-limit',
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } });
  try {
    await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'orders', 'staff-only'), {
      ownerUid: 'customer', status: 'new', paymentSlipPath: null,
    }));
    const ordinary = env.authenticatedContext('ordinary', { firebase: { sign_in_provider: 'password' } }).firestore();
    const staff = env.authenticatedContext('staff', { staff: true, firebase: { sign_in_provider: 'password' } }).firestore();
    await assertFails(getDoc(doc(ordinary, 'orders', 'staff-only')));
    await assertFails(setDoc(doc(ordinary, 'menuItems', 'forbidden'), { name: 'changed' }));
    await assertFails(setDoc(doc(ordinary, 'settings', 'restaurant'), { staffTokens: ['attacker'] }));
    await assertSucceeds(getDoc(doc(staff, 'orders', 'staff-only')));
    await assertSucceeds(updateDoc(doc(staff, 'orders', 'staff-only'), { status: 'unpaid' }));
    await assertSucceeds(setDoc(doc(staff, 'menuItems', 'allowed'), { name: 'Rice' }));
  } finally { await env.cleanup(); }
});


test('a client cannot lower the menu price even when its total matches', async () => {
  const uid = `price-${Date.now()}`;
  await assert.rejects(createOrder(db, { auth: { uid }, data: {
    ...payload, items: [{ ...payload.items[0], price: 1 }], total: 1,
  } }), { code: 'failed-precondition' });
  assert.equal((await db.collection('orders').where('ownerUid', '==', uid).get()).size, 0);
  assert.equal((await db.doc(`rateLimits/${uid}`).get()).exists, false);
});

test('prices required choices and extras from the menu and ignores client descriptions', async () => {
  await db.doc('menuItems/noodles').set({ name: 'Noodles', category: 'Noodles', price: 40.10 });
  await db.doc('settings/restaurant').set({ categoryModifiers: { Noodles: [
    { id: 'size', type: 'required', options: [{ id: 'regular', name: 'Regular' }] },
    { id: 'extras', type: 'extras', options: [{ id: 'egg', name: 'Egg', price: 10.20 }] },
  ] } });
  const item = { id: 'noodles', name: 'Fake name', price: 50.30, quantity: 3,
    modifierSummary: 'Fake summary', selections: { size: 'regular', extras: { egg: true } } };
  const { orderId } = await createOrder(db, { auth: { uid: `extras-${Date.now()}` }, data: {
    ...payload, items: [item], total: 150.90,
  } });
  const order = (await db.doc(`orders/${orderId}`).get()).data();
  assert.equal(order.total, 150.90);
  assert.deepEqual(order.items, [{ id: 'noodles', name: 'Noodles', price: 50.30, quantity: 3,
    modifierSummary: 'Regular, Egg' }]);
  for (const selections of [{}, { size: 'unknown' }, { size: 'regular', extras: { freeEgg: true } },
    { size: 'regular', extras: ['egg'] }, { size: 'regular', extras: { egg: 'true' } }]) {
    await assert.rejects(createOrder(db, { auth: { uid: 'bad-extras' }, data: {
      ...payload, items: [{ ...item, selections }], total: 150.90,
    } }), { code: 'failed-precondition' });
  }
});

test('deleted items, sold-out items, closed stores and closed categories cannot create orders', async () => {
  const uid = `availability-${Date.now()}`;
  const request = { auth: { uid }, data: { ...payload, items: [{ ...payload.items[0], id: 'availability' }] } };
  for (const [menu, settings] of [
    [null, {}],
    [{ name: 'Rice', price: 60, category: 'Rice', soldOut: true }, {}],
    [{ name: 'Rice', price: 60, category: 'Rice' }, { storeClosed: true }],
    [{ name: 'Rice', price: 60, category: 'Rice' }, { closedCategories: ['Rice'] }],
  ]) {
    if (menu) await db.doc('menuItems/availability').set(menu);
    await db.doc('settings/restaurant').set(settings);
    await assert.rejects(createOrder(db, request), { code: 'failed-precondition' });
  }
  assert.equal((await db.collection('orders').where('ownerUid', '==', uid).get()).size, 0);
  assert.equal((await db.doc(`rateLimits/${uid}`).get()).exists, false);
  await db.doc('settings/restaurant').set({});
});

test('customers can attach a receipt only once and only while payment is due', async () => {
  const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
  const { doc, setDoc, updateDoc } = require('firebase/firestore');
  const { readFileSync } = require('node:fs');
  const env = await initializeTestEnvironment({ projectId: 'demo-restaurant-rate-limit',
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } });
  try {
    const owner = env.authenticatedContext('payer', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
    for (const status of ['new', 'unpaid', 'preparing', 'cancelled', 'delivered']) {
      await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'orders', `payment-${status}`), {
        ownerUid: 'payer', status, paymentSlipPath: null,
      }));
      const write = updateDoc(doc(owner, 'orders', `payment-${status}`), { paymentSlipPath: 'slips/payer/receipt.jpg' });
      if (status === 'unpaid') {
        await assertSucceeds(write);
        await assertFails(updateDoc(doc(owner, 'orders', `payment-${status}`), { paymentSlipPath: 'slips/payer/replacement.jpg' }));
      } else await assertFails(write);
    }
  } finally { await env.cleanup(); }
});
