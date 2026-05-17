import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { useCustomerLanguage } from '../utils/i18n';
import ModifierSheet from './ModifierSheet';

const MenuItemCard = ({ item, quantity, catModifiers, onAddToCart, onRemoveFromCart }) => {
  const { t } = useCustomerLanguage();
  const [sheetOpen, setSheetOpen] = useState(false);
  const hasModifiers = catModifiers && catModifiers.length > 0;

  const handleAdd = () => {
    if (hasModifiers) {
      setSheetOpen(true);
    } else {
      onAddToCart(item);
    }
  };

  const handleImageError = (e) => { e.target.src = '/placeholder.svg'; };

  return (
    <>
      <div className="bg-card rounded-xl overflow-hidden shadow-soft hover:shadow-lg transition-shadow duration-300 border border-border">
        <div className="aspect-square overflow-hidden bg-muted">
          <img
            src={item.imageUrl || item.image || '/placeholder.svg'}
            alt={item.name}
            onError={handleImageError}
            loading="lazy"
            decoding="async"
            className={`w-full h-full object-cover transition-transform duration-300 ${item.soldOut ? 'grayscale opacity-50' : 'hover:scale-105'}`}
          />
        </div>

        <div className="p-3 space-y-2">
          <div className="flex justify-between items-start gap-1">
            <h3 className="font-semibold text-foreground text-sm leading-tight">{item.name}</h3>
            {item.soldOut && (
              <span className="px-2 py-0.5 bg-destructive/10 text-destructive text-xs font-medium rounded-full shrink-0">
                {t('customer.soldOut')}
              </span>
            )}
          </div>

          {item.description && (
            <p className="text-muted-foreground text-sm line-clamp-2">{item.description}</p>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-primary font-bold text-base">{formatCurrency(item.price)}</span>
            {!hasModifiers && quantity > 0 ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onRemoveFromCart(item.id)}
                  className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center hover:bg-primary/90 transition-colors text-lg leading-none"
                >
                  −
                </button>
                <span className="text-sm font-bold w-5 text-center text-foreground">{quantity}</span>
                {!item.soldOut && (
                  <button
                    onClick={handleAdd}
                    className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center hover:bg-primary/90 transition-colors text-lg leading-none"
                  >
                    +
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleAdd}
                disabled={item.soldOut}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart size={16} />
                <span>{quantity > 0 ? `${t('customer.add')} (${quantity})` : t('customer.add')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {sheetOpen && (
        <ModifierSheet
          item={item}
          groups={catModifiers}
          onClose={() => setSheetOpen(false)}
          onAddToCart={onAddToCart}
        />
      )}
    </>
  );
};

export default MenuItemCard;
