import { useState, useRef } from 'react';
import { uploadDeliveryPhoto, deleteDeliveryPhoto } from '../services/orders';
import { useAdminLanguage } from '../utils/i18n';
import ImageLightbox from './ImageLightbox';

const DeliveryPhotoSection = ({ orderId, deliveryPhotoUrl }) => {
  const { t } = useAdminLanguage();
  const [uploading, setUploading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleFilePick = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    fileRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await uploadDeliveryPhoto(orderId, file);
      setPreview(null);
      setFile(null);
    } catch (err) {
      setError(t('admin.orderCard.uploadFailed', { message: err.message }));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    await deleteDeliveryPhoto(orderId);
  };

  const handleCancel = () => {
    setPreview(null);
    setFile(null);
  };

  return (
    <div className="space-y-1.5 w-fit">
      <p className="text-sm font-medium text-foreground">{t('common.deliveryPhoto')}</p>
      {deliveryPhotoUrl ? (
        <>
          <img
            src={deliveryPhotoUrl}
            alt="delivery"
            onClick={() => setLightboxOpen(true)}
            className="w-28 h-28 object-cover rounded-xl border border-border cursor-pointer hover:opacity-90 transition-opacity"
          />
          <button onClick={handleDelete} className="text-xs text-red-500 hover:text-red-700 transition-colors">
            {t('admin.orderCard.removePhoto')}
          </button>
        </>
      ) : preview ? (
        <div className="space-y-2">
          <img src={preview} alt="preview" className="w-28 h-28 object-cover rounded-xl border border-border" />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={uploading}
              className="flex-1 border border-border py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 bg-primary text-primary-foreground py-1.5 rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? t('admin.menuItemForm.uploadingPhoto') : t('common.confirm')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <input type="file" accept="image/*" ref={fileRef} onChange={handleFilePick} className="hidden" />
          <button
            onClick={() => fileRef.current.click()}
            className="w-28 h-28 flex items-center justify-center border border-dashed border-border rounded-xl text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors text-center px-2"
          >
            {t('admin.orderCard.uploadPhoto')}
          </button>
        </>
      )}
      <ImageLightbox src={deliveryPhotoUrl} open={lightboxOpen} onClose={() => setLightboxOpen(false)} />
    </div>
  );
};

export default DeliveryPhotoSection;
