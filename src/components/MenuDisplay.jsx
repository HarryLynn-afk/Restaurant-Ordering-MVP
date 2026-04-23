import { ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { useCustomerLanguage } from '../utils/i18n';

const MenuItemCard = ({ item, quantity, onAddToCart, onRemoveFromCart }) => {
  const { t } = useCustomerLanguage();
  const handleImageError = (e) => {
    e.target.src = '/placeholder.svg';
  };

  return (
    <div className="bg-card rounded-xl overflow-hidden shadow-soft hover:shadow-lg transition-shadow duration-300 border border-border">
      <div className="aspect-square overflow-hidden bg-muted">
        <img
          src={item.imageUrl || item.image || '/placeholder.svg'}
          alt={item.name}
          onError={handleImageError}
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
          {quantity > 0 ? (
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
                  onClick={() => onAddToCart(item)}
                  className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center hover:bg-primary/90 transition-colors text-lg leading-none"
                >
                  +
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => onAddToCart(item)}
              disabled={item.soldOut}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={16} />
              <span>{t('customer.add')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const MenuDisplay = ({ menuItems = [], cart = [], onAddToCart, onRemoveFromCart }) => {
  const { t } = useCustomerLanguage();

  if (menuItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <ShoppingCart size={40} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{t('customer.noMenuTitle')}</h3>
        <p className="text-muted-foreground text-sm">{t('customer.noMenuDescription')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{t('customer.todaysMenu')}</h2>
        <span className="text-sm text-muted-foreground">{t('customer.itemsCount', { count: menuItems.length })}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {menuItems.map((item) => {
          const cartItem = cart.find((c) => c.id === item.id);
          return (
            <MenuItemCard
              key={item.id}
              item={item}
              quantity={cartItem?.quantity || 0}
              onAddToCart={onAddToCart}
              onRemoveFromCart={onRemoveFromCart}
            />
          );
        })}
      </div>
    </div>
  );
};

export default MenuDisplay;
