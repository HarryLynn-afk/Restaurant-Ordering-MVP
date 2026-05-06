import { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import {
  collection, onSnapshot, orderBy, query, where, Timestamp,
  doc, setDoc,
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import LanguageToggle from '../components/LanguageToggle';
import { LogOut, ClipboardList, UtensilsCrossed, Settings } from 'lucide-react';
import { useAdminLanguage } from '../utils/i18n';
import OrdersTab from './dashboard/OrdersTab';
import MenuTab from './dashboard/MenuTab';
import SettingsTab from './dashboard/SettingsTab';

const Dashboard = () => {
  const { language, t } = useAdminLanguage();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();
  const alertAudioRef = useRef(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [ordersFilter, setOrdersFilter] = useState('new');
  const [busyMode, setBusyMode] = useState(false);
  const [storeClosed, setStoreClosed] = useState(false);
  const [closedCategories, setClosedCategories] = useState([]);
  const [categoryModifiers, setCategoryModifiers] = useState({});
  const [storeConfirm, setStoreConfirm] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [soundModal, setSoundModal] = useState(false);

  // Real-time orders — last 7 days only
  useEffect(() => {
    const cutoff = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const q = query(collection(db, 'orders'), where('createdAt', '>=', cutoff), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Real-time menu
  useEffect(() => {
    const q = query(collection(db, 'menuItems'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setMenuItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Real-time categories + busy mode + closedCategories
  useEffect(() => {
    return onSnapshot(doc(db, 'settings', 'restaurant'), (snap) => {
      const data = snap.data() || {};
      setCategories(data.categories || []);
      setBusyMode(data.busyMode || false);
      setStoreClosed(data.storeClosed || false);
      setClosedCategories(data.closedCategories || []);
      setCategoryModifiers(data.categoryModifiers || {});
    });
  }, []);

  const getAlertAudio = () => {
    if (!alertAudioRef.current) {
      alertAudioRef.current = new Audio('/alert_sound.mp3');
      alertAudioRef.current.loop = true;
    }
    return alertAudioRef.current;
  };

  // Alarm tied to new orders state — starts/stops automatically
  useEffect(() => {
    const hasNew = orders.some((o) => o.status === 'new');
    const audio = getAlertAudio();
    if (hasNew && soundEnabled) {
      audio.play()
        .then(() => setSoundBlocked(false))
        .catch(() => { setSoundBlocked(true); setSoundModal(true); });
    } else {
      audio.pause();
      audio.currentTime = 0;
      setSoundBlocked(false);
    }
  }, [orders, soundEnabled]);

  // Cleanup audio on unmount
  useEffect(() => () => {
    if (alertAudioRef.current) {
      alertAudioRef.current.pause();
      alertAudioRef.current = null;
    }
  }, []);

  const handleBusyToggle = async () => {
    const next = !busyMode;
    setBusyMode(next);
    await setDoc(doc(db, 'settings', 'restaurant'), { busyMode: next }, { merge: true });
  };

  const handleStoreClosedToggle = async () => {
    const next = !storeClosed;
    setStoreClosed(next);
    await setDoc(doc(db, 'settings', 'restaurant'), { storeClosed: next }, { merge: true });
  };

  const handleToggleCategory = async (cat) => {
    const next = closedCategories.includes(cat)
      ? closedCategories.filter((c) => c !== cat)
      : [...closedCategories, cat];
    setClosedCategories(next);
    await setDoc(doc(db, 'settings', 'restaurant'), { closedCategories: next }, { merge: true });
  };

  const handleSaveCategories = async (updated) => {
    await setDoc(doc(db, 'settings', 'restaurant'), { categories: updated }, { merge: true });
  };

  const handleSaveCategoryModifiers = async (updated) => {
    await setDoc(doc(db, 'settings', 'restaurant'), { categoryModifiers: updated }, { merge: true });
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const newOrderCount = orders.filter((o) => o.status === 'new').length;
  const orderSuffix = language === 'en' && newOrderCount !== 1 ? 's' : '';
  const tabs = [
    { key: 'orders', label: t('admin.dashboard.ordersTab') },
    { key: 'menu', label: t('admin.dashboard.menuTab') },
    { key: 'settings', label: t('admin.dashboard.settingsTab') },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        {/* Title row */}
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground">{t('admin.dashboard.title')}</h1>
            {newOrderCount > 0 && (
              <p className="text-xs text-orange-500 font-medium animate-pulse">
                {t('admin.dashboard.newOrdersNeedAction', { count: newOrderCount, suffix: orderSuffix })}
              </p>
            )}
          </div>
          {/* Desktop controls */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <LanguageToggle scope="admin" />
            <button
              onClick={() => setStoreConfirm(true)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                storeClosed ? 'border-red-500 text-red-600 bg-red-50' : 'border-green-500 text-green-600 bg-green-50'
              }`}
            >
              {storeClosed ? t('admin.dashboard.storeClosed') : t('admin.dashboard.storeOpen')}
            </button>
            <button
              onClick={handleBusyToggle}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                busyMode ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-border text-muted-foreground'
              }`}
            >
              {busyMode ? t('admin.dashboard.busy') : t('admin.dashboard.notBusy')}
            </button>
            <button
              onClick={() => setSoundEnabled((v) => !v)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                soundEnabled ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground'
              }`}
            >
              {soundEnabled ? t('admin.dashboard.soundOn') : t('admin.dashboard.soundOff')}
            </button>
            <button onClick={() => setLogoutConfirm(true)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <LogOut size={16} /> {t('admin.dashboard.logOut')}
            </button>
          </div>
          {/* Mobile logout icon */}
          <button onClick={() => setLogoutConfirm(true)} className="sm:hidden p-2 text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <LogOut size={20} />
          </button>
        </div>

        {/* Mobile controls row */}
        <div className="sm:hidden flex gap-2 overflow-x-auto px-4 pb-3 [&::-webkit-scrollbar]:hidden">
          <LanguageToggle scope="admin" />
          <button
            onClick={() => setStoreConfirm(true)}
            className={`text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap shrink-0 transition-colors ${
              storeClosed ? 'border-red-500 text-red-600 bg-red-50' : 'border-green-500 text-green-600 bg-green-50'
            }`}
          >
            {storeClosed ? t('admin.dashboard.storeClosed') : t('admin.dashboard.storeOpen')}
          </button>
          <button
            onClick={handleBusyToggle}
            className={`text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap shrink-0 transition-colors ${
              busyMode ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-border text-muted-foreground'
            }`}
          >
            {busyMode ? t('admin.dashboard.busy') : t('admin.dashboard.notBusy')}
          </button>
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap shrink-0 transition-colors ${
              soundEnabled ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground'
            }`}
          >
            {soundEnabled ? t('admin.dashboard.soundOn') : t('admin.dashboard.soundOff')}
          </button>
        </div>

        {/* Tab Bar — desktop only */}
        <div className="hidden sm:flex container mx-auto px-4 gap-1 pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Tab Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl pb-24 sm:pb-6">
        {/* Persistent new-order banner */}
        {newOrderCount > 0 && (
          <div className="mb-4 p-4 rounded-xl border-2 border-orange-400 bg-orange-50 flex items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-bold text-orange-700">
                {t('admin.dashboard.newOrdersWaiting', { count: newOrderCount, suffix: orderSuffix })}
              </p>
              <p className="text-xs text-orange-600 mt-0.5">{t('admin.dashboard.acceptOrCancel')}</p>
            </div>
            <button
              onClick={() => { setActiveTab('orders'); setOrdersFilter('new'); }}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shrink-0 hover:bg-orange-600 transition-colors"
            >
              {t('admin.dashboard.viewOrders')}
            </button>
          </div>
        )}

        {activeTab === 'orders'   && <OrdersTab orders={orders} filter={ordersFilter} setFilter={setOrdersFilter} />}
        {activeTab === 'menu'     && <MenuTab menuItems={menuItems} categories={categories} closedCategories={closedCategories} onToggleCategory={handleToggleCategory} onSaveCategories={handleSaveCategories} categoryModifiers={categoryModifiers} onSaveCategoryModifiers={handleSaveCategoryModifiers} />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-10">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 relative flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                activeTab === tab.key ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {tab.key === 'orders' && <ClipboardList size={20} />}
              {tab.key === 'menu' && <UtensilsCrossed size={20} />}
              {tab.key === 'settings' && <Settings size={20} />}
              <span>{tab.label}</span>
              {tab.key === 'orders' && newOrderCount > 0 && (
                <span className="absolute top-2 left-1/2 ml-2 min-w-[16px] h-4 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center px-1">
                  {newOrderCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {soundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSoundModal(false)} />
          <div className="relative bg-card rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="font-bold text-foreground text-lg">{t('admin.dashboard.enableSoundTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('admin.dashboard.enableSoundMessage')}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSoundModal(false)}
                className="flex-1 border border-border py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  getAlertAudio().play().then(() => setSoundBlocked(false)).catch(() => {});
                  setSoundModal(false);
                }}
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                {t('admin.dashboard.enableSound')}
              </button>
            </div>
          </div>
        </div>
      )}

      {storeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setStoreConfirm(false)} />
          <div className="relative bg-card rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="font-bold text-foreground text-lg">
                {storeClosed ? t('admin.dashboard.storeOpen') : t('admin.dashboard.storeClosed')}?
              </h3>
              <p className="text-sm text-muted-foreground">
                {storeClosed
                  ? t('admin.dashboard.storeOpenConfirmMessage')
                  : t('admin.dashboard.storeClosedConfirmMessage')}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStoreConfirm(false)}
                className="flex-1 border border-border py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => { handleStoreClosedToggle(); setStoreConfirm(false); }}
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {logoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setLogoutConfirm(false)} />
          <div className="relative bg-card rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="font-bold text-foreground text-lg">{t('admin.dashboard.logOut')}?</h3>
              <p className="text-sm text-muted-foreground">{t('admin.dashboard.logoutConfirmMessage')}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setLogoutConfirm(false)}
                className="flex-1 border border-border py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                {t('admin.dashboard.logOut')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
