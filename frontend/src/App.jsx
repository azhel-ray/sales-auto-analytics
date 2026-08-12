import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SalesPage from './pages/SalesPage';
import TransactionsPage from './pages/TransactionsPage';
import MembersPage from './pages/MembersPage';
import MemberDetailPage from './pages/MemberDetailPage';
import ProductsPage from './pages/ProductsPage';
import ProductCreatePage from './pages/ProductCreatePage';
import ProductRecipePage from './pages/ProductRecipePage';
import IngredientsPage from './pages/IngredientsPage';
import InventoryPage from './pages/InventoryPage';
import ExpensesPage from './pages/ExpensesPage';
import ProductionPage from './pages/ProductionPage';
import ProfitLossPage from './pages/ProfitLossPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogPage from './pages/AuditLogPage';
import VoucherRewardsPage from './pages/VoucherRewardsPage';
import Layout from './components/Layout';

function ProtectedRoute({ children, roles }) {
  const token = sessionStorage.getItem('token');
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  if (!token) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute roles={['OWNER','KASIR']}><DashboardPage /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute roles={['KASIR']}><SalesPage /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute roles={['OWNER','KASIR']}><TransactionsPage /></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute roles={['OWNER','KASIR']}><MembersPage /></ProtectedRoute>} />
        <Route path="/members/:id" element={<ProtectedRoute roles={['OWNER','KASIR']}><MemberDetailPage /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute roles={['OWNER']}><ProductsPage /></ProtectedRoute>} />
        <Route path="/products/create" element={<ProtectedRoute roles={['OWNER']}><ProductCreatePage /></ProtectedRoute>} />
        <Route path="/products/:id/recipe" element={<ProtectedRoute roles={['OWNER']}><ProductRecipePage /></ProtectedRoute>} />
        <Route path="/ingredients" element={<ProtectedRoute roles={['OWNER']}><IngredientsPage /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute roles={['OWNER']}><InventoryPage /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute roles={['OWNER', 'KASIR']}><ExpensesPage /></ProtectedRoute>} />
        <Route path="/production" element={<ProtectedRoute roles={['OWNER']}><ProductionPage /></ProtectedRoute>} />
        <Route path="/profit-loss" element={<ProtectedRoute roles={['OWNER']}><ProfitLossPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute roles={['OWNER']}><ReportsPage /></ProtectedRoute>} />
        <Route path="/audit" element={<ProtectedRoute roles={['OWNER']}><AuditLogPage /></ProtectedRoute>} />
        <Route path="/voucher-rewards" element={<ProtectedRoute roles={['OWNER']}><VoucherRewardsPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
