import { useEffect, useRef, useState } from 'react';
import { updateOrderStatus } from '../services/orders';
import { onUndoTrigger } from '../utils/undoStore';
import { useAdminLanguage } from '../utils/i18n';

const UndoToast = () => {
  const { t } = useAdminLanguage();
  const [undo, setUndo] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return onUndoTrigger((orderId, prevStatus) => {
      clearTimeout(timerRef.current);
      setUndo({ orderId, prevStatus });
      timerRef.current = setTimeout(() => setUndo(null), 5000);
    });
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleUndo = async () => {
    if (!undo) return;
    clearTimeout(timerRef.current);
    const { orderId, prevStatus } = undo;
    setUndo(null);
    await updateOrderStatus(orderId, prevStatus);
  };

  if (!undo) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium whitespace-nowrap animate-in">
      <span>{t('admin.orderCard.statusUpdated')}</span>
      <button
        onClick={handleUndo}
        className="font-bold underline hover:no-underline shrink-0"
      >
        {t('admin.orderCard.undo')}
      </button>
    </div>
  );
};

export default UndoToast;
