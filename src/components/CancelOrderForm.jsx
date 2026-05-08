import { useState } from 'react';
import { cancelOrder } from '../services/orders';
import { CANCEL_REASON_OPTIONS } from '../utils/cancelReasons';
import { useAdminLanguage } from '../utils/i18n';

const CancelOrderForm = ({ orderId, onClose }) => {
  const { t } = useAdminLanguage();
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOther, setCancelOther] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleSubmit = async () => {
    const reason = cancelReason === 'Other' ? cancelOther : cancelReason;
    if (!reason) return;
    setUpdating(true);
    try {
      await cancelOrder(orderId, reason);
      onClose();
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-3 bg-red-50 border border-red-200 rounded-xl p-4">
      <p className="text-sm font-semibold text-red-700">{t('admin.orderCard.selectCancellationReason')}</p>
      <div className="space-y-2">
        {CANCEL_REASON_OPTIONS.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="radio"
              name={`reason-${orderId}`}
              value={option.value}
              checked={cancelReason === option.value}
              onChange={() => setCancelReason(option.value)}
              className="accent-red-500"
            />
            {t(option.translationKey)}
          </label>
        ))}
      </div>
      {cancelReason === 'Other' && (
        <input
          type="text"
          value={cancelOther}
          onChange={(e) => setCancelOther(e.target.value)}
          placeholder={t('admin.orderCard.otherReasonPlaceholder')}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-400"
        />
      )}
      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 border border-border py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground"
        >
          {t('common.back')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={updating || !cancelReason || (cancelReason === 'Other' && !cancelOther)}
          className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
        >
          {updating ? t('admin.orderCard.cancelling') : t('admin.orderCard.confirmCancel')}
        </button>
      </div>
    </div>
  );
};

export default CancelOrderForm;
