import { BrowserRouter, Routes, Route } from 'react-router-dom';
import OrderPage from './pages/OrderPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import PaymentPage from './pages/PaymentPage.jsx';
import OrderStatusPage from './pages/OrderStatusPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { LanguageProvider } from './utils/i18n.jsx';

const App = () => (
  <LanguageProvider>
    <BrowserRouter>
      <Routes>
        {/* Customer routes */}
        <Route path="/" element={<OrderPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/payment/:orderId" element={<PaymentPage />} />
        <Route path="/order/:orderId" element={<OrderStatusPage />} />

        {/* Staff routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  </LanguageProvider>
);

export default App;
