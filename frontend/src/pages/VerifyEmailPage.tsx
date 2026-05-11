/**
 * /verify-email?token=...
 *
 * Auto-submits the token from the URL to the backend on mount and shows
 * one of three states: loading, success, or error (with a "resend"
 * button for logged-in users).
 */
import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'

type State =
  | { status: 'loading' }
  | { status: 'success'; alreadyVerified: boolean }
  | { status: 'error'; message: string }

export default function VerifyEmailPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { user } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [resending, setResending] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setState({ status: 'error', message: 'Missing verification token.' })
      return
    }
    authApi
      .verifyEmail(token)
      .then((res) => {
        if (cancelled) return
        setState({ status: 'success', alreadyVerified: res.alreadyVerified })
        setTimeout(() => {
          navigate(user ? '/dashboard' : '/login')
        }, 2000)
      })
      .catch((err: any) => {
        if (cancelled) return
        const message =
          err?.response?.data?.error?.message ??
          err?.response?.data?.message ??
          err?.message ??
          'Verification link is invalid or has expired.'
        setState({ status: 'error', message: String(message) })
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const handleResend = async () => {
    if (!user) {
      toast.error('Sign in first, then request a new verification email.')
      return
    }
    setResending(true)
    try {
      await authApi.resendVerificationEmail()
      toast.success('If your email is still unverified, we just sent a new link.')
    } catch {
      toast.error('Could not send verification email. Please try again shortly.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-dark-800 border border-dark-700 rounded-2xl p-8 text-center">
        {state.status === 'loading' && (
          <>
            <div
              className="mx-auto animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"
              role="status"
              aria-label="Verifying email"
            />
            <h1 className="text-xl font-semibold text-white mt-6">{t('verifyEmail.verifying')}</h1>
          </>
        )}

        {state.status === 'success' && (
          <>
            <h1 className="text-2xl font-semibold text-white">
              {state.alreadyVerified ? 'Email already confirmed' : t('verifyEmail.successTitle')}
            </h1>
            <p className="text-gray-300 mt-4">
              {state.alreadyVerified
                ? 'This email was verified earlier. You can continue using PicSonar as normal.'
                : t('verifyEmail.successDesc')}
            </p>
            <Link
              to={user ? '/dashboard' : '/login'}
              className="inline-block mt-6 bg-primary-600 hover:bg-primary-500 text-white font-medium px-5 py-2.5 rounded-lg"
            >
              {user ? t('verifyEmail.goToDashboard') : t('verifyEmail.signIn')}
            </Link>
          </>
        )}

        {state.status === 'error' && (
          <>
            <h1 className="text-2xl font-semibold text-white">{t('verifyEmail.failedTitle')}</h1>
            <p className="text-gray-300 mt-4">{state.message}</p>
            <div className="flex flex-col gap-3 mt-6">
              {user && (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg"
                >
                  {resending ? t('verifyEmail.sending') : t('verifyEmail.resendBtn')}
                </button>
              )}
              <Link
                to={user ? '/dashboard' : '/login'}
                className="text-sm text-primary-400 hover:text-primary-300"
              >
                {user ? t('verifyEmail.backToDashboard') : t('verifyEmail.signIn')}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
