import { formatCurrency } from '../utils/currency';
import { useCustomerLanguage } from '../utils/i18n';

const OrderItemsList = ({ items = [], total }) => {
  const { t } = useCustomerLanguage();
  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={item.cartKey || item.id || i} className="flex justify-between text-sm gap-2">
          <div>
            <span className="text-foreground">{item.name} × {item.quantity}</span>
            {item.modifierSummary && <p className="text-xs text-muted-foreground">{item.modifierSummary}</p>}
          </div>
          <span className="text-foreground font-medium shrink-0">{formatCurrency(item.price * item.quantity)}</span>
        </div>
      ))}
      <div className="border-t border-border pt-2 mt-1 flex justify-between font-bold text-sm text-foreground">
        <span>{t('common.total')}</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  );
};

export default OrderItemsList;
