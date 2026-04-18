import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, requestNotificationToken, onForegroundMessage } from '../firebase';

const STATUSES = [
  { key: 'new',       label: 'Order Received',    emoji: '🧾' },
  { key: 'unpaid',    label: 'Awaiting Payment',  emoji: '💳' },
  { key: 'paid',      label: 'Payment Confirmed', emoji: '✅' },
  { key: 'preparing', label: 'Preparing',         emoji: '👨‍🍳' },
  { key: 'ready',     label: 'Ready for Pickup',  emoji: '📦' },
  { key: 'delivered', label: 'Delivered',         emoji: '🎉' },
];

const isIOS = () => /ipad|iphone|ipod/.test(navigator.userAgent.toLowerCase());
const isStandalone = () => ('standalone' in navigator) && navigator.standalone;

const IOSPrompt = ({ onDismiss }) => (
  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
    <p className="font-semibold text-blue-900 text-sm">Get order notifications</p>
    <p className="text-sm text-blue-700">Add this page to your home screen to receive updates when your order status changes:</p>
    <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
      <li>Tap the Share button <strong>⎙</strong> at the bottom of Safari</li>
      <li>Select <strong>"Add to Home Screen"</strong></li>
      <li>Open the app from your home screen</li>
    </ol>
    <button onClick={onDismiss} className="text-xs text-blue-500 underline">Dismiss</button>
  </div>
);

const OrderStatusPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    if (isIOS() && !isStandalone()) {
      setShowIOSPrompt(true);
    } else {
      requestNotificationToken().then((token) => {
        if (token) {
          updateDoc(doc(db, 'orders', orderId), { fcmToken: token }).catch(() => {});
        }
      });
      onForegroundMessage(async (payload) => {
        const { title, body } = payload.notification || {};
        if (!title) return;
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification(title, { body });
        } catch {}
      });
    }
  }, [orderId]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setOrder({ id: snap.id, ...data });
        if (data.status === 'delivered' || data.status === 'cancelled') {
          localStorage.removeItem('lastOrderId');
        }
      } else {
        setNotFound(true);
        localStorage.removeItem('lastOrderId');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [orderId]);

  const currentIndex = STATUSES.findIndex((s) => s.key === order?.status);

  if (order?.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-xl font-bold text-foreground">Order Status</h1>
            <p className="text-xs text-muted-foreground mt-0.5">#{orderId.slice(-8).toUpperCase()}</p>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 max-w-lg space-y-5">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center space-y-2">
            <p className="text-5xl">❌</p>
            <p className="text-xl font-bold text-foreground">Order Cancelled</p>
            {order.cancelReason && (
              <p className="text-sm text-muted-foreground">Reason: {order.cancelReason}</p>
            )}
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h2 className="font-bold text-foreground text-sm">Your Order</h2>
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-foreground">{item.name} × {item.quantity}</span>
                <span className="text-foreground">${(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground text-sm">
              <span>Total</span>
              <span>${order.total?.toLocaleString()}</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full border border-border py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Order More Food
          </button>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Order not found.</p>
        <button onClick={() => navigate('/')} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">Order Status</h1>
          <p className="text-xs text-muted-foreground mt-0.5">#{orderId.slice(-8).toUpperCase()}</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-5">
        {showIOSPrompt && <IOSPrompt onDismiss={() => setShowIOSPrompt(false)} />}

        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 text-center">
          <p className="text-5xl mb-2">{STATUSES[currentIndex]?.emoji}</p>
          <p className="text-xl font-bold text-foreground">{STATUSES[currentIndex]?.label}</p>
        </div>

        {order.status === 'new' && (
          <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-3">
            <div className="flex justify-center gap-2">
              <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-sm text-muted-foreground">Waiting for restaurant to confirm your order...</p>
          </div>
        )}

        {order.status === 'unpaid' && (
          <button
            onClick={() => navigate(`/payment/${orderId}`)}
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold text-base hover:opacity-90 transition-opacity"
          >
            Pay Now →
          </button>
        )}

        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-foreground text-sm">Progress</h2>
          <div className="space-y-2">
            {STATUSES.map((s, idx) => {
              const done = idx <= currentIndex;
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {done ? '✓' : idx + 1}
                  </div>
                  <span className={`text-sm ${done ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {s.emoji} {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-foreground text-sm">Your Order</h2>
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-foreground">{item.name} × {item.quantity}</span>
              <span className="text-foreground">${(item.price * item.quantity).toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground text-sm">
            <span>Total</span>
            <span>${order.total?.toLocaleString()}</span>
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full border border-border py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Order More Food
        </button>
      </main>
    </div>
  );
};

export default OrderStatusPage;
