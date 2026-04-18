import { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db, storage } from '../firebase';
import {
  collection, onSnapshot, orderBy, query,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDoc, setDoc, arrayUnion,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import OrderCard from '../components/OrderCard';
import MenuItemForm from '../components/MenuItemForm';
import { Upload, Plus, Pencil, Trash2, LogOut, ChevronUp, ChevronDown } from 'lucide-react';
import { requestNotificationToken, onForegroundMessage } from '../firebase';

// ─── Orders Tab ───────────────────────────────────────────────────────────────
const STATUS_FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'new',       label: 'New' },
  { key: 'unpaid',    label: 'Awaiting Payment' },
  { key: 'paid',      label: 'Paid' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready',     label: 'Ready' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const OrdersTab = ({ orders }) => {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              filter === f.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
            {f.key !== 'all' && (
              <span className="ml-1 opacity-70">
                ({orders.filter((o) => o.status === f.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No orders in this category.</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => <OrderCard key={order.id} order={order} />)}
        </div>
      )}
    </div>
  );
};

// ─── Menu Tab ─────────────────────────────────────────────────────────────────
const MenuTab = ({ menuItems, categories }) => {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [resettingAll, setResettingAll] = useState(false);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editItem) {
        await updateDoc(doc(db, 'menuItems', editItem.id), data);
      } else {
        await addDoc(collection(db, 'menuItems'), { ...data, soldOut: false, createdAt: serverTimestamp() });
      }
      setShowForm(false);
      setEditItem(null);
    } catch (err) {
      setSaving(false);
      throw err;
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'menuItems', id));
    setDeleteConfirmId(null);
  };

  const handleToggleSoldOut = async (item) => {
    await updateDoc(doc(db, 'menuItems', item.id), { soldOut: !item.soldOut });
  };

  const handleMarkAllAvailable = async () => {
    setResettingAll(true);
    try {
      const soldOutItems = menuItems.filter((item) => item.soldOut);
      await Promise.all(soldOutItems.map((item) =>
        updateDoc(doc(db, 'menuItems', item.id), { soldOut: false })
      ));
    } finally {
      setResettingAll(false);
    }
  };

  const hasSoldOut = menuItems.some((item) => item.soldOut);
  const grouped = categories
    .map((cat) => ({ name: cat, items: menuItems.filter((item) => item.category === cat) }))
    .filter((g) => g.items.length > 0);
  const uncategorized = menuItems.filter((item) => !item.category || !categories.includes(item.category));

  const renderItem = (item) => (
    <div key={item.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
      <img src={item.imageUrl || '/placeholder.svg'} alt={item.name} className="w-16 h-16 object-cover rounded-xl shrink-0 bg-muted" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">{item.name}</p>
        <p className="text-sm text-muted-foreground truncate">{item.description}</p>
        <p className="text-primary font-bold text-sm mt-0.5">${item.price?.toLocaleString()}</p>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleToggleSoldOut(item)}>
          <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${item.soldOut ? 'bg-red-500' : 'bg-green-500'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${item.soldOut ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className={`text-xs font-medium ${item.soldOut ? 'text-red-600' : 'text-green-600'}`}>
            {item.soldOut ? 'Sold Out' : 'Available'}
          </span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => { setEditItem(item); setShowForm(true); }} className="p-1.5 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors">
            <Pencil size={14} />
          </button>
          {deleteConfirmId === item.id ? (
            <div className="flex gap-1">
              <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 rounded-lg bg-muted text-xs text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={() => handleDelete(item.id)} className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600">Delete</button>
            </div>
          ) : (
            <button onClick={() => setDeleteConfirmId(item.id)} className="p-1.5 rounded-lg bg-muted hover:bg-red-500 hover:text-white transition-colors">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {hasSoldOut ? (
          <button
            onClick={handleMarkAllAvailable}
            disabled={resettingAll}
            className="text-sm text-muted-foreground border border-border px-3 py-2 rounded-xl hover:text-foreground disabled:opacity-50 transition-colors"
          >
            {resettingAll ? 'Resetting...' : 'Mark All Available'}
          </button>
        ) : <div />}
        <button
          onClick={() => { setEditItem(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90"
        >
          <Plus size={16} /> Add Item
        </button>
      </div>

      {menuItems.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No menu items yet. Click "Add Item" to get started.</div>
      ) : categories.length > 0 ? (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.name} className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5">
                {group.name}
              </h3>
              {group.items.map(renderItem)}
            </div>
          ))}
          {uncategorized.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5">
                Uncategorized
              </h3>
              {uncategorized.map(renderItem)}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {menuItems.map(renderItem)}
        </div>
      )}

      {showForm && (
        <MenuItemForm
          initial={editItem}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditItem(null); }}
          saving={saving}
          categories={categories}
        />
      )}
    </div>
  );
};

// ─── Settings Tab ─────────────────────────────────────────────────────────────
const SettingsTab = () => {
  const [form, setForm] = useState({ restaurantName: '', lineId: '', qrCodeUrl: '' });
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [innerTab, setInnerTab] = useState('general');
  const fileRef = useRef();

  useEffect(() => {
    getDoc(doc(db, 'settings', 'restaurant')).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setForm({ restaurantName: data.restaurantName || '', lineId: data.lineId || '', qrCodeUrl: data.qrCodeUrl || '' });
        setQrPreview(data.qrCodeUrl || '');
        setCategories(data.categories || []);
      }
    });
  }, []);

  const handleQrFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setQrFile(file);
    setQrPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      let qrCodeUrl = form.qrCodeUrl;
      if (qrFile) {
        setUploading(true);
        const storageRef = ref(storage, `settings/qr_${Date.now()}`);
        await uploadBytes(storageRef, qrFile);
        qrCodeUrl = await getDownloadURL(storageRef);
        setUploading(false);
      }
      await setDoc(doc(db, 'settings', 'restaurant'), { ...form, qrCodeUrl }, { merge: true });
      setForm((f) => ({ ...f, qrCodeUrl }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const saveCats = async (updated) => {
    await setDoc(doc(db, 'settings', 'restaurant'), { categories: updated }, { merge: true });
  };

  const addCategory = async () => {
    const name = newCat.trim();
    if (!name) return;
    const updated = [...categories, name];
    setCategories(updated);
    setNewCat('');
    await saveCats(updated);
  };

  const deleteCategory = async (idx) => {
    const updated = categories.filter((_, i) => i !== idx);
    setCategories(updated);
    await saveCats(updated);
  };

  const moveCategory = async (idx, dir) => {
    const updated = [...categories];
    const target = idx + dir;
    if (target < 0 || target >= updated.length) return;
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    setCategories(updated);
    await saveCats(updated);
  };

  const renameCategory = async (idx, value) => {
    const updated = [...categories];
    updated[idx] = value;
    setCategories(updated);
    await saveCats(updated);
  };

  const inputClass = 'border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full';

  const innerTabClass = (key) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      innerTab === key
        ? 'border-primary text-primary'
        : 'border-transparent text-muted-foreground hover:text-foreground'
    }`;

  return (
    <div className="max-w-md space-y-5">
      {/* Inner tab bar */}
      <div className="flex gap-1 border-b border-border">
        <button onClick={() => setInnerTab('general')} className={innerTabClass('general')}>General</button>
        <button onClick={() => setInnerTab('categories')} className={innerTabClass('categories')}>Categories</button>
      </div>

      {innerTab === 'general' && <form onSubmit={handleSave} className="space-y-5">
        <h3 className="text-sm font-semibold text-foreground">Restaurant Info</h3>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">Restaurant Name</label>
          <input
            type="text"
            value={form.restaurantName}
            onChange={(e) => setForm((f) => ({ ...f, restaurantName: e.target.value }))}
            placeholder="e.g. Thai Kitchen"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">LINE ID</label>
          <input
            type="text"
            value={form.lineId}
            onChange={(e) => setForm((f) => ({ ...f, lineId: e.target.value }))}
            placeholder="@yourlineid"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Payment QR Code</label>
          <input type="file" accept="image/*" ref={fileRef} onChange={handleQrFile} className="hidden" />
          {qrPreview ? (
            <div className="flex items-start gap-3">
              <img src={qrPreview} alt="QR" className="w-32 h-32 object-contain border border-border rounded-xl" />
              <button type="button" onClick={() => fileRef.current.click()} className="text-sm text-primary underline">
                Change QR
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current.click()}
              className="w-full border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Upload size={24} />
              <span className="text-sm">Upload QR Code</span>
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={saving || uploading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {uploading ? 'Uploading QR...' : saving ? 'Saving...' : saved ? 'Saved' : 'Save Settings'}
        </button>
      </form>}

      {innerTab === 'categories' && <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Menu Categories</h3>

        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground">No categories yet. Add one below.</p>
        )}

        <div className="space-y-2">
          {categories.map((cat, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={cat}
                onChange={(e) => {
                  const updated = [...categories];
                  updated[idx] = e.target.value;
                  setCategories(updated);
                }}
                onBlur={(e) => renameCategory(idx, e.target.value)}
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => moveCategory(idx, -1)}
                disabled={idx === 0}
                className="p-1.5 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground disabled:opacity-30 transition-colors shrink-0"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => moveCategory(idx, 1)}
                disabled={idx === categories.length - 1}
                className="p-1.5 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground disabled:opacity-30 transition-colors shrink-0"
              >
                <ChevronDown size={14} />
              </button>
              <button
                type="button"
                onClick={() => deleteCategory(idx)}
                className="p-1.5 rounded-lg bg-muted hover:bg-red-500 hover:text-white transition-colors shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
            placeholder="e.g. Rice, Drinks, Desserts"
            className={`${inputClass} flex-1`}
          />
          <button
            type="button"
            onClick={addCategory}
            disabled={!newCat.trim()}
            className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 shrink-0"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>}
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const TABS = [
  { key: 'orders',   label: 'Orders' },
  { key: 'menu',     label: 'Menu' },
  { key: 'settings', label: 'Settings' },
];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();
  const audioCtxRef = useRef(null);
  const sirenIntervalRef = useRef(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Real-time orders
  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
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

  // Real-time categories
  useEffect(() => {
    return onSnapshot(doc(db, 'settings', 'restaurant'), (snap) => {
      setCategories(snap.data()?.categories || []);
    });
  }, []);

  const [notifStatus, setNotifStatus] = useState('idle');

  const setupNotifications = async () => {
    setNotifStatus('requesting');
    console.log('[Dashboard] Setting up notifications…');
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new AudioContext(); } catch {}
    }
    const token = await requestNotificationToken();
    if (!token) {
      console.warn('[Dashboard] No token returned. Notifications will NOT work.');
      setNotifStatus('failed');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'restaurant'), { staffTokens: arrayUnion(token) }, { merge: true });
      console.log('[Dashboard] Staff token saved to Firestore:', token.substring(0, 30) + '...');
      setNotifStatus('success');
    } catch (e) {
      console.error('[Dashboard] Staff token save failed:', e);
      setNotifStatus('failed');
    }
  };

  const playSirenChirp = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(960, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(480, ctx.currentTime + 0.6);
    osc.frequency.linearRampToValueAtTime(960, ctx.currentTime + 1.2);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.2);
  };

  // Alarm tied to new orders state — starts/stops automatically
  useEffect(() => {
    const hasNew = orders.some((o) => o.status === 'new');
    if (hasNew && soundEnabled) {
      if (!sirenIntervalRef.current) {
        playSirenChirp();
        sirenIntervalRef.current = setInterval(playSirenChirp, 1400);
      }
    } else {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
  }, [orders, soundEnabled]);

  // Cleanup siren on unmount
  useEffect(() => () => { clearInterval(sirenIntervalRef.current); }, []);

  useEffect(() => {
    setupNotifications();
    onForegroundMessage(async (payload) => {
      console.log('[FCM] Foreground message received:', payload);
      const { title, body } = payload.notification || {};
      if (!title) return;
      try {
        const reg = await navigator.serviceWorker.ready;
        console.log('[FCM] SW ready, calling showNotification…');
        await reg.showNotification(title, { body });
        console.log('[FCM] showNotification call completed');
      } catch (e) {
        console.error('[FCM] showNotification FAILED:', e);
      }
    });
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const newOrderCount = orders.filter((o) => o.status === 'new').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
            {newOrderCount > 0 && (
              <p className="text-xs text-orange-500 font-medium animate-pulse">
                {newOrderCount} new order{newOrderCount !== 1 ? 's' : ''} need action
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled((v) => !v)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                soundEnabled
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-border text-muted-foreground'
              }`}
            >
              {soundEnabled ? 'Sound On' : 'Sound Off'}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut size={16} /> Log Out
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="container mx-auto px-4 flex gap-1 pb-0">
          {TABS.map((tab) => (
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
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Persistent new-order banner */}
        {newOrderCount > 0 && (
          <div className="mb-4 p-4 rounded-xl border-2 border-orange-400 bg-orange-50 flex items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-bold text-orange-700">
                {newOrderCount} new order{newOrderCount !== 1 ? 's' : ''} waiting for action
              </p>
              <p className="text-xs text-orange-600 mt-0.5">Accept or cancel each order to clear this alert.</p>
            </div>
            <button
              onClick={() => setActiveTab('orders')}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shrink-0 hover:bg-orange-600 transition-colors"
            >
              View Orders
            </button>
          </div>
        )}

        {notifStatus !== 'success' && (
          <div className="mb-4 p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-medium text-foreground">Notifications: {notifStatus}</p>
              <p className="text-xs text-muted-foreground">Click to enable browser notifications for new orders.</p>
            </div>
            <button
              onClick={setupNotifications}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium shrink-0"
            >
              Enable Notifications
            </button>
          </div>
        )}

        {activeTab === 'orders'   && <OrdersTab orders={orders} />}
        {activeTab === 'menu'     && <MenuTab menuItems={menuItems} categories={categories} />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
};

export default Dashboard;
