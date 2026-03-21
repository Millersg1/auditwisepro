import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Public pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import ScanResults from './pages/ScanResults';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Contact from './pages/Contact';

// Dashboard pages
import Dashboard from './pages/Dashboard';
import NewScan from './pages/NewScan';
import AccountSettings from './pages/AccountSettings';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import AdminPanel from './pages/AdminPanel';

// Audit management pages
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Audits from './pages/Audits';
import AuditDetail from './pages/AuditDetail';
import Templates from './pages/Templates';
import RiskAssessment from './pages/RiskAssessment';
import Compliance from './pages/Compliance';
import Reports from './pages/Reports';
import Documents from './pages/Documents';
import Blog from './pages/Blog';
import BlogEditor from './pages/BlogEditor';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';

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
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      {/* Protected dashboard routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/new-scan" element={<NewScan />} />
          <Route path="/settings" element={<AccountSettings />} />
          <Route path="/account" element={<Settings />} />
          <Route path="/subscription/success" element={<SubscriptionSuccess />} />
          <Route path="/admin" element={<AdminPanel />} />

          {/* Audit Management */}
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/audits" element={<Audits />} />
          <Route path="/audits/:id" element={<AuditDetail />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/risks" element={<RiskAssessment />} />
          <Route path="/compliance" element={<Compliance />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/documents" element={<Documents />} />

          {/* Blog */}
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/new" element={<BlogEditor />} />
          <Route path="/blog/:id/edit" element={<BlogEditor />} />

          {/* Notifications */}
          <Route path="/notifications" element={<Notifications />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
