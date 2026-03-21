import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import ScanResults from './pages/ScanResults';
import NewScan from './pages/NewScan';
import AccountSettings from './pages/AccountSettings';
import AdminPanel from './pages/AdminPanel';
import SubscriptionSuccess from './pages/SubscriptionSuccess';

function App() {
  return (
    <Routes>
      {/* Public routes with navbar/footer */}
      <Route element={<Layout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/scan/:id" element={<ScanResults />} />
      </Route>

      {/* Protected dashboard routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/new-scan" element={<NewScan />} />
          <Route path="/settings" element={<AccountSettings />} />
          <Route path="/subscription/success" element={<SubscriptionSuccess />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
