import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import OrderForm from '../components/OrderForm';
import LanguageToggle from '../components/LanguageToggle';
import { formatCurrency } from '../utils/currency';
import { useCustomerLanguage } from '../utils/i18n';

const STORAGE_KEY = 'customerInfo';

const loadSaved = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
};

const CheckoutPage = () => {
  const { t } = useCustomerLanguage();
  const { state } = useLocation();
  const navigate = useNavigate();
  const cart = state?.cart || [];
  const [soldOutWarnings, setSoldOutWarnings] = useState([]);

  useEffect(() => {
    if (cart.length === 0) return;
    getDocs(collection(db, 'menuItems')).then((snap) => {
      const soldOutIds = snap.docs
        .filter((d) => d.data().soldOut)
        .map((d) => d.id);
      const warnings = cart
        .filter((i) => soldOutIds.includes(i.id))
        .map((i) => i.name);
      setSoldOutWarnings(warnings);
    }).catch(() => {});
  }, []);

  const saved = loadSaved();
  const [form, setForm] = useState({
    customerName: saved.customerName || '',
    phone: saved.phone || '',
    address: saved.address || '',
    notes: saved.notes || '',
    lineId: saved.lineId || '',
  });
  const [hasSaved, setHasSaved] = useState(!!saved.customerName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.customerName.trim()) errs.customerName = t('customer.validation.nameRequired');
    if (!form.phone.trim()) {
      errs.phone = t('customer.validation.phoneRequired');
    } else if (!/^0[689]\d{8}$/.test(form.phone.trim())) {
      errs.phone = t('customer.validation.phoneInvalid');
    }
    if (!form.address.trim()) errs.address = t('customer.validation.addressRequired');
    if (form.lineId.trim() && !/^[a-zA-Z][a-zA-Z0-9._-]{3,19}$/.test(form.lineId.trim())) {
      errs.lineId = t('customer.validation.lineIdInvalid');
    }
    return errs;
  };

  const handleClearInfo = () => {
    localStorage.removeItem(STORAGE_KEY);
    setForm({ customerName: '', phone: '', address: '', notes: '', lineId: '' });
    setHasSaved(false);
  };

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{t('customer.cartEmpty')}</p>
        <button onClick={() => navigate('/')} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium">
          {t('customer.backToMenu')}
        </button>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    setError('');
    try {
      const items = cart.map(({ id, name, price, quantity }) => ({ id, name, price, quantity }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        customerName: form.customerName,
        phone: form.phone,
        address: form.address,
        notes: form.notes,
        lineId: form.lineId,
      }));
      const docRef = await addDoc(collection(db, 'orders'), {
        ...form,
        items,
        total,
        status: 'new',
        paymentSlipUrl: null,
        paymentSlipPath: null,
        createdAt: serverTimestamp(),
      });
      localStorage.setItem('lastOrderId', docRef.id);
      localStorage.removeItem('cart');
      navigate(`/order/${docRef.id}`);
    } catch {
      setError(t('customer.genericError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">←</button>
            <h1 className="text-xl font-bold text-foreground">{t('customer.checkoutTitle')}</h1>
          </div>
          <LanguageToggle scope="customer" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-6">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-foreground">{t('customer.orderSummary')}</h2>
          {cart.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-foreground">{item.name} × {item.quantity}</span>
              <span className="text-foreground font-medium">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-border pt-3 flex justify-between font-bold text-foreground">
            <span>{t('common.total')}</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-foreground">{t('customer.deliveryInfo')}</h2>
            {hasSaved && (
              <button
                type="button"
                onClick={handleClearInfo}
                className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
              >
                {t('customer.clearInfo')}
              </button>
            )}
          </div>
          <form id="checkout-form" onSubmit={handleSubmit}>
            <OrderForm values={form} onChange={setForm} errors={fieldErrors} />
          </form>
        </div>

        {soldOutWarnings.length > 0 && (
          <div className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            <p className="font-medium mb-1">{t('customer.soldOutWarningTitle')}</p>
            <ul className="list-disc list-inside">{soldOutWarnings.map((n) => <li key={n}>{n}</li>)}</ul>
            <p className="mt-1">{t('customer.soldOutWarningBody')}</p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          form="checkout-form"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? t('customer.placingOrder') : t('customer.confirmPay')}
        </button>
      </main>
    </div>
  );
};

export default CheckoutPage;
