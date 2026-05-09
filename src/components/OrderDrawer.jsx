import { useEffect } from 'react';
import { X } from 'lucide-react';
import OrderCard from './OrderCard';

const OrderDrawer = ({ order, onClose }) => {
  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-background rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Handle + close */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 bg-border rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-4 pb-8">
          <OrderCard order={order} />
        </div>
      </div>
    </div>
  );
};

export default OrderDrawer;
