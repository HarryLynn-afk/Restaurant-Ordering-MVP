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
    || !items.every(item => item && validText(item.id, 200, true)
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
    const snap = await transaction.get(rateRef);
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
      items: items.map(({ id, name, price, quantity, modifierSummary }) => ({
        id, name, price, quantity, ...(modifierSummary ? { modifierSummary } : {}),
      })),
      total, ownerUid: request.auth.uid, status: 'new',
      paymentSlipUrl: null, paymentSlipPath: null, createdAt: FieldValue.serverTimestamp(),
    });
  }, { maxAttempts: 20 });
  return { orderId: orderRef.id };
};
