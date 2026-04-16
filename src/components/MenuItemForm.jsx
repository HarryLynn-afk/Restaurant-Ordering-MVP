import { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { Upload } from 'lucide-react';

const inputClass = 'border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full';

const MenuItemForm = ({ initial, onSave, onCancel, saving }) => {
  const [form, setForm] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    price: initial?.price || '',
    imageUrl: initial?.imageUrl || '',
    soldOut: initial?.soldOut || false,
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
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let imageUrl = form.imageUrl;

    if (imageFile) {
      setUploading(true);
      try {
        const storageRef = ref(storage, `menu/${Date.now()}_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      } finally {
        setUploading(false);
      }
    }

    onSave({ ...form, imageUrl, price: Number(form.price) });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-md shadow-xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-foreground">{initial ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}</h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Image Upload */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">รูปภาพ</label>
            <input type="file" accept="image/*" ref={fileRef} onChange={handleImage} className="hidden" />
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="preview" className="w-full h-40 object-cover rounded-xl border border-border" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(''); setForm(f => ({ ...f, imageUrl: '' })); fileRef.current.value = ''; }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                >✕</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current.click()}
                className="w-full border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Upload size={24} />
                <span className="text-sm">เลือกรูปภาพ</span>
              </button>
            )}
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">ชื่อเมนู <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={handle('name')} required placeholder="เช่น ข้าวผัดกุ้ง" className={inputClass} />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">รายละเอียด</label>
            <input type="text" value={form.description} onChange={handle('description')} placeholder="เช่น ข้าวผัดกับกุ้งสด" className={inputClass} />
          </div>

          {/* Price */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">ราคา (บาท) <span className="text-red-500">*</span></label>
            <input type="number" value={form.price} onChange={handle('price')} required min="0" placeholder="120" className={inputClass} />
          </div>

          {/* Sold Out Toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm(f => ({ ...f, soldOut: !f.soldOut }))}
              className={`w-11 h-6 rounded-full transition-colors ${form.soldOut ? 'bg-red-500' : 'bg-muted'} relative`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.soldOut ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm font-medium text-foreground">หมด / ไม่พร้อมขาย</span>
          </label>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 border border-border py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground">
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? 'กำลังอัปโหลดรูป...' : saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MenuItemForm;
