import { ShoppingCart } from 'lucide-react';
import { useCustomerLanguage } from '../utils/i18n';
import MenuItemCard from './MenuItemCard';

const MenuDisplay = ({ menuItems = [], cart = [], onAddToCart, onRemoveFromCart, categoryModifiers = {} }) => {
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
          const quantity = cart.filter((c) => c.id === item.id).reduce((s, c) => s + c.quantity, 0);
          const catMods = categoryModifiers[item.category] || [];
          return (
            <MenuItemCard
              key={item.id}
              item={item}
              quantity={quantity}
              catModifiers={catMods}
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
