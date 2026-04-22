import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Upload } from 'lucide-react';
import compressImage from '../utils/compressImage';

const PaymentPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef();

  const [order, setOrder] = useState(null);
  const [settings, setSettings] = useState(null);
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [orderSnap, settingsSnap] = await Promise.all([
          getDoc(doc(db, 'orders', orderId)),
          getDoc(doc(db, 'settings', 'restaurant')),
        ]);
        if (orderSnap.exists()) setOrder({ id: orderSnap.id, ...orderSnap.data() });
        if (settingsSnap.exists()) setSettings(settingsSnap.data());
      } catch (_) {
        setError('Order not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [orderId]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.');
      fileInputRef.current.value = '';
      return;
    }
    setError('');
    setSlipFile(file);
    setSlipPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!slipFile) return;
    setUploading(true);
    setError('');
    try {
      const compressed = await compressImage(slipFile, { maxWidth: 1200, quality: 0.8 });
      const storageRef = ref(storage, `slips/${orderId}_${Date.now()}`);
      await uploadBytes(storageRef, compressed);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'orders', orderId), { paymentSlipUrl: url });
      setUploaded(true);
    } catch (_) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">Payment</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Order #{orderId.slice(-8).toUpperCase()}</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-5">
        {order && (
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 text-center">
            <p className="text-sm text-muted-foreground mb-1">Amount Due</p>
            <p className="text-4xl font-bold text-primary">${order.total?.toLocaleString()}</p>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-foreground">Scan QR Code to Pay</h2>
          {settings?.qrCodeUrl ? (
            <img src={settings.qrCodeUrl} alt="QR Code" className="w-56 h-56 object-contain mx-auto rounded-xl border border-border" />
          ) : (
            <div className="w-56 h-56 bg-muted rounded-xl mx-auto flex items-center justify-center">
              <p className="text-muted-foreground text-sm text-center px-4">QR code not set up yet.</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center">Pay via your banking app, then upload your payment slip below.</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-bold text-foreground">Upload Payment Slip</h2>

          {uploaded ? (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto"><span className="text-green-600 font-bold text-xl">✓</span></div>
              <p className="font-medium text-foreground">Payment slip uploaded!</p>
              <p className="text-sm text-muted-foreground">The restaurant will confirm your payment shortly.</p>
              <button
                onClick={() => navigate(`/order/${orderId}`)}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Track My Order →
              </button>
            </div>
          ) : (
            <>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

              {slipPreview ? (
                <img src={slipPreview} alt="slip preview" className="w-full max-h-64 object-contain rounded-xl border border-border" />
              ) : (
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="w-full border-2 border-dashed border-border rounded-xl py-10 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Upload size={28} />
                  <span className="text-sm font-medium">Tap to choose a slip photo</span>
                </button>
              )}

              {slipPreview && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSlipFile(null); setSlipPreview(null); setError(''); fileInputRef.current.value = ''; }}
                    className="flex-1 border border-border py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground"
                  >
                    Choose Again
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Submit Slip'}
                  </button>
                </div>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default PaymentPage;
