import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import EmployeesPage from './pages/manager/EmployeesPage';
import CategoriesPage from './pages/manager/CategoriesPage';
import ProductsPage from './pages/manager/ProductsPage';
import StoreProductsPage from './pages/manager/StoreProductsPage';
import CustomerCardsPage from './pages/manager/CustomerCardsPage';
import ChecksPage from './pages/manager/ChecksPage';
import CashierChecksPage from './pages/cashier/CashierChecksPage';
import CashierCustomersPage from './pages/cashier/CashierCustomersPage';
import CashierProductsPage from './pages/cashier/CashierProductsPage';
import CashierStoreProductsPage from './pages/cashier/CashierStoreProductsPage';
import CreateCheckPage from './pages/cashier/CreateCheckPage';

// Manager pages (поки placeholder)
// function ManagerPlaceholder({ name }: { name: string }) {
//   return <div style={{ padding: 24 }}><h2>{name}</h2><p>Сторінка в розробці</p></div>;
// }

// function CashierPlaceholder({ name }: { name: string }) {
//   return <div style={{ padding: 24 }}><h2>{name}</h2><p>Сторінка в розробці</p></div>;
// }

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Менеджер */}
      <Route path="/manager/*" element={
        <ProtectedRoute role="Manager">
          <Layout>
            <Routes>
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="store-products" element={<StoreProductsPage />} />
              <Route path="customers" element={<CustomerCardsPage/>} />
              <Route path="checks" element={<ChecksPage/>} />
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
              <Route path="products" element={<CashierProductsPage/>} />
              <Route path="store-products" element={<CashierStoreProductsPage />} />
              <Route path="customers" element={<CashierCustomersPage/>} />
              <Route path="checks" element={<CashierChecksPage/>} />
              
              <Route path="checks/new" element={<CreateCheckPage />} />
              
              <Route path="*" element={<Navigate to="products" replace />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
