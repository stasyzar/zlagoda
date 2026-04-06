import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Manager pages (поки placeholder)
function ManagerPlaceholder({ name }: { name: string }) {
  return <div style={{ padding: 24 }}><h2>{name}</h2><p>Сторінка в розробці</p></div>;
}

// Cashier pages (поки placeholder)
function CashierPlaceholder({ name }: { name: string }) {
  return <div style={{ padding: 24 }}><h2>{name}</h2><p>Сторінка в розробці</p></div>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Менеджер */}
      <Route path="/manager/*" element={
        <ProtectedRoute role="Manager">
          <Layout>
            <Routes>
              <Route path="employees" element={<ManagerPlaceholder name="Працівники" />} />
              <Route path="categories" element={<ManagerPlaceholder name="Категорії" />} />
              <Route path="products" element={<ManagerPlaceholder name="Товари" />} />
              <Route path="store-products" element={<ManagerPlaceholder name="Товари у магазині" />} />
              <Route path="customers" element={<ManagerPlaceholder name="Карти клієнтів" />} />
              <Route path="checks" element={<ManagerPlaceholder name="Чеки" />} />
              <Route path="*" element={<Navigate to="employees" replace />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />

      {/* Касир */}
      <Route path="/cashier/*" element={
        <ProtectedRoute role="Cashier">
          <Layout>
            <Routes>
              <Route path="products" element={<CashierPlaceholder name="Товари" />} />
              <Route path="store-products" element={<CashierPlaceholder name="Товари у магазині" />} />
              <Route path="customers" element={<CashierPlaceholder name="Карти клієнтів" />} />
              <Route path="checks" element={<CashierPlaceholder name="Мої чеки" />} />
              <Route path="*" element={<Navigate to="products" replace />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}