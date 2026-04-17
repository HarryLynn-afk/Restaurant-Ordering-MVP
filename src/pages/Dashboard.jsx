import { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db, storage } from '../firebase';
import {
  collection, onSnapshot, orderBy, query,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDoc, setDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import OrderCard from '../components/OrderCard';
import MenuItemForm from '../components/MenuItemForm';
import { Upload, Plus, Pencil, Trash2, LogOut } from 'lucide-react';

// ─── Orders Tab ───────────────────────────────────────────────────────────────
const STATUS_FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'unpaid',    label: 'Awaiting Payment' },
  { key: 'paid',      label: 'Paid' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready',     label: 'Ready' },
  { key: 'delivered', label: 'Delivered' },
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
const MenuTab = ({ menuItems }) => {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editItem) {
        await updateDoc(doc(db, 'menuItems', editItem.id), data);
      } else {
        await addDoc(collection(db, 'menuItems'), { ...data, createdAt: serverTimestamp() });
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
    if (!confirm('Delete this item?')) return;
    await deleteDoc(doc(db, 'menuItems', id));
  };

  const handleToggleSoldOut = async (item) => {
    await updateDoc(doc(db, 'menuItems', item.id), { soldOut: !item.soldOut });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => { setEditItem(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90"
        >
          <Plus size={16} /> Add Item
        </button>
      </div>

      {menuItems.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No menu items yet. Click "Add Item" to get started.</div>
      ) : (
        <div className="space-y-3">
          {menuItems.map((item) => (
            <div key={item.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
              <img
                src={item.imageUrl || '/placeholder.svg'}
                alt={item.name}
                className="w-16 h-16 object-cover rounded-xl shrink-0 bg-muted"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{item.name}</p>
                <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                <p className="text-primary font-bold text-sm mt-0.5">${item.price?.toLocaleString()}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {/* Sold out toggle */}
                <button
                  onClick={() => handleToggleSoldOut(item)}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.soldOut ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}
                >
                  {item.soldOut ? 'Sold Out' : 'Available'}
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditItem(item); setShowForm(true); }}
                    className="p-1.5 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg bg-muted hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <MenuItemForm
          initial={editItem}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditItem(null); }}
          saving={saving}
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
  const fileRef = useRef();

  useEffect(() => {
    getDoc(doc(db, 'settings', 'restaurant')).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setForm({ restaurantName: data.restaurantName || '', lineId: data.lineId || '', qrCodeUrl: data.qrCodeUrl || '' });
        setQrPreview(data.qrCodeUrl || '');
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
      await setDoc(doc(db, 'settings', 'restaurant'), { ...form, qrCodeUrl });
      setForm((f) => ({ ...f, qrCodeUrl }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const inputClass = 'border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full';

  return (
    <form onSubmit={handleSave} className="max-w-md space-y-5">
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
            <button
              type="button"
              onClick={() => fileRef.current.click()}
              className="text-sm text-primary underline"
            >
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
        {uploading ? 'Uploading QR...' : saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Settings'}
      </button>
    </form>
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
  const navigate = useNavigate();

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

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const unpaidCount = orders.filter((o) => o.status === 'unpaid').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
            {unpaidCount > 0 && (
              <p className="text-xs text-red-500 font-medium">{unpaidCount} order{unpaidCount !== 1 ? 's' : ''} awaiting payment</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut size={16} /> Log Out
          </button>
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
        {activeTab === 'orders'   && <OrdersTab orders={orders} />}
        {activeTab === 'menu'     && <MenuTab menuItems={menuItems} />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
};

export default Dashboard;
