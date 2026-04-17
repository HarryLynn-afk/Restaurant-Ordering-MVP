import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const STATUSES = [
  { key: 'unpaid',    label: 'Awaiting Payment', emoji: '💳' },
  { key: 'paid',      label: 'Payment Confirmed', emoji: '✅' },
  { key: 'preparing', label: 'Preparing',         emoji: '👨‍🍳' },
  { key: 'ready',     label: 'Ready for Pickup',  emoji: '📦' },
  { key: 'delivered', label: 'Delivered',          emoji: '🎉' },
];

const OrderStatusPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (snap) => {
      if (snap.exists()) {
        setOrder({ id: snap.id, ...snap.data() });
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [orderId]);

  const currentIndex = STATUSES.findIndex((s) => s.key === order?.status);

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
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 text-center">
          <p className="text-5xl mb-2">{STATUSES[currentIndex]?.emoji}</p>
          <p className="text-xl font-bold text-foreground">{STATUSES[currentIndex]?.label}</p>
        </div>

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
