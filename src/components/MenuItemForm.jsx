import { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { Upload } from 'lucide-react';

const inputClass = 'border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full';

const MenuItemForm = ({ initial, onSave, onCancel, saving, categories = [] }) => {
  const [form, setForm] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    price: initial?.price || '',
    imageUrl: initial?.imageUrl || '',
    category: initial?.category || '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(initial?.imageUrl || '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handle = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Photo must be under 10MB.');
      fileRef.current.value = '';
      return;
    }
    setError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    let imageUrl = form.imageUrl;

    if (imageFile) {
      setUploading(true);
      try {
        const storageRef = ref(storage, `menus/${Date.now()}_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      } catch (err) {
        setError(`Photo upload failed: ${err.message}`);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    try {
      await onSave({ ...form, imageUrl, price: Number(form.price) });
    } catch (err) {
      setError(`Save failed: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-md shadow-xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-foreground">{initial ? 'Edit Menu Item' : 'Add New Item'}</h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">x</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">Photo</label>
            <input type="file" accept="image/*" ref={fileRef} onChange={handleImage} className="hidden" />
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="preview" className="w-full h-40 object-cover rounded-xl border border-border" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(''); setForm(f => ({ ...f, imageUrl: '' })); fileRef.current.value = ''; }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                >x</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current.click()}
                className="w-full border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Upload size={24} />
                <span className="text-sm">Choose a photo</span>
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">Item Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={handle('name')} required placeholder="e.g. Fried Rice" className={inputClass} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">Description</label>
            <input type="text" value={form.description} onChange={handle('description')} placeholder="e.g. Fried rice with shrimp and egg" className={inputClass} />
          </div>

          {categories.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">Category</label>
              <select value={form.category} onChange={handle('category')} className={inputClass}>
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">Price <span className="text-red-500">*</span></label>
            <input type="number" value={form.price} onChange={handle('price')} required min="0" placeholder="120" className={inputClass} />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 border border-border py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? 'Uploading photo...' : saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MenuItemForm;
