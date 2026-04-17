import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import OrderForm from '../components/OrderForm';

const CheckoutPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const cart = state?.cart || [];

  const [form, setForm] = useState({ customerName: '', phone: '', address: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <button onClick={() => navigate('/')} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium">
          Back to Menu
        </button>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerName || !form.phone || !form.address) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const items = cart.map(({ id, name, price, quantity }) => ({ id, name, price, quantity }));
      const docRef = await addDoc(collection(db, 'orders'), {
        ...form,
        items,
        total,
        status: 'unpaid',
        paymentSlipUrl: null,
        createdAt: serverTimestamp(),
      });
      localStorage.setItem('lastOrderId', docRef.id);
      navigate(`/payment/${docRef.id}`);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">←</button>
          <h1 className="text-xl font-bold text-foreground">Confirm Order</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-6">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-foreground">Order Summary</h2>
          {cart.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-foreground">{item.name} × {item.quantity}</span>
              <span className="text-foreground font-medium">${(item.price * item.quantity).toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t border-border pt-3 flex justify-between font-bold text-foreground">
            <span>Total</span>
            <span>${total.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-bold text-foreground">Delivery Information</h2>
          <form id="checkout-form" onSubmit={handleSubmit}>
            <OrderForm values={form} onChange={setForm} />
          </form>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          form="checkout-form"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Placing order...' : 'Confirm & Pay →'}
        </button>
      </main>
    </div>
  );
};

export default CheckoutPage;
