import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'

export default function VerifyEmailPendingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [resending, setResending] = useState(false)

  const handleResend = async () => {
    setResending(true)
    try {
      await authApi.resendVerificationEmail()
      toast.success('Verification email sent — check your inbox.')
    } catch {
      toast.error('Could not send verification email. Please try again shortly.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-dark-800 border border-dark-700 rounded-2xl p-8 text-center">
        <div className="mx-auto mb-6 flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 border border-primary-500/30">
          <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-white mb-3">Verify your email</h1>
        <p className="text-gray-400 mb-2">
          We sent a verification link to{' '}
          <span className="text-white font-medium">{user?.email ?? 'your email address'}</span>.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Click the link in the email to activate your account. The link expires in 24 hours.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleResend}
            disabled={resending}
            className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {resending ? 'Sending…' : 'Resend verification email'}
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            I'll verify later — go to dashboard
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-600">
          Wrong email?{' '}
          <Link to="/register" className="text-primary-400 hover:text-primary-300">
            Start over
          </Link>
        </p>
      </div>
    </div>
  )
}
