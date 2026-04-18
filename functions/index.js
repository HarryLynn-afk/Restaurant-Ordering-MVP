const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

const STATUS_LABELS = {
  unpaid: 'Your order has been accepted! Please proceed to payment 💳',
  paid: 'Payment confirmed ✅',
  preparing: 'Your order is being prepared 👨‍🍳',
  ready: 'Your order is ready for pickup 📦',
  delivered: 'Your order has been delivered 🎉',
  cancelled: 'Your order has been cancelled ❌',
};

exports.notifyStaffOnNewOrder = onDocumentCreated('orders/{orderId}', async (event) => {
  const order = event.data.data();
  console.log('New order received:', order.customerName, order.total);

  const settingsSnap = await db.doc('settings/restaurant').get();
  const staffTokens = settingsSnap.data()?.staffTokens || [];
  console.log('Staff tokens count:', staffTokens.length);

  if (staffTokens.length === 0) {
    console.log('No staff tokens, skipping notification.');
    return;
  }

  try {
    const result = await messaging.sendEachForMulticast({
      notification: {
        title: '🔔 New Order!',
        body: `${order.customerName} — ฿${order.total?.toLocaleString()}`,
      },
      tokens: staffTokens,
    });

    console.log('Send result:', JSON.stringify({
      successCount: result.successCount,
      failureCount: result.failureCount,
      responses: result.responses.map(r => ({ success: r.success, error: r.error?.code || r.error?.message })),
    }));

    const invalidTokens = [];
    result.responses.forEach((resp, idx) => {
      if (!resp.success && (resp.error?.code === 'messaging/registration-token-not-registered' || resp.error?.code === 'messaging/invalid-registration-token')) {
        invalidTokens.push(staffTokens[idx]);
      }
    });
    if (invalidTokens.length > 0) {
      const cleaned = staffTokens.filter((t) => !invalidTokens.includes(t));
      await db.doc('settings/restaurant').update({ staffTokens: cleaned });
      console.log('Cleaned up invalid tokens:', invalidTokens.length);
    }
  } catch (e) {
    console.error('Staff notification error:', e);
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
  } catch (e) {
    console.error('Customer notification error:', e);
  }
});
