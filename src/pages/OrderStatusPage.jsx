import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { db, requestNotificationToken, onForegroundMessage } from '../firebase';
import LanguageToggle from '../components/LanguageToggle';
import { getCancelReasonLabel } from '../utils/cancelReasons';
import { getCustomerProgressSteps, getCustomerStatusView } from '../utils/orderStatus';
import { formatCurrency } from '../utils/currency';
import { useCustomerLanguage } from '../utils/i18n';

const isIOS = () => /ipad|iphone|ipod/.test(navigator.userAgent.toLowerCase());
const isStandalone = () => ('standalone' in navigator) && navigator.standalone;

const IOSPrompt = ({ onDismiss, t }) => (
  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
    <p className="font-semibold text-blue-900 text-sm">{t('customer.orderStatus.getNotifications')}</p>
    <p className="text-sm text-blue-700">{t('customer.orderStatus.addToHomeScreen')}</p>
    <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
      <li>{t('customer.orderStatus.tapShare')}</li>
      <li>{t('customer.orderStatus.selectAddToHome')}</li>
      <li>{t('customer.orderStatus.openFromHome')}</li>
    </ol>
    <button onClick={onDismiss} className="text-xs text-blue-500 underline">{t('customer.orderStatus.dismiss')}</button>
  </div>
);

const OrderStatusPage = () => {
  const { t } = useCustomerLanguage();
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'restaurant')).then((snap) => {
      if (snap.exists()) setSettings(snap.data());
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isIOS() && !isStandalone()) {
      setShowIOSPrompt(true);
    } else {
      requestNotificationToken().then((token) => {
        if (token) {
          updateDoc(doc(db, 'orders', orderId), { fcmToken: token }).catch(() => {});
        }
      });
      onForegroundMessage(async (payload) => {
        const { title, body } = payload.notification || {};
        if (!title) return;
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification(title, { body });
        } catch {}
      });
    }
  }, [orderId]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setOrder({ id: snap.id, ...data });
        if (data.status === 'delivered' || data.status === 'cancelled') {
          localStorage.removeItem('lastOrderId');
        }
      } else {
        setNotFound(true);
        localStorage.removeItem('lastOrderId');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [orderId]);

  const statusView = getCustomerStatusView(order?.status, t);
  const currentIndex = statusView.stepIndex;
  const progressSteps = getCustomerProgressSteps(t);
  const cancelReasonLabel = order?.cancelReason ? getCancelReasonLabel(order.cancelReason, t) : '';

  if (order?.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-foreground">{t('customer.orderStatus.title')}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">#{orderId.slice(-8).toUpperCase()}</p>
            </div>
            <LanguageToggle scope="customer" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 max-w-lg space-y-5">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center space-y-2">
            <p className="text-xl font-bold text-foreground">{t('customer.orderStatus.cancelled')}</p>
            {order.cancelReason && (
              <p className="text-sm text-muted-foreground">{t('customer.orderStatus.reasonLabel', { reason: cancelReasonLabel })}</p>
            )}
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h2 className="font-bold text-foreground text-sm">{t('common.yourOrder')}</h2>
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-foreground">{item.name} × {item.quantity}</span>
                <span className="text-foreground">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground text-sm">
              <span>{t('common.total')}</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full border border-border py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('customer.orderMoreFood')}
          </button>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{t('customer.orderStatus.orderNotFound')}</p>
        <button onClick={() => navigate('/')} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium">
          {t('customer.backToHome')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t('customer.orderStatus.title')}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">#{orderId.slice(-8).toUpperCase()}</p>
          </div>
          <LanguageToggle scope="customer" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-5">
        {showIOSPrompt && <IOSPrompt onDismiss={() => setShowIOSPrompt(false)} t={t} />}

        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 text-center">
          <p className="text-xl font-bold text-foreground">{statusView.headline}</p>
        </div>

        {order.status === 'new' && (
          <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-3">
            <div className="flex justify-center gap-2">
              <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-sm text-muted-foreground">{t('customer.orderStatus.waitingConfirm')}</p>
          </div>
        )}

        {order.status === 'unpaid' && !order.paymentSlipUrl && (
          <button
            onClick={() => navigate(`/payment/${orderId}`)}
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold text-base hover:opacity-90 transition-opacity"
          >
            {t('customer.orderStatus.payNow')}
          </button>
        )}
        {order.status === 'unpaid' && order.paymentSlipUrl && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center space-y-1">
            <p className="font-semibold text-blue-800 text-sm">{t('customer.orderStatus.slipReceived')}</p>
            <p className="text-xs text-blue-600">{t('customer.orderStatus.slipReceivedDescription')}</p>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-foreground text-sm">{t('customer.orderStatus.progress')}</h2>
          <div className="space-y-2">
            {progressSteps.map((s, idx) => {
              const done = idx <= currentIndex;
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {done ? '✓' : idx + 1}
                  </div>
                  <span className={`text-sm ${done ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {order.deliveryPhotoUrl && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h2 className="font-bold text-foreground text-sm">{t('common.deliveryPhoto')}</h2>
            <img
              src={order.deliveryPhotoUrl}
              alt="delivery"
              className="w-full max-h-64 object-cover rounded-xl border border-border"
            />
            <p className="text-xs text-muted-foreground text-center">{t('customer.orderStatus.deliveryPhotoCaption')}</p>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-foreground text-sm">{t('common.yourOrder')}</h2>
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-foreground">{item.name} × {item.quantity}</span>
              <span className="text-foreground">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground text-sm">
            <span>{t('common.total')}</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        {settings?.lineId && (
          <a
            href={`line://ti/p/~${settings.lineId.replace(/^@/, '')}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full border border-green-400 text-green-600 py-3 rounded-xl font-medium text-sm hover:bg-green-50 transition-colors"
          >
            {t('common.contactLine')}
          </a>
        )}

        <button
          onClick={() => navigate('/')}
          className="w-full border border-border py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('customer.orderMoreFood')}
        </button>
      </main>
    </div>
  );
};

export default OrderStatusPage;
