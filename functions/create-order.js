const { HttpsError } = require('firebase-functions/v2/https');
const { FieldValue } = require('firebase-admin/firestore');

exports.createOrder = async (db, request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in before ordering.');
  const { form, items, total } = request.data || {};
  const validText = (value, max, required = false) => typeof value === 'string'
    && value.length <= max && (!required || value.trim().length > 0);
  if (!form || !validText(form.customerName, 100, true)
    || !validText(form.phone, 10) || !/^0[689][0-9]{8}$/.test(form.phone)
    || !validText(form.address, 500, true) || !validText(form.notes, 500)
    || !validText(form.lineId, 50)
    || !Array.isArray(items) || items.length === 0 || items.length > 50
    || !items.every(item => item && validText(item.id, 200, true) && !item.id.includes('/')
      && validText(item.name, 200, true) && Number.isFinite(item.price) && item.price >= 0
      && Number.isSafeInteger(item.quantity) && item.quantity > 0 && item.quantity <= 100
      && (item.modifierSummary === undefined || validText(item.modifierSummary, 2000)))
    || !Number.isFinite(total) || total < 0
    || Math.abs(total - items.reduce((sum, item) => sum + item.price * item.quantity, 0)) > 0.001) {
    throw new HttpsError('invalid-argument', 'Invalid order details.');
  }

  const orderRef = db.collection('orders').doc();
  const rateRef = db.doc(`rateLimits/${request.auth.uid}`);
  await db.runTransaction(async transaction => {
    const [snap, settingsSnapshot, ...menuSnapshots] = await transaction.getAll(rateRef,
      db.doc('settings/restaurant'), ...items.map(item => db.doc(`menuItems/${item.id}`)));
    const settings = settingsSnapshot.data() || {};
    const menuChanged = () => { throw new HttpsError('failed-precondition', 'The menu has changed. Review your cart.'); };
    const cents = value => {
      if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(Math.round(value * 100))
        || Math.abs(value - Math.round(value * 100) / 100) > 1e-8) menuChanged();
      return Math.round(value * 100);
    };
    const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    const pricedItems = items.map((item, index) => {
      const menu = menuSnapshots[index].data();
      if (!menu || menu.soldOut || settings.storeClosed || settings.closedCategories?.includes(menu.category)) menuChanged();
      const groups = settings.categoryModifiers?.[menu.category] || [];
      const selections = item.selections ?? {};
      if (!isObject(selections) || Object.keys(selections).some(id => !groups.some(group => group.id === id))) menuChanged();
      let priceCents = cents(menu.price);
      const descriptions = [];
      for (const group of groups) {
        const selection = selections[group.id];
        if (group.type === 'required') {
          const option = group.options.find(option => option.id === selection);
          if (!option) menuChanged();
          descriptions.push(option.name);
        } else if (group.type === 'extras') {
          if (selection === undefined) continue;
          if (!isObject(selection)) menuChanged();
          for (const [id, selected] of Object.entries(selection)) {
            if (typeof selected !== 'boolean' || !group.options.some(option => option.id === id)) menuChanged();
          }
          for (const option of group.options) {
            if (selection[option.id] === true) {
              priceCents += cents(option.price ?? 0);
              descriptions.push(option.name);
            }
          }
        } else menuChanged();
      }
      if (!Number.isSafeInteger(priceCents) || cents(item.price) !== priceCents) menuChanged();
      const modifierSummary = descriptions.join(', ');
      return { id: item.id, name: menu.name, price: priceCents / 100, quantity: item.quantity,
        ...(modifierSummary ? { modifierSummary } : {}) };
    });
    const totalCents = pricedItems.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0);
    if (!Number.isSafeInteger(totalCents) || Math.round(total * 100) !== totalCents) {
      throw new HttpsError('failed-precondition', 'The menu has changed. Review your cart.');
    }
    const rate = snap.data();
    const withinWindow = rate && Date.now() - rate.windowStart.toMillis() < 60 * 60 * 1000;
    if (withinWindow && rate.count >= 5) {
      throw new HttpsError('resource-exhausted', 'You can place up to 5 orders per hour.');
    }
    transaction.set(rateRef, {
      count: withinWindow ? rate.count + 1 : 1,
      windowStart: withinWindow ? rate.windowStart : FieldValue.serverTimestamp(),
    });
    transaction.create(orderRef, {
      customerName: form.customerName, phone: form.phone, address: form.address,
      notes: form.notes, lineId: form.lineId,
      items: pricedItems, total: totalCents / 100, ownerUid: request.auth.uid, status: 'new',
      paymentSlipUrl: null, paymentSlipPath: null, createdAt: FieldValue.serverTimestamp(),
    });
  }, { maxAttempts: 20 });
  return { orderId: orderRef.id };
};
