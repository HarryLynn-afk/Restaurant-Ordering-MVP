import { normalizePrice } from '../utils/currency';
import { useState, useEffect, useRef } from 'react';
import { Plus, ChevronUp, ChevronDown, Trash2, X } from 'lucide-react';
import { patchSettings } from '../services/settings';
import { useAdminLanguage } from '../utils/i18n';

const uid = () => Math.random().toString(36).slice(2);

const CategoryModal = ({ open, categories, categoryModifiers, onClose }) => {
  const { t } = useAdminLanguage();
  const [modalCats, setModalCats] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [error, setError] = useState('');
  const [deleteCatConfirmIdx, setDeleteCatConfirmIdx] = useState(null);
  const [expandedCatIdx, setExpandedCatIdx] = useState(null);
  const [modalCatModifiers, setModalCatModifiers] = useState({});
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState(null);

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setModalCats([...categories]);
      setModalCatModifiers(JSON.parse(JSON.stringify(categoryModifiers || {})));
      setNewCat('');
      setDeleteCatConfirmIdx(null);
      setExpandedCatIdx(null);
      setDeleteGroupConfirm(null);
    }
    wasOpenRef.current = open;
  }, [open, categories, categoryModifiers]);

  if (!open) return null;

  const applyMods = async (updated) => {
    setModalCatModifiers(updated);
    try {
      await patchSettings({ categoryModifiers: updated });
      setError('');
    } catch (error) {
      setError(t('admin.menuItemForm.saveFailed', { message: error.message }));
    }
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
    try {
      if (field === 'price') value = normalizePrice(value);
    } catch (error) {
      setError(t('admin.menuItemForm.saveFailed', { message: error.message }));
      return;
    }
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <h3 className="font-bold text-foreground">{t('admin.settings.menuCategories')}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-2">
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
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
                                    step="0.01"
                                    value={opt.price || ''}
                                    onChange={(e) => updateModOption(cat, gIdx, oIdx, 'price', e.target.value)}
                                    onBlur={(e) => saveModOption(cat, gIdx, oIdx, 'price', e.target.value)}
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
  );
};

export default CategoryModal;
