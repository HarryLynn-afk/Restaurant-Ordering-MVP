import { useState, useEffect, useRef } from 'react';
import { Upload } from 'lucide-react';
import { useAdminLanguage } from '../../utils/i18n';
import { getSettings, patchSettings, uploadQrCode } from '../../services/settings';

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
    getSettings().then((data) => {
      const loaded = { restaurantName: data.restaurantName || '', lineId: data.lineId || '', qrCodeUrl: data.qrCodeUrl || '', busyMessage: data.busyMessage || '' };
      setForm(loaded);
      savedFormRef.current = loaded;
      setQrPreview(data.qrCodeUrl || '');
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
        qrCodeUrl = await uploadQrCode(qrFile);
        setUploading(false);
      }
      await patchSettings({ ...form, qrCodeUrl });
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
    <div className="space-y-5">
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
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">{t('admin.settings.restaurantName')}</p>
              <p className="text-sm text-foreground font-medium">{form.restaurantName || '—'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">{t('admin.settings.lineId')}</p>
              <p className="text-sm text-foreground font-medium">{form.lineId || '—'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">{t('admin.settings.busyModeMessage')}</p>
              <p className="text-sm text-foreground font-medium">{form.busyMessage || '—'}</p>
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
        </div>
      )}
    </div>
  );
};

export default SettingsTab;
