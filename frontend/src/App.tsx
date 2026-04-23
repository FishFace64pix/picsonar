/**
 * Root component.
 *
 * - All routes are `React.lazy` so the main bundle stays small and only the
 *   landing/login paths ship on first paint. Each lazy route suspends on
 *   `<RouteSuspense />` while its chunk loads.
 * - An ErrorBoundary wraps the router so uncaught render errors do not
 *   blank-screen the app.
 * - `react-hot-toast` <Toaster /> is mounted once at the root — callers
 *   use `toast.success()` / `toast.error()` from anywhere in the tree.
 */
import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import CookieConsent from './components/CookieConsent'

// Eager: landing is the first thing unauthenticated visitors hit.
import LandingPage from './pages/LandingPage'
import NotFoundPage from './pages/NotFoundPage'

// Auth pages — small, hit early in the funnel.
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'))

// Main app pages.
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const EventPage = lazy(() => import('./pages/EventPage'))
const GuestScanPage = lazy(() => import('./pages/GuestScanPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const CheckoutSuccessPage = lazy(() => import('./pages/CheckoutSuccessPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))

// Legal pages.
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const DPAPage = lazy(() => import('./pages/DPAPage'))
const SubprocessorsPage = lazy(() => import('./pages/SubprocessorsPage'))
const ConsumerRightsPage = lazy(() => import('./pages/ConsumerRightsPage'))

// Admin — heavy + rarely used, kept fully lazy.
const AdminInvoicesPage = lazy(() => import('./pages/AdminInvoicesPage'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'))
const AdminEventsPage = lazy(() => import('./pages/admin/AdminEventsPage'))
const AdminFinancePage = lazy(() => import('./pages/admin/AdminFinancePage'))
const AdminSecurityPage = lazy(() => import('./pages/admin/AdminSecurityPage'))
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'))
const AdminStoragePage = lazy(() => import('./pages/admin/AdminStoragePage'))
const AdminFaceUsagePage = lazy(() => import('./pages/admin/AdminFaceUsagePage'))

/** Redirect unauthenticated users to /login, preserving the intended destination. */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

/** Additional guard for admin-only pages. */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if ((user as any).role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function RouteSuspense() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div
        className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"
        role="status"
        aria-label="Loading page"
      />
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 5000,
            style: {
              background: '#1f2937',
              color: '#f9fafb',
              border: '1px solid #374151',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#064e3b' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#7f1d1d' } },
          }}
        />
        <Suspense fallback={<RouteSuspense />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/event/:eventId" element={<ProtectedRoute><EventPage /></ProtectedRoute>} />
            <Route path="/guest/:eventId" element={<GuestScanPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/dpa" element={<DPAPage />} />
            <Route path="/subprocessors" element={<SubprocessorsPage />} />
            <Route path="/consumer-rights" element={<ConsumerRightsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
            <Route path="/checkout/success" element={<ProtectedRoute><CheckoutSuccessPage /></ProtectedRoute>} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/admin/invoices" element={<AdminRoute><AdminInvoicesPage /></AdminRoute>} />
            <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
            <Route path="/admin/events" element={<AdminRoute><AdminEventsPage /></AdminRoute>} />
            <Route path="/admin/storage" element={<AdminRoute><AdminStoragePage /></AdminRoute>} />
            <Route path="/admin/face-usage" element={<AdminRoute><AdminFaceUsagePage /></AdminRoute>} />
            <Route path="/admin/finance" element={<AdminRoute><AdminFinancePage /></AdminRoute>} />
            <Route path="/admin/logs" element={<AdminRoute><AdminSecurityPage /></AdminRoute>} />
            <Route path="/admin/security" element={<AdminRoute><AdminSecurityPage /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <CookieConsent />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
