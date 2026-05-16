import { useState, useEffect, useRef } from 'react';
import { ensureCustomerSession } from '../firebase';
import useCart from '../hooks/useCart';
import { useNavigate } from 'react-router-dom';
import MenuDisplay from '../components/MenuDisplay';
import CartDrawer from '../components/CartDrawer';
import LanguageToggle from '../components/LanguageToggle';
import { ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { useCustomerLanguage } from '../utils/i18n';
import { isTerminalOrderStatus } from '../utils/orderStatus';
import { getOrder } from '../services/orders';
import { subscribeToMenu } from '../services/menu';
import { subscribeToSettings } from '../services/settings';

const OrderPage = () => {
  const { t } = useCustomerLanguage();
  const MENU_CACHE_KEY = 'menuCache';
  const cachedMenu = (() => { try { return JSON.parse(localStorage.getItem(MENU_CACHE_KEY)) || []; } catch { return []; } })();
  const [menuItems, setMenuItems] = useState(cachedMenu);
  const { cart, addItem, removeItem, purgeIds, totalItems, totalPrice } = useCart();
  const [removedNotice, setRemovedNotice] = useState(null);
  const noticeTimerRef = useRef(null);
  const isFirstMenuLoadRef = useRef(true);
  const [restaurantName, setRestaurantName] = useState('');
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(cachedMenu.length === 0);
  const [fetchError, setFetchError] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [storeClosed, setStoreClosed] = useState(false);
  const [busyMode, setBusyMode] = useState(false);
  const [busyMessage, setBusyMessage] = useState('');
  const [closedCategories, setClosedCategories] = useState([]);
  const [categoryModifiers, setCategoryModifiers] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const lastOrderId = localStorage.getItem('lastOrderId');
    if (!lastOrderId) return;
    ensureCustomerSession()
      .then(() => getOrder(lastOrderId))
      .then((order) => {
        if (order && !isTerminalOrderStatus(order.status)) {
          navigate(`/order/${lastOrderId}`, { replace: true });
        } else {
          localStorage.removeItem('lastOrderId');
        }
      })
      .catch(() => localStorage.removeItem('lastOrderId'));
  }, [navigate]);

  useEffect(() => subscribeToSettings((data) => {
    if (data.restaurantName) setRestaurantName(data.restaurantName);
    setCategories(data.categories || []);
    setStoreClosed(data.storeClosed || false);
    setBusyMode(data.busyMode || false);
    setBusyMessage(data.busyMessage || '');
    setClosedCategories(data.closedCategories || []);
    setCategoryModifiers(data.categoryModifiers || {});
  }), []);

  useEffect(() => {
    const unsubscribe = subscribeToMenu((items) => {
      localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(items));
      setMenuItems(items);
      setLoading(false);

      const soldOutIds = new Set(items.filter(i => i.soldOut).map(i => i.id));
      const removed = purgeIds(soldOutIds);
      if (removed.length > 0 && !isFirstMenuLoadRef.current) {
        clearTimeout(noticeTimerRef.current);
        setRemovedNotice(removed.map(i => i.name));
        noticeTimerRef.current = setTimeout(() => setRemovedNotice(null), 5000);
      }
      isFirstMenuLoadRef.current = false;
    }, (err) => {
      setFetchError(err.message);
      setLoading(false);
    });
    return () => {
      unsubscribe();
      clearTimeout(noticeTimerRef.current);
    };
  }, [purgeIds]);

  const visibleItems = menuItems.filter((item) => !closedCategories.includes(item.category));
  const usedCategories = categories.filter((cat) => !closedCategories.includes(cat) && visibleItems.some((item) => item.category === cat));
  const filteredItems = (activeCategory === 'all' ? visibleItems : visibleItems.filter((item) => item.category === activeCategory))
    .slice()
    .sort((a, b) => (a.soldOut ? 1 : 0) - (b.soldOut ? 1 : 0));

  const handleCheckout = () => {
    navigate('/checkout', { state: { cart } });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="NOONA" className="h-10 w-10 rounded-full object-cover" />
            <h1 className="text-xl font-bold text-foreground">{restaurantName || t('customer.restaurantFallback')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle scope="customer" />
            {!storeClosed && (
              <button
                onClick={() => setCartOpen(true)}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full relative"
              >
                <ShoppingCart size={18} />
                <span className="font-medium">{formatCurrency(totalPrice)}</span>
                {totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
        {usedCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 px-4 [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium shrink-0 transition-colors ${
                activeCategory === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('common.all')}
            </button>
            {usedCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium shrink-0 transition-colors ${
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
        {storeClosed && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-3">
            <p className="text-sm text-red-700 font-medium text-center">
              {t('customer.storeClosedTitle')}
            </p>
          </div>
        )}
        {!storeClosed && busyMode && (
          <div className="bg-orange-50 border-b border-orange-200 px-4 py-3">
            <p className="text-sm text-orange-700 font-medium text-center">
              {busyMessage || t('customer.busyDefault')}
            </p>
          </div>
        )}
      </header>

      <main className="container mx-auto px-4 py-6">
        {removedNotice && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start justify-between gap-3">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{t('customer.cartSoldOutRemovedTitle')}</span>{' '}
              {removedNotice.join(', ')}
            </p>
            <button onClick={() => setRemovedNotice(null)} className="text-amber-500 shrink-0 hover:text-amber-700 text-lg leading-none">✕</button>
          </div>
        )}
        {storeClosed ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <p className="text-2xl font-bold text-foreground">{t('customer.storeClosedTitle')}</p>
            <p className="text-muted-foreground text-sm max-w-xs">{t('customer.storeClosedMessage')}</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <p className="text-muted-foreground">{t('customer.loadingMenu')}</p>
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center py-16 gap-2">
            <p className="text-red-500 font-medium">{t('customer.failedToLoadMenu')}</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">{fetchError}</p>
          </div>
        ) : filteredItems.length === 0 && activeCategory !== 'all' ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground text-sm">{t('customer.noItemsInCategory')}</p>
          </div>
        ) : (
          <MenuDisplay menuItems={filteredItems} cart={cart} onAddToCart={addItem} onRemoveFromCart={removeItem} categoryModifiers={categoryModifiers} />
        )}
      </main>

      <CartDrawer
        open={cartOpen}
        cart={cart}
        onClose={() => setCartOpen(false)}
        onAddItem={addItem}
        onRemoveItem={removeItem}
        totalPrice={totalPrice}
        onCheckout={handleCheckout}
      />
    </div>
  );
};

export default OrderPage;
