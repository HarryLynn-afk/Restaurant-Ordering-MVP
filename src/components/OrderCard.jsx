import { useEffect, useState } from 'react';
import { updateOrderStatus, getPaymentSlipUrl } from '../services/orders';
import { getCancelReasonLabel } from '../utils/cancelReasons';
import {
  getAdminProgressStatuses,
  getAdminStatusLabel,
  normalizeAdminStatus,
} from '../utils/orderStatus';
import { formatCurrency } from '../utils/currency';
import { useAdminLanguage } from '../utils/i18n';
import ImageLightbox from './ImageLightbox';
import DeliveryPhotoSection from './DeliveryPhotoSection';
import OrderItemsList from './OrderItemsList';
import CancelOrderForm from './CancelOrderForm';

const STATUS_COLORS = {
  new:       'bg-orange-100 text-orange-600',
  unpaid:    'bg-red-100 text-red-600',
  preparing: 'bg-yellow-100 text-yellow-700',
  ready:     'bg-purple-100 text-purple-600',
  delivered: 'bg-green-100 text-green-600',
  cancelled: 'bg-gray-100 text-gray-500',
};

const OrderCard = ({ order }) => {
  const { locale, t } = useAdminLanguage();
  const [updating, setUpdating] = useState(false);
  const [slipOpen, setSlipOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [paymentSlipSrc, setPaymentSlipSrc] = useState(order.paymentSlipUrl ?? '');
  const displayStatus = normalizeAdminStatus(order.status);
  const progressStatuses = getAdminProgressStatuses(t);

  const statusColor = STATUS_COLORS[displayStatus] || STATUS_COLORS.unpaid;
  const statusLabel = getAdminStatusLabel(displayStatus, t);
  const hasPaymentSlip = Boolean(order.paymentSlipPath || order.paymentSlipUrl);

  useEffect(() => {
    let cancelled = false;

    if (order.paymentSlipUrl) {
      setPaymentSlipSrc(order.paymentSlipUrl);
      return undefined;
    }

    if (!order.paymentSlipPath) {
      setPaymentSlipSrc('');
      return undefined;
    }

    setPaymentSlipSrc('');
    getPaymentSlipUrl(order.paymentSlipPath)
      .then((url) => {
        if (!cancelled) setPaymentSlipSrc(url);
      })
      .catch(() => {
        if (!cancelled) setPaymentSlipSrc('');
      });

    return () => {
      cancelled = true;
    };
  }, [order.paymentSlipPath, order.paymentSlipUrl]);

  const handleAccept = async () => {
    setUpdating(true);
    try {
      await updateOrderStatus(order.id, 'unpaid');
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 2000);
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirm = async () => {
    if (!pendingStatus || pendingStatus === displayStatus) return;
    setUpdating(true);
    try {
      await updateOrderStatus(order.id, pendingStatus);
      setPendingStatus(null);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 2000);
    } finally {
      setUpdating(false);
    }
  };

  const handleStartPreparing = async () => {
    setPendingStatus(null);
    setUpdating(true);
    try {
      await updateOrderStatus(order.id, 'preparing');
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 2000);
    } finally {
      setUpdating(false);
    }
  };

  const createdAt = order.createdAt?.toDate?.()?.toLocaleString(locale) || '—';
  const cancelReasonLabel = order.cancelReason ? getCancelReasonLabel(order.cancelReason, t) : '';

  return (
    <div className={`bg-card border rounded-2xl p-5 space-y-4 transition-opacity ${
      order.status === 'new' ? 'border-orange-400 ring-1 ring-orange-300' : 'border-border'
    } ${order.status === 'cancelled' || order.status === 'delivered' ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-foreground">{order.customerName}</p>
          <p className="text-xs text-muted-foreground font-mono">#{order.id.slice(-8).toUpperCase()}</p>
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
      <div className="bg-muted/50 rounded-xl p-3">
        <OrderItemsList items={order.items} total={order.total} />
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
          {t('admin.orderCard.chatOnLine', { lineId: order.lineId })}
        </a>
      )}

      {/* Payment Slip + Delivery Photo side by side */}
      {order.status !== 'new' && order.status !== 'cancelled' && (
        <div className="flex gap-6">
          {/* Payment Slip */}
          <div className="space-y-1.5 w-fit">
            <p className="text-sm font-medium text-foreground">{t('common.paymentSlip')}</p>
            {hasPaymentSlip ? (
              <div className="space-y-2">
                {paymentSlipSrc ? (
                  <img
                    src={paymentSlipSrc}
                    alt="payment slip"
                    onClick={() => setSlipOpen(true)}
                    className="w-28 h-28 object-cover rounded-xl border border-border cursor-pointer hover:opacity-90 transition-opacity"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-xl border border-border bg-muted flex items-center justify-center text-xs text-muted-foreground text-center px-2">
                    {t('common.loading')}
                  </div>
                )}
                <p className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-1">
                  {t('admin.orderCard.slipReceived')}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">{t('admin.orderCard.noSlipYet')}</p>
            )}
          </div>

          {(order.status === 'ready' || order.status === 'delivered') && (
            <DeliveryPhotoSection orderId={order.id} deliveryPhotoUrl={order.deliveryPhotoUrl} />
          )}
        </div>
      )}

      {/* Cancellation reason */}
      {order.status === 'cancelled' && order.cancelReason && (
        <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          {t('admin.orderCard.reasonLabel', { reason: cancelReasonLabel })}
        </p>
      )}

      {updateSuccess && (
        <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {t('admin.orderCard.statusUpdated')}
        </p>
      )}

      {displayStatus === 'unpaid' && hasPaymentSlip && !showCancelForm && (
        <div className="space-y-2">
          <button
            onClick={handleStartPreparing}
            disabled={updating}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {updating ? t('admin.orderCard.starting') : t('admin.orderCard.startPreparing')}
          </button>
          <button
            onClick={() => setShowCancelForm(true)}
            disabled={updating}
            className="w-full border border-red-300 text-red-500 py-2 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {t('admin.orderCard.cancelOrder')}
          </button>
        </div>
      )}

      {/* NEW ORDER: Accept / Cancel buttons */}
      {order.status === 'new' && !showCancelForm && (
        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            disabled={updating}
            className="flex-1 bg-green-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {updating ? t('admin.orderCard.processing') : t('admin.orderCard.accept')}
          </button>
          <button
            onClick={() => setShowCancelForm(true)}
            disabled={updating}
            className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {t('admin.orderCard.cancelOrder')}
          </button>
        </div>
      )}

      {/* Cancel reason form */}
      {(order.status === 'new' || displayStatus === 'unpaid') && showCancelForm && (
        <CancelOrderForm orderId={order.id} onClose={() => setShowCancelForm(false)} />
      )}

      {/* Status dropdown for in-progress orders */}
      {order.status !== 'new' && order.status !== 'cancelled' && order.status !== 'delivered' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground shrink-0">{t('admin.orderCard.updateStatus')}</label>
            <select
              value={pendingStatus ?? displayStatus}
              onChange={(e) => setPendingStatus(e.target.value)}
              disabled={updating}
              className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              {progressStatuses.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
          {pendingStatus && pendingStatus !== displayStatus && (
            <div className="flex gap-2">
              <button
                onClick={() => setPendingStatus(null)}
                className="flex-1 border border-border py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={updating}
                className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {updating ? t('admin.orderCard.updating') : t('common.confirm')}
              </button>
            </div>
          )}
        </div>
      )}

      <ImageLightbox src={paymentSlipSrc} open={slipOpen} onClose={() => setSlipOpen(false)} />
    </div>
  );
};

export default OrderCard;
