import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db, ensureCustomerSession } from '../firebase';
import { useNavigate } from 'react-router-dom';
import MenuDisplay from '../components/MenuDisplay';
import LanguageToggle from '../components/LanguageToggle';
import { ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { useCustomerLanguage } from '../utils/i18n';

const OrderPage = () => {
  const { t } = useCustomerLanguage();
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart')) || []; } catch { return []; }
  });
  const [removedNotice, setRemovedNotice] = useState(null);
  const noticeTimerRef = useRef(null);
  const isFirstMenuLoadRef = useRef(true);
  const cartRef = useRef(cart);
  cartRef.current = cart;
  const [restaurantName, setRestaurantName] = useState('');
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
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
      .then(() => getDoc(doc(db, 'orders', lastOrderId)))
      .then((snap) => {
        if (snap.exists()) {
          navigate(`/order/${lastOrderId}`, { replace: true });
        } else {
          localStorage.removeItem('lastOrderId');
        }
      })
      .catch(() => localStorage.removeItem('lastOrderId'));
  }, [navigate]);

  useEffect(() => {
    return onSnapshot(doc(db, 'settings', 'restaurant'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.restaurantName) setRestaurantName(data.restaurantName);
        setCategories(data.categories || []);
        setStoreClosed(data.storeClosed || false);
        setBusyMode(data.busyMode || false);
        setBusyMessage(data.busyMessage || '');
        setClosedCategories(data.closedCategories || []);
        setCategoryModifiers(data.categoryModifiers || {});
      }
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'menuItems'), (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMenuItems(items);
      setLoading(false);

      const soldOutIds = new Set(items.filter(i => i.soldOut).map(i => i.id));
      const removed = cartRef.current.filter(c => soldOutIds.has(c.id));
      if (removed.length > 0) {
        const newCart = cartRef.current.filter(c => !soldOutIds.has(c.id));
        setCart(newCart);
        localStorage.setItem('cart', JSON.stringify(newCart));
        if (!isFirstMenuLoadRef.current) {
          clearTimeout(noticeTimerRef.current);
          setRemovedNotice(removed.map(i => i.name));
          noticeTimerRef.current = setTimeout(() => setRemovedNotice(null), 5000);
        }
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
  }, []);

  const updateCart = (newCart) => {
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const handleAddToCart = (item) => {
    const key = item.cartKey || item.id;
    setCart((prev) => {
      const existing = prev.find((i) => (i.cartKey || i.id) === key);
      const newCart = existing
        ? prev.map((i) => (i.cartKey || i.id) === key ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { ...item, cartKey: key, quantity: 1 }];
      localStorage.setItem('cart', JSON.stringify(newCart));
      return newCart;
    });
  };

  const handleRemoveFromCart = (key) => {
    setCart((prev) => {
      const existing = prev.find((i) => (i.cartKey || i.id) === key);
      const newCart = existing.quantity === 1
        ? prev.filter((i) => (i.cartKey || i.id) !== key)
        : prev.map((i) => (i.cartKey || i.id) === key ? { ...i, quantity: i.quantity - 1 } : i);
      localStorage.setItem('cart', JSON.stringify(newCart));
      return newCart;
    });
  };

  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
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
      </header>

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
          <MenuDisplay menuItems={filteredItems} cart={cart} onAddToCart={handleAddToCart} onRemoveFromCart={handleRemoveFromCart} categoryModifiers={categoryModifiers} />
        )}
      </main>

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="bg-card w-full max-w-sm flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-bold text-foreground text-lg">{t('customer.cartTitle')}</h2>
              <button onClick={() => setCartOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
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
                      <button onClick={() => handleRemoveFromCart(item.cartKey || item.id)} className="w-7 h-7 rounded-full bg-muted text-foreground font-bold flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">−</button>
                      <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                      <button onClick={() => handleAddToCart(item)} className="w-7 h-7 rounded-full bg-muted text-foreground font-bold flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">+</button>
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
                  onClick={handleCheckout}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                >
                  {t('customer.placeOrder')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderPage;
