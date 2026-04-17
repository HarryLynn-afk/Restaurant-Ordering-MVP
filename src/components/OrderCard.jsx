import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const STATUSES = [
  { key: 'unpaid',    label: 'Awaiting Payment', color: 'bg-red-100 text-red-600' },
  { key: 'paid',      label: 'Paid',             color: 'bg-blue-100 text-blue-600' },
  { key: 'preparing', label: 'Preparing',        color: 'bg-yellow-100 text-yellow-700' },
  { key: 'ready',     label: 'Ready',            color: 'bg-purple-100 text-purple-600' },
  { key: 'delivered', label: 'Delivered',        color: 'bg-green-100 text-green-600' },
];

const OrderCard = ({ order }) => {
  const [updating, setUpdating] = useState(false);
  const [slipOpen, setSlipOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);

  const currentStatus = STATUSES.find((s) => s.key === order.status) || STATUSES[0];

  const handleConfirm = async () => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), { status: pendingStatus });
      setPendingStatus(null);
    } finally {
      setUpdating(false);
    }
  };

  const createdAt = order.createdAt?.toDate?.()?.toLocaleString('en-US') || '—';

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-foreground">{order.customerName}</p>
          <p className="text-sm text-muted-foreground">{order.phone}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{createdAt}</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${currentStatus.color}`}>
          {currentStatus.label}
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-foreground">📍 {order.address}</p>
        {order.notes && <p className="text-sm text-muted-foreground">📝 {order.notes}</p>}
      </div>

      <div className="bg-muted/50 rounded-xl p-3 space-y-1">
        {order.items?.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-foreground">{item.name} × {item.quantity}</span>
            <span className="text-foreground">${(item.price * item.quantity).toLocaleString()}</span>
          </div>
        ))}
        <div className="border-t border-border pt-1 mt-1 flex justify-between font-bold text-sm text-foreground">
          <span>Total</span>
          <span>${order.total?.toLocaleString()}</span>
        </div>
      </div>

      {order.paymentSlipUrl ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Payment Slip</p>
          <img
            src={order.paymentSlipUrl}
            alt="payment slip"
            onClick={() => setSlipOpen(true)}
            className="w-32 h-32 object-cover rounded-xl border border-border cursor-pointer hover:opacity-90 transition-opacity"
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">No payment slip uploaded yet</p>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground shrink-0">Update Status:</label>
          <select
            value={pendingStatus ?? order.status}
            onChange={(e) => setPendingStatus(e.target.value)}
            disabled={updating}
            className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
        {pendingStatus && pendingStatus !== order.status && (
          <div className="flex gap-2">
            <button
              onClick={() => setPendingStatus(null)}
              className="flex-1 border border-border py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={updating}
              className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {updating ? 'Updating...' : 'Confirm'}
            </button>
          </div>
        )}
      </div>

      {slipOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSlipOpen(false)}
        >
          <img src={order.paymentSlipUrl} alt="slip full" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  );
};

export default OrderCard;
