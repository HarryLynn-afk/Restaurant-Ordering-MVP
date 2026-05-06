import { useState } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { useCustomerLanguage } from '../utils/i18n';

// ── Modifier Sheet ────────────────────────────────────────────────────────────
const ModifierSheet = ({ item, groups, onClose, onAddToCart, t }) => {
  const [selections, setSelections] = useState(() =>
    Object.fromEntries(groups.map((g) => [g.id, g.type === 'required' ? null : {}]))
  );

  const isValid = groups.every((g) => g.type !== 'required' || selections[g.id] !== null);

  const extraTotal = groups.reduce((sum, g) => {
    if (g.type !== 'extras') return sum;
    return sum + g.options.reduce((s, o) => (selections[g.id]?.[o.id] ? s + (Number(o.price) || 0) : s), 0);
  }, 0);

  const handleAdd = () => {
    const parts = [];
    groups.forEach((g) => {
      if (g.type === 'required') {
        const opt = g.options.find((o) => o.id === selections[g.id]);
        if (opt) parts.push(opt.name);
      } else {
        g.options.filter((o) => selections[g.id]?.[o.id]).forEach((o) => parts.push(o.name));
      }
    });
    const modifierSummary = parts.join(', ');
    const cartKey = `${item.id}::${JSON.stringify(selections)}`;
    onAddToCart({ ...item, cartKey, price: item.price + extraTotal, modifierSummary });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card w-full rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div>
            <p className="font-bold text-foreground">{item.name}</p>
            <p className="text-sm text-primary font-semibold">{formatCurrency(item.price + extraTotal)}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-5">
          {groups.map((g) => (
            <div key={g.id}>
              <div className="flex items-center gap-2 mb-3">
                <p className="font-semibold text-foreground text-sm">
                  {g.name || (g.type === 'required' ? t('admin.menuItemForm.requiredChoiceBadge') : t('admin.menuItemForm.optionalExtrasBadge'))}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${g.type === 'required' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  {g.type === 'required' ? t('customer.required') : t('customer.optional')}
                </span>
              </div>
              <div className="space-y-2">
                {g.options.map((o) => (
                  <label
                    key={o.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      (g.type === 'required' ? selections[g.id] === o.id : !!selections[g.id]?.[o.id])
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {g.type === 'required' ? (
                        <input
                          type="radio"
                          name={g.id}
                          checked={selections[g.id] === o.id}
                          onChange={() => setSelections((s) => ({ ...s, [g.id]: o.id }))}
                          className="accent-primary"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={!!selections[g.id]?.[o.id]}
                          onChange={(e) => setSelections((s) => ({ ...s, [g.id]: { ...s[g.id], [o.id]: e.target.checked } }))}
                          className="accent-primary"
                        />
                      )}
                      <span className="text-sm text-foreground">{o.name}</span>
                    </div>
                    {g.type === 'extras' && Number(o.price) > 0 && (
                      <span className="text-sm text-primary font-medium shrink-0">+{formatCurrency(Number(o.price))}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border shrink-0">
          <button
            onClick={handleAdd}
            disabled={!isValid}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {t('customer.addToCart')}{extraTotal > 0 ? ` · ${formatCurrency(item.price + extraTotal)}` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Menu Item Card ─────────────────────────────────────────────────────────────
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
          t={t}
        />
      )}
    </>
  );
};

// ── Menu Display ───────────────────────────────────────────────────────────────
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
