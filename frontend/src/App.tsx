import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import EventPage from './pages/EventPage'
import GuestScanPage from './pages/GuestScanPage'
import NotFoundPage from './pages/NotFoundPage'
import { AuthProvider } from './contexts/AuthContext'

import ContactPage from './pages/ContactPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import ProfilePage from './pages/ProfilePage'
import AdminInvoicesPage from './pages/AdminInvoicesPage'
import CheckoutPage from './pages/CheckoutPage'
import PricingPage from './pages/PricingPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminEventsPage from './pages/admin/AdminEventsPage'
import AdminFinancePage from './pages/admin/AdminFinancePage'
import AdminSecurityPage from './pages/admin/AdminSecurityPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import AdminStoragePage from './pages/admin/AdminStoragePage'
import AdminFaceUsagePage from './pages/admin/AdminFaceUsagePage'

import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DPAPage from './pages/DPAPage'
import SubprocessorsPage from './pages/SubprocessorsPage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/event/:eventId" element={<EventPage />} />
        <Route path="/guest/:eventId" element={<GuestScanPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/dpa" element={<DPAPage />} />
        <Route path="/subprocessors" element={<SubprocessorsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/admin/invoices" element={<AdminInvoicesPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/events" element={<AdminEventsPage />} />
        <Route path="/admin/storage" element={<AdminStoragePage />} />
        <Route path="/admin/face-usage" element={<AdminFaceUsagePage />} />
        <Route path="/admin/finance" element={<AdminFinancePage />} />
        <Route path="/admin/logs" element={<AdminSecurityPage />} />
        <Route path="/admin/security" element={<AdminSecurityPage />} /> {/* Shortcut */}
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}

export default App

