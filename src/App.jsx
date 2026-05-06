import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import OrderPage from './pages/OrderPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { LanguageProvider } from './utils/i18n.jsx';

const CheckoutPage = lazy(() => import('./pages/CheckoutPage.jsx'));
const PaymentPage = lazy(() => import('./pages/PaymentPage.jsx'));
const OrderStatusPage = lazy(() => import('./pages/OrderStatusPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));

const Loader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <p className="text-muted-foreground">Loading...</p>
  </div>
);

const App = () => (
  <ErrorBoundary>
    <LanguageProvider>
      <BrowserRouter>
        <Suspense fallback={<Loader />}>
          <Routes>
          <Route path="/" element={<OrderPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/payment/:orderId" element={<PaymentPage />} />
          <Route path="/order/:orderId" element={<OrderStatusPage />} />

          <Route path="/admin" element={<Navigate to="/login" replace />} />
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
        </Suspense>
      </BrowserRouter>
    </LanguageProvider>
  </ErrorBoundary>
);

export default App;
