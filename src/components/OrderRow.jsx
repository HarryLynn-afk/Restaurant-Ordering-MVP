import { useState } from 'react';
import { updateOrderStatus } from '../services/orders';
import { normalizeAdminStatus } from '../utils/orderStatus';
import { formatCurrency } from '../utils/currency';
import { useAdminLanguage } from '../utils/i18n';
import { triggerUndo } from '../utils/undoStore';

const STATUS_DOT = {
  new:              'bg-orange-400',
  unpaid:           'bg-red-400',
  preparing:        'bg-yellow-400',
  ready:            'bg-purple-400',
  out_for_delivery: 'bg-blue-400',
  delivered:        'bg-green-400',
  cancelled:        'bg-gray-300',
};

const NEXT_STATUS = {
  preparing:        'ready',
  ready:            'out_for_delivery',
  out_for_delivery: 'delivered',
};

const QUICK_BTN_STYLE = {
  new:              'bg-green-500 hover:bg-green-600 text-white',
  unpaid:           'bg-primary hover:opacity-90 text-primary-foreground',
  preparing:        'bg-purple-500 hover:bg-purple-600 text-white',
  ready:            'bg-blue-500 hover:bg-blue-600 text-white',
  out_for_delivery: 'bg-green-500 hover:bg-green-600 text-white',
};

const OrderRow = ({ order, onTap }) => {
  const { t } = useAdminLanguage();
  const [updating, setUpdating] = useState(false);

  const displayStatus = normalizeAdminStatus(order.status);
  const hasSlip = Boolean(order.paymentSlipPath || order.paymentSlipUrl);

  const quickNext =
    displayStatus === 'new'                        ? 'unpaid' :
    displayStatus === 'unpaid' && hasSlip          ? 'preparing' :
    NEXT_STATUS[displayStatus]                     ?? null;

  const quickLabel =
    displayStatus === 'new'                        ? t('admin.orderCard.accept') :
    displayStatus === 'unpaid' && hasSlip          ? t('admin.orderCard.startPreparing') :
    displayStatus === 'preparing'                  ? t('admin.orderCard.markReady') :
    displayStatus === 'ready'                      ? t('admin.orderCard.markOutForDelivery') :
    displayStatus === 'out_for_delivery'           ? t('admin.orderCard.markDelivered') :
    null;

  const handleQuick = async (e) => {
    e.stopPropagation();
    if (!quickNext) return;
    const prev = displayStatus;
    setUpdating(true);
    try {
      await updateOrderStatus(order.id, quickNext);
      triggerUndo(order.id, prev);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onTap(order)}
      onKeyDown={(e) => e.key === 'Enter' && onTap(order)}
      className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border active:bg-muted/40 cursor-pointer select-none"
    >
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[displayStatus] || 'bg-gray-300'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{order.customerName}</p>
        <p className="text-xs text-muted-foreground">
          {order.items?.length ?? 0} items · {formatCurrency(order.total)}
        </p>
      </div>
      {quickNext && quickLabel ? (
        <button
          onClick={handleQuick}
          disabled={updating}
          className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${QUICK_BTN_STYLE[displayStatus] || ''}`}
        >
          {updating ? '...' : quickLabel}
        </button>
      ) : null }

    </div>
  );
};

export default OrderRow;
