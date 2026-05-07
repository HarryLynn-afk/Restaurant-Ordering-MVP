import { formatCurrency } from '../utils/currency';
import { useCustomerLanguage } from '../utils/i18n';

const CartDrawer = ({ open, cart, onClose, onAddItem, onRemoveItem, totalPrice, onCheckout }) => {
  const { t } = useCustomerLanguage();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="bg-card w-full max-w-sm flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold text-foreground text-lg">{t('customer.cartTitle')}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">{t('customer.cartEmpty')}</p>
          ) : (
            cart.map((item) => (
              <div key={item.cartKey || item.id} className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{item.name}</p>
                  {item.modifierSummary && <p className="text-xs text-muted-foreground truncate">{item.modifierSummary}</p>}
                  <p className="text-muted-foreground text-xs">{formatCurrency(item.price)} x {item.quantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onRemoveItem(item.cartKey || item.id)} className="w-7 h-7 rounded-full bg-muted text-foreground font-bold flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">−</button>
                  <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                  <button onClick={() => onAddItem(item)} className="w-7 h-7 rounded-full bg-muted text-foreground font-bold flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">+</button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-4 border-t border-border space-y-3">
            <div className="flex justify-between font-bold text-foreground">
              <span>{t('common.total')}</span>
              <span>{formatCurrency(totalPrice)}</span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              {t('customer.placeOrder')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
