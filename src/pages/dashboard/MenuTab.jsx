import { useState, useEffect } from 'react';
import MenuItemForm from '../../components/MenuItemForm';
import CategoryModal from '../../components/CategoryModal';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { useAdminLanguage } from '../../utils/i18n';
import {
  subscribeToMenu, addMenuItem, updateMenuItem, deleteMenuItem,
  toggleSoldOut, markAllAvailable,
} from '../../services/menu';
import { subscribeToSettings, patchSettings } from '../../services/settings';

const MenuTab = () => {
  const { t } = useAdminLanguage();
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [closedCategories, setClosedCategories] = useState([]);
  const [categoryModifiers, setCategoryModifiers] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [resettingAll, setResettingAll] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showCatModal, setShowCatModal] = useState(false);

  useEffect(() => subscribeToMenu(setMenuItems), []);

  useEffect(() => subscribeToSettings((data) => {
    setCategories(data.categories || []);
    setClosedCategories(data.closedCategories || []);
    setCategoryModifiers(data.categoryModifiers || {});
  }), []);

  const handleToggleCategory = async (cat) => {
    const next = closedCategories.includes(cat)
      ? closedCategories.filter((c) => c !== cat)
      : [...closedCategories, cat];
    setClosedCategories(next);
    await patchSettings({ closedCategories: next });
  };

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editItem) {
        await updateMenuItem(editItem.id, data);
      } else {
        await addMenuItem(data);
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
    await deleteMenuItem(id);
    setDeleteConfirmId(null);
  };

  const handleMarkAllAvailable = async () => {
    setResettingAll(true);
    try {
      await markAllAvailable(menuItems);
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
          <p className="font-semibold text-foreground line-clamp-2">{item.name}</p>
          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
          <p className="text-primary font-bold text-sm mt-0.5">{formatCurrency(item.price)}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSoldOut(item)}>
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
        <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
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
                  onClick={(e) => { e.stopPropagation(); handleToggleCategory(cat); }}
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
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
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
            onClick={() => setShowCatModal(true)}
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

      <CategoryModal
        open={showCatModal}
        categories={categories}
        categoryModifiers={categoryModifiers}
        onClose={() => setShowCatModal(false)}
      />
    </div>
  );
};

export default MenuTab;
