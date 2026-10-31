const { onCall } = require('firebase-functions/v2/https');
const { createOrder } = require('./create-order');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

const STATUS_LABELS = {
  unpaid: 'Your order has been accepted! Please proceed to payment.',
  paid: 'Your order is being prepared.',
  preparing: 'Your order is being prepared.',
  ready: 'Your order is ready!',
  out_for_delivery: 'Your order is out for delivery.',
  delivered: 'Your order has been delivered.',
  cancelled: 'Your order has been cancelled.',
};

exports.createOrder = onCall((request) => createOrder(db, request));

exports.notifyStaffOnNewOrder = onDocumentCreated({ document: 'orders/{orderId}', region: 'asia-southeast2' }, async (event) => {
  const order = event.data.data();

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

exports.notifyCustomerOnStatusChange = onDocumentUpdated({ document: 'orders/{orderId}', region: 'asia-southeast2' }, async (event) => {
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
