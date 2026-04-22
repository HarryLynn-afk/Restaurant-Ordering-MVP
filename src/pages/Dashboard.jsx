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
import { Upload, Plus, Pencil, Trash2, LogOut, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import compressImage from '../utils/compressImage';
import { requestNotificationToken, onForegroundMessage } from '../firebase';
import {
  ACTIVE_ADMIN_STATUSES,
  ADMIN_STATUS_FILTERS,
  normalizeAdminStatus,
} from '../utils/orderStatus';
import { formatCurrency } from '../utils/currency';

// ─── Orders Tab ───────────────────────────────────────────────────────────────
const matchesStatusFilter = (order, filter) => (
  filter === 'all' || normalizeAdminStatus(order.status) === filter
);

const todayMidnight = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const OrdersTab = ({ orders }) => {
  const [filter, setFilter] = useState('new');
  const [selectedDate, setSelectedDate] = useState(todayMidnight);
  const [search, setSearch] = useState('');
  const dateInputRef = useRef();

  const isSearching = search.trim().length > 0;
  const searchLower = search.trim().toLowerCase();

  const searchResults = isSearching
    ? orders.filter((o) =>
        o.customerName?.toLowerCase().includes(searchLower) ||
        o.phone?.toLowerCase().includes(searchLower) ||
        o.id?.toLowerCase().includes(searchLower) ||
        o.items?.some((item) => item.name?.toLowerCase().includes(searchLower))
      )
    : [];

  const today = todayMidnight();
  const isToday = selectedDate.getTime() === today.getTime();

  const goDay = (dir) => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir);
      return d;
    });
  };

  const handleDatePick = (e) => {
    if (!e.target.value) return;
    const [y, m, day] = e.target.value.split('-').map(Number);
    const d = new Date(y, m - 1, day);
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
  };

  const dateLabel = isToday
    ? 'Today'
    : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const visibleOrders = orders.filter((o) => {
    const d = o.createdAt?.toDate?.();
    if (!d) return false;
    const od = new Date(d);
    od.setHours(0, 0, 0, 0);
    return od.getTime() === selectedDate.getTime();
  });

  const sorted = [...visibleOrders].sort((a, b) =>
    (ACTIVE_ADMIN_STATUSES.includes(normalizeAdminStatus(a.status)) ? 0 : 1)
      - (ACTIVE_ADMIN_STATUSES.includes(normalizeAdminStatus(b.status)) ? 0 : 1)
  );

  const filtered = sorted.filter((o) => matchesStatusFilter(o, filter));

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, order ID, or item..."
          className="w-full border border-border rounded-xl pl-8 pr-8 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        )}
      </div>

      {isSearching ? (
        <>
          <p className="text-xs text-muted-foreground">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{search.trim()}"</p>
          {searchResults.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">No orders found.</div>
          ) : (
            <div className="space-y-4">{searchResults.map((order) => <OrderCard key={order.id} order={order} />)}</div>
          )}
        </>
      ) : (
      <>

      {/* Day navigator */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => goDay(-1)}
          className="p-1.5 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => dateInputRef.current?.showPicker?.()}
          className="text-sm font-semibold text-foreground px-4 py-1.5 rounded-lg hover:bg-muted transition-colors min-w-[130px] text-center"
        >
          {dateLabel}
        </button>
        <input
          ref={dateInputRef}
          type="date"
          value={selectedDate.toISOString().split('T')[0]}
          max={today.toISOString().split('T')[0]}
          onChange={handleDatePick}
          className="absolute opacity-0 pointer-events-none w-0 h-0"
        />
        <button
          onClick={() => goDay(1)}
          disabled={isToday}
          className="p-1.5 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
        {ADMIN_STATUS_FILTERS.map((f) => (
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
                ({visibleOrders.filter((o) => matchesStatusFilter(o, f.key)).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {isToday ? `No ${filter === 'all' ? '' : filter + ' '}orders today.` : `No orders on ${dateLabel}.`}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => <OrderCard key={order.id} order={order} />)}
        </div>
      )}
      </>
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
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

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

  const isSearching = search.length > 0;
  const searchLower = search.toLowerCase();
  const hasSoldOut = menuItems.some((item) => item.soldOut);
  const usedCategories = categories.filter((cat) => menuItems.some((item) => item.category === cat));
  const hasUncategorized = menuItems.some((item) => !item.category || !categories.includes(item.category));

  const getDisplayItems = () => {
    const pool = isSearching
      ? menuItems.filter((item) => item.name.toLowerCase().includes(searchLower))
      : menuItems;
    if (isSearching || activeTab === 'all') return pool;
    if (activeTab === '__uncat__') return pool.filter((i) => !i.category || !categories.includes(i.category));
    return pool.filter((i) => i.category === activeTab);
  };

  const displayItems = getDisplayItems();

  const renderItem = (item) => (
    <div key={item.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
      <img src={item.imageUrl || '/placeholder.svg'} alt={item.name} className="w-16 h-16 object-cover rounded-xl shrink-0 bg-muted" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">{item.name}</p>
        <p className="text-sm text-muted-foreground truncate">{item.description}</p>
        <p className="text-primary font-bold text-sm mt-0.5">{formatCurrency(item.price)}</p>
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

  const renderGrouped = (items) => {
    const groups = categories
      .map((cat) => ({ name: cat, items: items.filter((i) => i.category === cat) }))
      .filter((g) => g.items.length > 0);
    const uncat = items.filter((i) => !i.category || !categories.includes(i.category));
    return (
      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.name} className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5">{g.name}</h3>
            {g.items.map(renderItem)}
          </div>
        ))}
        {uncat.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5">Uncategorized</h3>
            {uncat.map(renderItem)}
          </div>
        )}
      </div>
    );
  };

  const showGrouped = (isSearching || activeTab === 'all') && categories.length > 0;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items..."
          className="w-full border border-border rounded-xl pl-8 pr-8 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category tabs */}
      {!isSearching && usedCategories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${activeTab === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
          >
            All ({menuItems.length})
          </button>
          {usedCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${activeTab === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {cat} ({menuItems.filter((i) => i.category === cat).length})
            </button>
          ))}
          {hasUncategorized && (
            <button
              onClick={() => setActiveTab('__uncat__')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${activeTab === '__uncat__' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              Uncategorized ({menuItems.filter((i) => !i.category || !categories.includes(i.category)).length})
            </button>
          )}
        </div>
      )}

      {/* Action bar */}
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

      {/* Items */}
      {displayItems.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {isSearching ? `No items matching "${search}".` : 'No items here.'}
        </div>
      ) : showGrouped ? (
        renderGrouped(displayItems)
      ) : (
        <div className="space-y-3">{displayItems.map(renderItem)}</div>
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
  const [form, setForm] = useState({ restaurantName: '', lineId: '', qrCodeUrl: '', busyMessage: '' });
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [innerTab, setInnerTab] = useState('general');
  const [editing, setEditing] = useState(false);
  const fileRef = useRef();
  const savedFormRef = useRef({ restaurantName: '', lineId: '', qrCodeUrl: '', busyMessage: '' });

  useEffect(() => {
    getDoc(doc(db, 'settings', 'restaurant')).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const loaded = { restaurantName: data.restaurantName || '', lineId: data.lineId || '', qrCodeUrl: data.qrCodeUrl || '', busyMessage: data.busyMessage || '' };
        setForm(loaded);
        savedFormRef.current = loaded;
        setQrPreview(data.qrCodeUrl || '');
        setCategories(data.categories || []);
      }
    });
  }, []);

  const handleCancel = () => {
    setForm(savedFormRef.current);
    setQrPreview(savedFormRef.current.qrCodeUrl);
    setQrFile(null);
    setEditing(false);
  };

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
        const compressed = await compressImage(qrFile, { maxWidth: 800, quality: 0.9 });
        const storageRef = ref(storage, `settings/qr_${Date.now()}`);
        await uploadBytes(storageRef, compressed);
        qrCodeUrl = await getDownloadURL(storageRef);
        setUploading(false);
      }
      await setDoc(doc(db, 'settings', 'restaurant'), { ...form, qrCodeUrl }, { merge: true });
      const updated = { ...form, qrCodeUrl };
      setForm(updated);
      savedFormRef.current = updated;
      setEditing(false);
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

      {innerTab === 'general' && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Restaurant Info</h3>
            {!editing && (
              <button type="button" onClick={() => setEditing(true)} className="text-sm text-primary hover:opacity-80 transition-opacity">
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
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

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">Busy Mode Message</label>
                <input
                  type="text"
                  value={form.busyMessage}
                  onChange={(e) => setForm((f) => ({ ...f, busyMessage: e.target.value }))}
                  placeholder="e.g. We're busy — orders may take 45+ min"
                  className={inputClass}
                />
                <p className="text-xs text-muted-foreground">Shown to customers when Busy is toggled on.</p>
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

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 border border-border py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {uploading ? 'Uploading QR...' : saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Restaurant Name</p>
                <p className="text-sm text-foreground">{form.restaurantName || '—'}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">LINE ID</p>
                <p className="text-sm text-foreground">{form.lineId || '—'}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Busy Mode Message</p>
                <p className="text-sm text-foreground">{form.busyMessage || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Payment QR Code</p>
                {qrPreview ? (
                  <img src={qrPreview} alt="QR" className="w-28 h-28 object-contain border border-border rounded-xl" />
                ) : (
                  <p className="text-sm text-muted-foreground">Not set</p>
                )}
              </div>
            </div>
          )}
        </>
      )}

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

  // Real-time categories + busy mode
  useEffect(() => {
    return onSnapshot(doc(db, 'settings', 'restaurant'), (snap) => {
      const data = snap.data() || {};
      setCategories(data.categories || []);
      setBusyMode(data.busyMode || false);
    });
  }, []);

  const [busyMode, setBusyMode] = useState(false);
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

  const handleBusyToggle = async () => {
    const next = !busyMode;
    setBusyMode(next);
    await setDoc(doc(db, 'settings', 'restaurant'), { busyMode: next }, { merge: true });
  };

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
              onClick={handleBusyToggle}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                busyMode
                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                  : 'border-border text-muted-foreground'
              }`}
            >
              {busyMode ? 'Busy' : 'Not Busy'}
            </button>
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
