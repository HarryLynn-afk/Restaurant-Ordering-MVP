import { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db, storage } from '../firebase';
import {
  collection, onSnapshot, orderBy, query, where, Timestamp,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDoc, setDoc, arrayUnion,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import OrderCard from '../components/OrderCard';
import MenuItemForm from '../components/MenuItemForm';
import LanguageToggle from '../components/LanguageToggle';
import { Upload, Plus, Pencil, Trash2, LogOut, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import compressImage from '../utils/compressImage';
import { requestNotificationToken, onForegroundMessage } from '../firebase';
import {
  ACTIVE_ADMIN_STATUSES,
  getAdminStatusFilters,
  normalizeAdminStatus,
} from '../utils/orderStatus';
import { formatCurrency } from '../utils/currency';
import { useAdminLanguage } from '../utils/i18n';

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
  const { language, locale, t } = useAdminLanguage();
  const [filter, setFilter] = useState('new');
  const [selectedDate, setSelectedDate] = useState(todayMidnight);
  const [search, setSearch] = useState('');
  const dateInputRef = useRef();
  const statusFilters = getAdminStatusFilters(t);

  const isSearching = search.trim().length > 0;
  const searchLower = search.trim().toLowerCase();

  const searchResults = isSearching
    ? orders.filter((o) =>
        o.customerName?.toLowerCase().includes(searchLower) ||
        o.phone?.toLowerCase().includes(searchLower) ||
        o.id?.toLowerCase().includes(searchLower) ||
        o.address?.toLowerCase().includes(searchLower) ||
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
    ? t('admin.orders.today')
    : selectedDate.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });

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
          placeholder={t('admin.orders.searchPlaceholder')}
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
          <p className="text-xs text-muted-foreground">{t('admin.orders.searchResults', {
            count: searchResults.length,
            query: search.trim(),
            suffix: language === 'en' && searchResults.length !== 1 ? 's' : '',
          })}</p>
          {searchResults.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">{t('admin.orders.noOrdersFound')}</div>
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
        {statusFilters.map((f) => (
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
          {isToday
            ? (
              filter === 'all'
                ? t('admin.orders.noOrdersToday')
                : t('admin.orders.noFilteredOrdersToday', {
                    status: statusFilters.find((statusOption) => statusOption.key === filter)?.label || '',
                  })
            )
            : t('admin.orders.noOrdersOnDate', { date: dateLabel })}
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
const uid = () => Math.random().toString(36).slice(2);

const MenuTab = ({ menuItems, categories, closedCategories, onToggleCategory, onSaveCategories, categoryModifiers, onSaveCategoryModifiers }) => {
  const { t } = useAdminLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [resettingAll, setResettingAll] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showCatModal, setShowCatModal] = useState(false);
  const [modalCats, setModalCats] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [deleteCatConfirmIdx, setDeleteCatConfirmIdx] = useState(null);
  const [expandedCatIdx, setExpandedCatIdx] = useState(null);
  const [modalCatModifiers, setModalCatModifiers] = useState({});
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState(null);

  const openCatModal = () => {
    setModalCats([...categories]);
    setModalCatModifiers(JSON.parse(JSON.stringify(categoryModifiers || {})));
    setNewCat('');
    setDeleteCatConfirmIdx(null);
    setExpandedCatIdx(null);
    setDeleteGroupConfirm(null);
    setShowCatModal(true);
  };

  // ── Modifier helpers ────────────────────────────────────────────────────────

  const applyMods = async (updated) => {
    setModalCatModifiers(updated);
    await onSaveCategoryModifiers(updated);
  };

  const addModGroup = (catName, type) => {
    const groups = [...(modalCatModifiers[catName] || []), { id: uid(), type, name: '', options: [] }];
    applyMods({ ...modalCatModifiers, [catName]: groups });
  };

  const updateModGroupName = (catName, gIdx, value) => {
    const groups = (modalCatModifiers[catName] || []).map((g, i) => i === gIdx ? { ...g, name: value } : g);
    setModalCatModifiers((prev) => ({ ...prev, [catName]: groups }));
  };

  const saveModGroupName = (catName, gIdx, value) => {
    const groups = (modalCatModifiers[catName] || []).map((g, i) => i === gIdx ? { ...g, name: value } : g);
    applyMods({ ...modalCatModifiers, [catName]: groups });
  };

  const deleteModGroup = (catName, gIdx) => {
    const groups = (modalCatModifiers[catName] || []).filter((_, i) => i !== gIdx);
    applyMods({ ...modalCatModifiers, [catName]: groups });
    setDeleteGroupConfirm(null);
  };

  const addModOption = (catName, gIdx) => {
    const groups = (modalCatModifiers[catName] || []).map((g, i) =>
      i === gIdx ? { ...g, options: [...g.options, { id: uid(), name: '', price: 0 }] } : g
    );
    applyMods({ ...modalCatModifiers, [catName]: groups });
  };

  const updateModOption = (catName, gIdx, oIdx, field, value) => {
    const groups = (modalCatModifiers[catName] || []).map((g, i) =>
      i === gIdx ? { ...g, options: g.options.map((o, j) => j === oIdx ? { ...o, [field]: value } : o) } : g
    );
    setModalCatModifiers((prev) => ({ ...prev, [catName]: groups }));
  };

  const saveModOption = (catName, gIdx, oIdx, field, value) => {
    const groups = (modalCatModifiers[catName] || []).map((g, i) =>
      i === gIdx ? { ...g, options: g.options.map((o, j) => j === oIdx ? { ...o, [field]: value } : o) } : g
    );
    applyMods({ ...modalCatModifiers, [catName]: groups });
  };

  const deleteModOption = (catName, gIdx, oIdx) => {
    const groups = (modalCatModifiers[catName] || []).map((g, i) =>
      i === gIdx ? { ...g, options: g.options.filter((_, j) => j !== oIdx) } : g
    );
    applyMods({ ...modalCatModifiers, [catName]: groups });
  };

  const moveModalCat = async (idx, dir) => {
    const updated = [...modalCats];
    const target = idx + dir;
    if (target < 0 || target >= updated.length) return;
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    setModalCats(updated);
    await onSaveCategories(updated);
  };

  const deleteModalCat = async (idx) => {
    const catName = modalCats[idx];
    const updated = modalCats.filter((_, i) => i !== idx);
    setModalCats(updated);
    await onSaveCategories(updated);
    if (modalCatModifiers[catName]) {
      const updatedMods = { ...modalCatModifiers };
      delete updatedMods[catName];
      await applyMods(updatedMods);
    }
  };

  const addModalCat = async () => {
    const name = newCat.trim();
    if (!name) return;
    const updated = [...modalCats, name];
    setModalCats(updated);
    setNewCat('');
    await onSaveCategories(updated);
  };

  const renameModalCat = async (idx, newName) => {
    const oldName = modalCats[idx];
    const updated = [...modalCats];
    updated[idx] = newName;
    setModalCats(updated);
    await onSaveCategories(updated);
    if (oldName !== newName && modalCatModifiers[oldName]) {
      const updatedMods = { ...modalCatModifiers };
      updatedMods[newName] = updatedMods[oldName];
      delete updatedMods[oldName];
      await applyMods(updatedMods);
    }
  };

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

  const renderItem = (item) => {
    if (deleteConfirmId === item.id) {
      return (
        <div key={item.id} className="bg-card border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-foreground font-medium">{t('common.deleteConfirm', { name: item.name })}</p>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 rounded-lg bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors">{t('common.cancel')}</button>
            <button onClick={() => handleDelete(item.id)} className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">{t('common.delete')}</button>
          </div>
        </div>
      );
    }
    return (
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
              {item.soldOut ? t('admin.menu.soldOut') : t('admin.menu.available')}
            </span>
          </div>
          <div className="flex gap-1">
            <button onClick={() => { setEditItem(item); setShowForm(true); }} className="p-1.5 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors">
              <Pencil size={14} />
            </button>
            <button onClick={() => setDeleteConfirmId(item.id)} className="p-1.5 rounded-lg bg-muted hover:bg-red-500 hover:text-white transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

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
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5">{t('admin.menu.uncategorized')}</h3>
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
          placeholder={t('admin.menu.searchPlaceholder')}
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
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${activeTab === 'all' ? 'border-2 border-primary text-primary bg-card' : 'border-2 border-transparent bg-muted text-muted-foreground hover:text-foreground'}`}
          >
            {t('common.all')} ({menuItems.length})
          </button>
          {usedCategories.map((cat) => {
            const isClosed = closedCategories.includes(cat);
            const isActive = activeTab === cat;
            return (
              <div
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${isActive ? 'border-2 border-primary text-primary bg-card' : 'border-2 border-transparent bg-muted text-muted-foreground hover:text-foreground'}`}
              >
                <div
                  onClick={(e) => { e.stopPropagation(); onToggleCategory(cat); }}
                  className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${isClosed ? 'bg-slate-300' : 'bg-blue-500'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isClosed ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                {cat} ({menuItems.filter((i) => i.category === cat).length})
              </div>
            );
          })}
          {hasUncategorized && (
            <button
              onClick={() => setActiveTab('__uncat__')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${activeTab === '__uncat__' ? 'border-2 border-primary text-primary bg-card' : 'border-2 border-transparent bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {t('admin.menu.uncategorized')} ({menuItems.filter((i) => !i.category || !categories.includes(i.category)).length})
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
            className="text-sm text-foreground border border-border bg-card px-3 py-2 rounded-xl hover:bg-muted disabled:opacity-50 transition-colors"
          >
            {resettingAll ? t('admin.menu.resetting') : t('admin.menu.markAllAvailable')}
          </button>
        ) : <div />}
        <div className="flex items-center gap-2">
          <button
            onClick={openCatModal}
            className="text-sm text-foreground border border-border bg-card px-3 py-2 rounded-xl hover:bg-muted transition-colors"
          >
            {t('admin.menu.editCategories')}
          </button>
          <button
            onClick={() => { setEditItem(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90"
          >
            <Plus size={16} /> {t('admin.menu.addItem')}
          </button>
        </div>
      </div>

      {/* Items */}
      {displayItems.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {isSearching ? t('admin.menu.noItemsMatching', { query: search }) : t('admin.menu.noItemsHere')}
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

      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCatModal(false)} />
          <div className="relative bg-card rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <h3 className="font-bold text-foreground">{t('admin.settings.menuCategories')}</h3>
              <button onClick={() => { setShowCatModal(false); setDeleteCatConfirmIdx(null); setExpandedCatIdx(null); }} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-2">
              {modalCats.length === 0 && (
                <p className="text-sm text-muted-foreground">{t('admin.settings.noCategoriesYet')}</p>
              )}
              {modalCats.map((cat, idx) => (
                <div key={idx} className="border border-border rounded-xl overflow-hidden">
                  {deleteCatConfirmIdx === idx ? (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-red-50 border-red-200">
                      <p className="text-sm text-foreground font-medium truncate">{t('common.deleteConfirm', { name: cat })}</p>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => setDeleteCatConfirmIdx(null)} className="px-3 py-1 rounded-lg bg-white border border-border text-xs text-muted-foreground hover:text-foreground">{t('common.cancel')}</button>
                        <button onClick={() => { deleteModalCat(idx); setDeleteCatConfirmIdx(null); }} className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600">{t('common.delete')}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Category row */}
                      <div className="flex items-center gap-2 p-2">
                        <input
                          type="text"
                          value={cat}
                          onChange={(e) => { const u = [...modalCats]; u[idx] = e.target.value; setModalCats(u); }}
                          onBlur={(e) => renameModalCat(idx, e.target.value)}
                          className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button onClick={() => moveModalCat(idx, -1)} disabled={idx === 0} className="p-1.5 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground disabled:opacity-30 transition-colors shrink-0"><ChevronUp size={14} /></button>
                        <button onClick={() => moveModalCat(idx, 1)} disabled={idx === modalCats.length - 1} className="p-1.5 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground disabled:opacity-30 transition-colors shrink-0"><ChevronDown size={14} /></button>
                        <button onClick={() => setDeleteCatConfirmIdx(idx)} className="p-1.5 rounded-lg bg-muted hover:bg-red-500 hover:text-white transition-colors shrink-0"><Trash2 size={14} /></button>
                      </div>

                      {/* Modifier groups toggle row */}
                      <button
                        onClick={() => setExpandedCatIdx(expandedCatIdx === idx ? null : idx)}
                        className="w-full flex items-center justify-between px-3 py-2 border-t border-border text-xs hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-medium text-foreground">
                          {t('admin.menuItemForm.modifierGroups')}
                          {(modalCatModifiers[cat] || []).length > 0 && (
                            <span className="ml-1.5 text-muted-foreground">({(modalCatModifiers[cat] || []).length})</span>
                          )}
                        </span>
                        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${expandedCatIdx === idx ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Expanded modifier groups */}
                      {expandedCatIdx === idx && (
                        <div className="border-t border-border bg-muted/20 p-3 space-y-3">

                          {(modalCatModifiers[cat] || []).map((group, gIdx) => (
                            <div key={group.id} className="border border-border rounded-xl p-3 space-y-2 bg-card">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${group.type === 'required' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                  {group.type === 'required' ? t('admin.menuItemForm.requiredChoiceBadge') : t('admin.menuItemForm.optionalExtrasBadge')}
                                </span>
                                {deleteGroupConfirm?.catName === cat && deleteGroupConfirm?.gIdx === gIdx ? (
                                  <div className="flex gap-1 shrink-0">
                                    <button onClick={() => setDeleteGroupConfirm(null)} className="px-2 py-1 rounded-lg bg-muted text-xs text-muted-foreground hover:text-foreground">{t('common.cancel')}</button>
                                    <button onClick={() => deleteModGroup(cat, gIdx)} className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600">{t('common.delete')}</button>
                                  </div>
                                ) : (
                                  <button onClick={() => setDeleteGroupConfirm({ catName: cat, gIdx })} className="p-1 text-muted-foreground hover:text-red-500 transition-colors shrink-0"><Trash2 size={14} /></button>
                                )}
                              </div>

                              <input
                                type="text"
                                value={group.name}
                                onChange={(e) => updateModGroupName(cat, gIdx, e.target.value)}
                                onBlur={(e) => saveModGroupName(cat, gIdx, e.target.value)}
                                placeholder={group.type === 'required' ? t('admin.menuItemForm.groupNamePlaceholderRequired') : t('admin.menuItemForm.groupNamePlaceholderExtras')}
                                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                              <p className="text-xs text-muted-foreground">{group.type === 'required' ? t('admin.menuItemForm.requiredChoiceHint') : t('admin.menuItemForm.optionalExtrasHint')}</p>

                              <div className="space-y-2">
                                {group.options.length === 0 && <p className="text-xs text-muted-foreground">{t('admin.menuItemForm.noOptionsYet')}</p>}
                                {group.options.map((opt, oIdx) => (
                                  <div key={opt.id} className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={opt.name}
                                      onChange={(e) => updateModOption(cat, gIdx, oIdx, 'name', e.target.value)}
                                      onBlur={(e) => saveModOption(cat, gIdx, oIdx, 'name', e.target.value)}
                                      placeholder={t('admin.menuItemForm.optionNamePlaceholder')}
                                      className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    {group.type === 'extras' && (
                                      <input
                                        type="number"
                                        value={opt.price || ''}
                                        onChange={(e) => updateModOption(cat, gIdx, oIdx, 'price', e.target.value)}
                                        onBlur={(e) => saveModOption(cat, gIdx, oIdx, 'price', Number(e.target.value) || 0)}
                                        min="0"
                                        placeholder={t('admin.menuItemForm.extraPricePlaceholder')}
                                        className="w-20 border border-border rounded-lg px-2 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                      />
                                    )}
                                    <button onClick={() => deleteModOption(cat, gIdx, oIdx)} className="p-1 text-muted-foreground hover:text-red-500 transition-colors shrink-0"><X size={14} /></button>
                                  </div>
                                ))}
                              </div>
                              <button onClick={() => addModOption(cat, gIdx)} className="text-sm text-primary hover:opacity-80 transition-opacity">{t('admin.menuItemForm.addOption')}</button>
                            </div>
                          ))}

                          <div className="flex gap-2">
                            <button onClick={() => addModGroup(cat, 'required')} className="flex-1 border border-blue-200 text-blue-600 bg-blue-50 py-2 rounded-xl text-xs font-medium hover:bg-blue-100 transition-colors">{t('admin.menuItemForm.addRequiredChoice')}</button>
                            <button onClick={() => addModGroup(cat, 'extras')} className="flex-1 border border-green-200 text-green-600 bg-green-50 py-2 rounded-xl text-xs font-medium hover:bg-green-100 transition-colors">{t('admin.menuItemForm.addOptionalExtras')}</button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-border shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addModalCat(); } }}
                  placeholder={t('admin.settings.categoryPlaceholder')}
                  className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button onClick={addModalCat} disabled={!newCat.trim()} className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 shrink-0">
                  <Plus size={14} /> {t('common.add')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Settings Tab ─────────────────────────────────────────────────────────────
const SettingsTab = () => {
  const { t } = useAdminLanguage();
  const [form, setForm] = useState({ restaurantName: '', lineId: '', qrCodeUrl: '', busyMessage: '' });
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  const inputClass = 'border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full';

  return (
    <div className="max-w-md space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t('admin.settings.restaurantInfo')}</h3>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-sm text-primary hover:opacity-80 transition-opacity">
            {t('common.edit')}
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">{t('admin.settings.restaurantName')}</label>
            <input
              type="text"
              value={form.restaurantName}
              onChange={(e) => setForm((f) => ({ ...f, restaurantName: e.target.value }))}
              placeholder={t('admin.settings.restaurantName')}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">{t('admin.settings.lineId')}</label>
            <input
              type="text"
              value={form.lineId}
              onChange={(e) => setForm((f) => ({ ...f, lineId: e.target.value }))}
              placeholder={t('admin.settings.lineIdPlaceholder')}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">{t('admin.settings.busyModeMessage')}</label>
            <input
              type="text"
              value={form.busyMessage}
              onChange={(e) => setForm((f) => ({ ...f, busyMessage: e.target.value }))}
              placeholder={t('admin.settings.busyModePlaceholder')}
              className={inputClass}
            />
            <p className="text-xs text-muted-foreground">{t('admin.settings.busyModeHelp')}</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">{t('admin.settings.paymentQrCode')}</label>
            <input type="file" accept="image/*" ref={fileRef} onChange={handleQrFile} className="hidden" />
            {qrPreview ? (
              <div className="flex items-start gap-3">
                <img src={qrPreview} alt="QR" className="w-32 h-32 object-contain border border-border rounded-xl" />
                <button type="button" onClick={() => fileRef.current.click()} className="text-sm text-primary underline">
                  {t('admin.settings.changeQr')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current.click()}
                className="w-full border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Upload size={24} />
                <span className="text-sm">{t('admin.settings.uploadQrCode')}</span>
              </button>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 border border-border py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {uploading ? t('admin.settings.uploadingQr') : saving ? t('admin.settings.saving') : t('common.save')}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{t('admin.settings.restaurantName')}</p>
            <p className="text-sm text-foreground">{form.restaurantName || '—'}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{t('admin.settings.lineId')}</p>
            <p className="text-sm text-foreground">{form.lineId || '—'}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{t('admin.settings.busyModeMessage')}</p>
            <p className="text-sm text-foreground">{form.busyMessage || '—'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t('admin.settings.paymentQrCode')}</p>
            {qrPreview ? (
              <img src={qrPreview} alt="QR" className="w-28 h-28 object-contain border border-border rounded-xl" />
            ) : (
              <p className="text-sm text-muted-foreground">{t('common.notSet')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const { language, t } = useAdminLanguage();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();
  const audioCtxRef = useRef(null);
  const sirenIntervalRef = useRef(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

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

  const [busyMode, setBusyMode] = useState(false);
  const [storeClosed, setStoreClosed] = useState(false);
  const [closedCategories, setClosedCategories] = useState([]);
  const [categoryModifiers, setCategoryModifiers] = useState({});
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

  const [logoutConfirm, setLogoutConfirm] = useState(false);

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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t('admin.dashboard.title')}</h1>
            {newOrderCount > 0 && (
              <p className="text-xs text-orange-500 font-medium animate-pulse">
                {t('admin.dashboard.newOrdersNeedAction', { count: newOrderCount, suffix: orderSuffix })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle scope="admin" />
            <button
              onClick={handleStoreClosedToggle}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                storeClosed
                  ? 'border-red-500 text-red-600 bg-red-50'
                  : 'border-green-500 text-green-600 bg-green-50'
              }`}
            >
              {storeClosed ? t('admin.dashboard.storeClosed') : t('admin.dashboard.storeOpen')}
            </button>
            <button
              onClick={handleBusyToggle}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                busyMode
                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                  : 'border-border text-muted-foreground'
              }`}
            >
              {busyMode ? t('admin.dashboard.busy') : t('admin.dashboard.notBusy')}
            </button>
            <button
              onClick={() => setSoundEnabled((v) => !v)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                soundEnabled
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-border text-muted-foreground'
              }`}
            >
              {soundEnabled ? t('admin.dashboard.soundOn') : t('admin.dashboard.soundOff')}
            </button>
            <button onClick={() => setLogoutConfirm(true)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <LogOut size={16} /> {t('admin.dashboard.logOut')}
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="container mx-auto px-4 flex gap-1 pb-0">
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
      <main className="container mx-auto px-4 py-6 max-w-2xl">
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
              onClick={() => setActiveTab('orders')}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shrink-0 hover:bg-orange-600 transition-colors"
            >
              {t('admin.dashboard.viewOrders')}
            </button>
          </div>
        )}

        {notifStatus !== 'success' && (
          <div className="mb-4 p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-medium text-foreground">
                {t('admin.dashboard.notifications', { status: t(`admin.dashboard.notificationStatus.${notifStatus}`) })}
              </p>
              <p className="text-xs text-muted-foreground">{t('admin.dashboard.enableBrowserNotifications')}</p>
            </div>
            <button
              onClick={setupNotifications}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium shrink-0"
            >
              {t('admin.dashboard.enableNotifications')}
            </button>
          </div>
        )}

        {activeTab === 'orders'   && <OrdersTab orders={orders} />}
        {activeTab === 'menu'     && <MenuTab menuItems={menuItems} categories={categories} closedCategories={closedCategories} onToggleCategory={handleToggleCategory} onSaveCategories={handleSaveCategories} categoryModifiers={categoryModifiers} onSaveCategoryModifiers={handleSaveCategoryModifiers} />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>

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
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors"
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
