const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

const STATUS_LABELS = {
  unpaid: 'Your order has been accepted! Please proceed to payment.',
  paid: 'Your order is being prepared.',
  preparing: 'Your order is being prepared.',
  ready: 'Your order is out for delivery.',
  delivered: 'Your order has been delivered.',
  cancelled: 'Your order has been cancelled.',
};

const ORDER_LIMIT_PER_HOUR = 5;

async function checkRateLimit(uid) {
  const rateRef = db.doc(`rateLimits/${uid}`);
  const snap = await rateRef.get();
  const now = Date.now();
  const oneHourMs = 60 * 60 * 1000;

  if (snap.exists) {
    const { count, windowStart } = snap.data();
    const windowStartMs = windowStart?.toMillis() || 0;

    if (now - windowStartMs < oneHourMs) {
      if (count >= ORDER_LIMIT_PER_HOUR) return false;
      await rateRef.update({ count: count + 1 });
    } else {
      await rateRef.set({ count: 1, windowStart: FieldValue.serverTimestamp() });
    }
  } else {
    await rateRef.set({ count: 1, windowStart: FieldValue.serverTimestamp() });
  }
  return true;
}

exports.notifyStaffOnNewOrder = onDocumentCreated('orders/{orderId}', async (event) => {
  const order = event.data.data();

  const allowed = await checkRateLimit(order.ownerUid).catch(() => true);
  if (!allowed) {
    await event.data.ref.update({ status: 'cancelled', cancelReason: 'other' });
    return;
  }

  const settingsSnap = await db.doc('settings/restaurant').get();
  const staffTokens = settingsSnap.data()?.staffTokens || [];

  if (staffTokens.length === 0) return;

  try {
    const result = await messaging.sendEachForMulticast({
      notification: {
        title: 'New Order!',
        body: `${order.customerName} — ฿${order.total?.toLocaleString()}`,
      },
      tokens: staffTokens,
    });

    const invalidTokens = [];
    result.responses.forEach((resp, idx) => {
      if (!resp.success && (
        resp.error?.code === 'messaging/registration-token-not-registered' ||
        resp.error?.code === 'messaging/invalid-registration-token'
      )) {
        invalidTokens.push(staffTokens[idx]);
      }
    });
    if (invalidTokens.length > 0) {
      const cleaned = staffTokens.filter((t) => !invalidTokens.includes(t));
      await db.doc('settings/restaurant').update({ staffTokens: cleaned });
    }
  } catch {
    // Notification failure is non-critical
  }
});

exports.notifyCustomerOnStatusChange = onDocumentUpdated('orders/{orderId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  if (before.status === after.status) return;

  const fcmToken = after.fcmToken;
  if (!fcmToken) return;

  const body = STATUS_LABELS[after.status];
  if (!body) return;

  try {
    await messaging.send({
      notification: { title: 'Order Update', body },
      token: fcmToken,
    });
  } catch {
    // Notification failure is non-critical
  }
});
