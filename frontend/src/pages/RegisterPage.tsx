import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const [termsAccepted, setTermsAccepted] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [dpaAccepted, setDpaAccepted] = useState(false)
  // OUG 34/2014 — 14-day right of withdrawal is waived only with an
  // explicit opt-in here. Without this flag, the backend refuses registration.
  const [immediateDeliveryConsent, setImmediateDeliveryConsent] =
    useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !termsAccepted ||
      !privacyAccepted ||
      !dpaAccepted ||
      !immediateDeliveryConsent
    ) {
      setError('Please accept all legal documents to continue.')
      return
    }

    // Romanian phone validation check
    const phoneRegex = /^(\+40|0)7[0-9]{8}$/
    if (!phoneRegex.test(phone)) {
      setError('Please enter a valid Romanian phone number (e.g. 07xx xxx xxx)')
      return
    }

    setError('')
    setLoading(true)

    try {
      await register(email, password, name, phone, {
        termsAccepted: true,
        privacyAccepted: true,
        dpaAccepted: true,
        immediateDeliveryConsent: true,
      })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isFormValid =
    name &&
    email &&
    phone &&
    password.length >= 6 &&
    termsAccepted &&
    privacyAccepted &&
    dpaAccepted &&
    immediateDeliveryConsent

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow flex items-center justify-center min-h-[calc(100vh-80px)] px-4 pt-20 pb-20">
        <div className="glass-panel p-10 w-full max-w-lg animate-fade-in border border-white/10 shadow-3xl">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-white uppercase tracking-tight mb-2">Get Started</h1>
            <p className="text-gray-400 font-light tracking-wide">Professional AI Face Search for your business</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-8 text-sm font-bold flex items-center gap-3">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">
                  Business Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                  placeholder="name@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">
                  Phone Number (Romania Only)
                </label>
                <div className="flex gap-2">
                  <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-gray-400 font-bold flex items-center">
                    +40
                  </div>
                  <input
                    type="tel"
                    value={phone.startsWith('+40') ? phone.slice(3) : phone.startsWith('0') ? phone.slice(1) : phone}
                    onChange={(e) => {
                       const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                       setPhone('0' + val);
                    }}
                    required
                    className="flex-grow bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                    placeholder="722 123 456"
                  />
                </div>
                <p className="text-[10px] text-primary-500 mt-2 font-bold uppercase tracking-tighter flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse"></span>
                  Service exclusively available in Romania
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <label className="flex items-start gap-4 group cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-white/10 bg-white/5 text-primary-600 focus:ring-primary-500 focus:ring-offset-slate-900"
                />
                <span className="text-sm text-gray-400 leading-tight group-hover:text-gray-300"> I agree to the <Link to="/terms" className="text-primary-400 underline font-bold">Terms of Service</Link></span>
              </label>

              <label className="flex items-start gap-4 group cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-white/10 bg-white/5 text-primary-600 focus:ring-primary-500 focus:ring-offset-slate-900"
                />
                <span className="text-sm text-gray-400 leading-tight group-hover:text-gray-300"> I have read the <Link to="/privacy" className="text-primary-400 underline font-bold">Privacy Policy</Link></span>
              </label>

              <label className="flex items-start gap-4 group cursor-pointer">
                <input
                  type="checkbox"
                  checked={dpaAccepted}
                  onChange={(e) => setDpaAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-white/10 bg-white/5 text-primary-600 focus:ring-primary-500 focus:ring-offset-slate-900"
                />
                <span className="text-sm text-gray-400 leading-tight group-hover:text-gray-300"> I accept the <Link to="/dpa" className="text-primary-400 underline font-bold">Data Processing Addendum (DPA)</Link> as a Data Controller</span>
              </label>

              {/*
                Consumer Rights — Immediate Delivery Consent (OUG 34/2014).
                The label below is the ANPC-compliant wording that waives
                the 14-day right of withdrawal; copy should not be softened
                without legal review. Backend rejects registration if this
                box is unchecked.
              */}
              <label className="flex items-start gap-4 group cursor-pointer">
                <input
                  type="checkbox"
                  checked={immediateDeliveryConsent}
                  onChange={(e) =>
                    setImmediateDeliveryConsent(e.target.checked)
                  }
                  className="mt-1 w-4 h-4 rounded border-white/10 bg-white/5 text-primary-600 focus:ring-primary-500 focus:ring-offset-slate-900"
                />
                <span className="text-sm text-gray-400 leading-tight group-hover:text-gray-300">
                  I consent to immediate service delivery and understand
                  that, per OUG 34/2014, I therefore{' '}
                  <strong className="text-gray-200">
                    waive the 14-day right of withdrawal
                  </strong>{' '}
                  for digital content.{' '}
                  <Link
                    to="/consumer-rights"
                    className="text-primary-400 underline font-bold"
                  >
                    Details
                  </Link>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="btn-primary w-full flex justify-center py-4 text-lg font-black disabled:opacity-20 disabled:grayscale transition-all"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : 'Create Professional Account'}
            </button>
          </form>

          <p className="mt-8 text-center text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  )
}
