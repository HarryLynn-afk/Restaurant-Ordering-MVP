import { useState } from 'react';
import { X } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { useCustomerLanguage } from '../utils/i18n';

const ModifierSheet = ({ item, groups, onClose, onAddToCart }) => {
  const { t } = useCustomerLanguage();
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
    onAddToCart({ ...item, cartKey, price: item.price + extraTotal, modifierSummary, selections });
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

export default ModifierSheet;
