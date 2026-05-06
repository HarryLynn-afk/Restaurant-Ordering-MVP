import { useState, useEffect } from 'react';
import MenuItemForm from '../../components/MenuItemForm';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Search, X } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { useAdminLanguage } from '../../utils/i18n';
import {
  subscribeToMenu, addMenuItem, updateMenuItem, deleteMenuItem,
  toggleSoldOut, markAllAvailable,
} from '../../services/menu';
import { subscribeToSettings, patchSettings } from '../../services/settings';

const uid = () => Math.random().toString(36).slice(2);

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
  const [modalCats, setModalCats] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [deleteCatConfirmIdx, setDeleteCatConfirmIdx] = useState(null);
  const [expandedCatIdx, setExpandedCatIdx] = useState(null);
  const [modalCatModifiers, setModalCatModifiers] = useState({});
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState(null);

  useEffect(() => subscribeToMenu(setMenuItems), []);

  useEffect(() => subscribeToSettings((data) => {
    setCategories(data.categories || []);
    setClosedCategories(data.closedCategories || []);
    setCategoryModifiers(data.categoryModifiers || {});
  }), []);

  const openCatModal = () => {
    setModalCats([...categories]);
    setModalCatModifiers(JSON.parse(JSON.stringify(categoryModifiers || {})));
    setNewCat('');
    setDeleteCatConfirmIdx(null);
    setExpandedCatIdx(null);
    setDeleteGroupConfirm(null);
    setShowCatModal(true);
  };

  const applyMods = async (updated) => {
    setModalCatModifiers(updated);
    await patchSettings({ categoryModifiers: updated });
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
    await patchSettings({ categories: updated });
  };

  const deleteModalCat = async (idx) => {
    const catName = modalCats[idx];
    const updated = modalCats.filter((_, i) => i !== idx);
    setModalCats(updated);
    await patchSettings({ categories: updated });
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
    await patchSettings({ categories: updated });
  };

  const renameModalCat = async (idx, newName) => {
    const oldName = modalCats[idx];
    const updated = [...modalCats];
    updated[idx] = newName;
    setModalCats(updated);
    await patchSettings({ categories: updated });
    if (oldName !== newName && modalCatModifiers[oldName]) {
      const updatedMods = { ...modalCatModifiers };
      updatedMods[newName] = updatedMods[oldName];
      delete updatedMods[oldName];
      await applyMods(updatedMods);
    }
  };

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
                          className="flex-1 min-w-0 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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

export default MenuTab;
