import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const CANCEL_REASONS = [
  'Out of stock',
  'Restaurant closed',
  'Out of delivery area',
  'Other',
];

const STATUS_COLORS = {
  new:       'bg-orange-100 text-orange-600',
  unpaid:    'bg-red-100 text-red-600',
  paid:      'bg-blue-100 text-blue-600',
  preparing: 'bg-yellow-100 text-yellow-700',
  ready:     'bg-purple-100 text-purple-600',
  delivered: 'bg-green-100 text-green-600',
  cancelled: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS = {
  new:       'New Order',
  unpaid:    'Awaiting Payment',
  paid:      'Paid',
  preparing: 'Preparing',
  ready:     'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const PROGRESS_STATUSES = [
  { key: 'unpaid',    label: 'Awaiting Payment' },
  { key: 'paid',      label: 'Paid' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready',     label: 'Ready' },
  { key: 'delivered', label: 'Delivered' },
];

const OrderCard = ({ order }) => {
  const [updating, setUpdating] = useState(false);
  const [slipOpen, setSlipOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOther, setCancelOther] = useState('');

  const statusColor = STATUS_COLORS[order.status] || STATUS_COLORS.unpaid;
  const statusLabel = STATUS_LABELS[order.status] || order.status;

  const handleAccept = async () => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), { status: 'unpaid' });
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 2000);
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelSubmit = async () => {
    const reason = cancelReason === 'Other' ? cancelOther : cancelReason;
    if (!reason) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), { status: 'cancelled', cancelReason: reason });
      setShowCancelForm(false);
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirm = async () => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), { status: pendingStatus });
      setPendingStatus(null);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 2000);
    } finally {
      setUpdating(false);
    }
  };

  const createdAt = order.createdAt?.toDate?.()?.toLocaleString('en-US') || '—';

  return (
    <div className={`bg-card border rounded-2xl p-5 space-y-4 ${order.status === 'new' ? 'border-orange-400 ring-1 ring-orange-300' : 'border-border'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-foreground">{order.customerName}</p>
          <p className="text-sm text-muted-foreground">{order.phone}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{createdAt}</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Address & notes */}
      <div className="space-y-1">
        <p className="text-sm text-foreground">{order.address}</p>
        {order.notes && <p className="text-sm text-muted-foreground">{order.notes}</p>}
      </div>

      {/* Items */}
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

      {/* LINE */}
      {order.lineId && (
        <a
          href={`line://ti/p/~${order.lineId.replace(/^@/, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-[#06C755] text-white py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.077 2 11.1c0 2.715 1.258 5.143 3.236 6.808L4.5 21.5l3.91-1.98C9.55 20.02 10.76 20.2 12 20.2c5.523 0 10-4.077 10-9.1S17.523 2 12 2z"/></svg>
          Chat on LINE ({order.lineId})
        </a>
      )}

      {/* Payment slip — only for orders past the new stage */}
      {order.status !== 'new' && order.status !== 'cancelled' && (
        order.paymentSlipUrl ? (
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
        )
      )}

      {/* Cancellation reason */}
      {order.status === 'cancelled' && order.cancelReason && (
        <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          Reason: {order.cancelReason}
        </p>
      )}

      {updateSuccess && (
        <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Status updated successfully.
        </p>
      )}

      {/* NEW ORDER: Accept / Cancel buttons */}
      {order.status === 'new' && !showCancelForm && (
        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            disabled={updating}
            className="flex-1 bg-green-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {updating ? 'Processing...' : 'Accept'}
          </button>
          <button
            onClick={() => setShowCancelForm(true)}
            disabled={updating}
            className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            Cancel Order
          </button>
        </div>
      )}

      {/* Cancel reason form */}
      {order.status === 'new' && showCancelForm && (
        <div className="space-y-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700">Select cancellation reason:</p>
          <div className="space-y-2">
            {CANCEL_REASONS.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="radio"
                  name={`reason-${order.id}`}
                  value={r}
                  checked={cancelReason === r}
                  onChange={() => setCancelReason(r)}
                  className="accent-red-500"
                />
                {r}
              </label>
            ))}
          </div>
          {cancelReason === 'Other' && (
            <input
              type="text"
              value={cancelOther}
              onChange={(e) => setCancelOther(e.target.value)}
              placeholder="Please specify reason..."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowCancelForm(false); setCancelReason(''); setCancelOther(''); }}
              className="flex-1 border border-border py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground"
            >
              Back
            </button>
            <button
              onClick={handleCancelSubmit}
              disabled={updating || !cancelReason || (cancelReason === 'Other' && !cancelOther)}
              className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {updating ? 'Cancelling...' : 'Confirm Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Status dropdown for in-progress orders */}
      {order.status !== 'new' && order.status !== 'cancelled' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground shrink-0">Update Status:</label>
            <select
              value={pendingStatus ?? order.status}
              onChange={(e) => setPendingStatus(e.target.value)}
              disabled={updating}
              className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              {PROGRESS_STATUSES.map((s) => (
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
      )}

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
