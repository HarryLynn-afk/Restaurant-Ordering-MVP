import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { updateOrderStatus, getPaymentSlipUrl } from '../services/orders';
import { getCancelReasonLabel } from '../utils/cancelReasons';
import {
  ADMIN_IN_PROGRESS_NEXT_STATUSES,
  ADMIN_IN_PROGRESS_STATUSES,
  canAdminCancelOrder,
  getAdminStatusLabel,
  normalizeAdminStatus,
} from '../utils/orderStatus';
import { triggerUndo } from '../utils/undoStore';
import { useAdminLanguage } from '../utils/i18n';
import { formatRelativeTime } from '../utils/relativeTime';
import ImageLightbox from './ImageLightbox';
import DeliveryPhotoSection from './DeliveryPhotoSection';
import OrderItemsList from './OrderItemsList';
import CancelOrderForm from './CancelOrderForm';
import ConfirmModal from './ConfirmModal';

const STATUS_COLORS = {
  new:             'bg-orange-100 text-orange-600',
  unpaid:          'bg-red-100 text-red-600',
  preparing:       'bg-yellow-100 text-yellow-700',
  ready:           'bg-purple-100 text-purple-600',
  out_for_delivery:'bg-blue-100 text-blue-600',
  delivered:       'bg-green-100 text-green-600',
  cancelled:       'bg-gray-100 text-gray-500',
};

const OrderCard = ({ order }) => {
  const { locale, t } = useAdminLanguage();
  const [updating, setUpdating] = useState(false);
  const [slipOpen, setSlipOpen] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [paymentSlipSrc, setPaymentSlipSrc] = useState(order.paymentSlipUrl ?? '');
  const displayStatus = normalizeAdminStatus(order.status);

  const statusColor = STATUS_COLORS[displayStatus] || STATUS_COLORS.unpaid;
  const statusLabel = getAdminStatusLabel(displayStatus, t);
  const hasPaymentSlip = Boolean(order.paymentSlipPath || order.paymentSlipUrl);
  const canCancel = canAdminCancelOrder(order.status, hasPaymentSlip);

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

  const handleStatusUpdate = async (nextStatus) => {
    const prev = displayStatus;
    setUpdating(true);
    try {
      await updateOrderStatus(order.id, nextStatus);
      triggerUndo(order.id, prev);
    } finally {
      setUpdating(false);
    }
  };

  const createdAtDate = order.createdAt?.toDate?.();
  const relative = createdAtDate ? formatRelativeTime(createdAtDate) : null;
  const createdAt = relative
    ?? createdAtDate?.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
    ?? '—';
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
            ) : displayStatus === 'unpaid' ? (
              <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                <Clock size={12} className="animate-pulse shrink-0" />
                {t('admin.orderCard.waitingForSlip')}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">{t('admin.orderCard.noSlipYet')}</p>
            )}
          </div>

          {['ready', 'out_for_delivery', 'delivered'].includes(order.status) && (
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


      {/* NEW ORDER: Accept / Cancel */}
      {order.status === 'new' && !showCancelForm && (
        <div className="flex gap-2">
          <button
            onClick={() => handleStatusUpdate('unpaid')}
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

      {/* UNPAID: Start Preparing once slip arrives */}
      {displayStatus === 'unpaid' && hasPaymentSlip && !showCancelForm && (
        <div className="space-y-2">
          <button
            onClick={() => setConfirmAction('preparing')}
            disabled={updating}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {updating ? t('admin.orderCard.starting') : t('admin.orderCard.startPreparing')}
          </button>
        </div>
      )}

      {/* Cancel reason form */}
      {canCancel && showCancelForm && (
        <CancelOrderForm orderId={order.id} onClose={() => setShowCancelForm(false)} />
      )}

      {/* IN-PROGRESS: status dropdown */}
      {ADMIN_IN_PROGRESS_STATUSES.includes(displayStatus) && (
        <select
          value={displayStatus}
          onChange={(e) => {
            const next = e.target.value;
            if (next === 'delivered') {
              setConfirmAction('delivered');
            } else {
              handleStatusUpdate(next);
            }
          }}
          disabled={updating}
          className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
        >
          {ADMIN_IN_PROGRESS_NEXT_STATUSES.map((s) => (
            <option key={s} value={s}>{getAdminStatusLabel(s, t)}</option>
          ))}
        </select>
      )}

      <ConfirmModal
        open={confirmAction != null}
        title={confirmAction === 'preparing' ? t('admin.orderCard.confirmPaymentTitle') : t('admin.orderCard.confirmDeliveredTitle')}
        message={confirmAction === 'preparing' ? t('admin.orderCard.confirmPaymentMessage') : t('admin.orderCard.confirmDeliveredMessage')}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => { handleStatusUpdate(confirmAction); setConfirmAction(null); }}
        onClose={() => setConfirmAction(null)}
      />

      <ImageLightbox src={paymentSlipSrc} open={slipOpen} onClose={() => setSlipOpen(false)} />
    </div>
  );
};

export default OrderCard;
