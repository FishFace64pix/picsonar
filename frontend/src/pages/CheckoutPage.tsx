import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../api/client'
import { BillingDataForm, BillingFormData } from '../components/BillingDataForm'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')

const CheckoutForm = ({ packageId, type, quantity, billingData, onPaymentSuccess, onPaymentError }: any) => {
    const { t } = useTranslation()
    const stripe = useStripe()
    const elements = useElements()
    const [isProcessing, setIsProcessing] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!stripe || !elements || !billingData) {
            return
        }

        setIsProcessing(true)

        try {
            // 1. Create PaymentIntent on the backend
            const { data } = await apiClient.post('/payment/create-intent', {
                packageId,
                type,
                quantity,
                billingData
            })

            const { clientSecret } = data

            // 2. Confirm payment with Stripe
            const result = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: elements.getElement(CardElement)!,
                    billing_details: {
                        name: billingData.companyName,
                        email: billingData.billingEmail,
                        address: {
                            line1: billingData.street,
                            city: billingData.city,
                            postal_code: billingData.postalCode,
                            country: 'RO',
                        },
                    },
                },
            })

            if (result.error) {
                onPaymentError(result.error.message)
            } else {
                if (result.paymentIntent.status === 'succeeded') {
                    // 3. Optional: Call backend to verify immediately (backup for webhook).
                    // amount is intentionally omitted — the backend fetches it from Stripe.
                    try {
                        await apiClient.post('/payment/verify', {
                            orderId: result.paymentIntent.id,
                            packageId,
                            type,
                            quantity,
                            billingData
                        })
                    } catch (verifyErr) {
                        console.error('Immediate verification failed, relying on webhook:', verifyErr)
                    }
                    onPaymentSuccess(result.paymentIntent.id)
                }
            }
        } catch (err: any) {
            console.error('Payment Error:', err)
            onPaymentError(err.response?.data?.error || t('checkout.errors.creatingPayment'))
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl shadow-inner shadow-black/20">
                <label className="block text-xs font-black text-gray-500 mb-4 uppercase tracking-widest">
                    Card Details
                </label>
                <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5 focus-within:border-primary-500/50 transition-colors">
                    <CardElement options={{
                        style: {
                            base: {
                                fontSize: '16px',
                                color: '#fff',
                                '::placeholder': {
                                    color: '#64748b',
                                },
                            },
                        }
                    }} />
                </div>
            </div>

            <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="btn-primary w-full group transition-all"
            >
                {isProcessing ? (
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        processing secure payment...
                    </div>
                ) : (
                    <span className="flex items-center justify-center gap-2">
                        {t('checkout.confirmAndPay')}
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                )}
            </button>
        </form>
    )
}

const CheckoutPage = () => {
    const { t } = useTranslation()
    const { user } = useAuth()
    const [billingData, setBillingData] = useState<BillingFormData | null>(null)
    const [isBillingValid, setIsBillingValid] = useState(false)
    const [step, setStep] = useState(1)
    const [error, setError] = useState<string | null>(null)
    const [paymentSuccessId, setPaymentSuccessId] = useState<string | null>(null)
    const [redirectCountdown, setRedirectCountdown] = useState(3)
    const [stripeCheckoutLoading, setStripeCheckoutLoading] = useState(false)
    const redirectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const searchParams = new URLSearchParams(window.location.search)
    const packageId = searchParams.get('package')
    const type = searchParams.get('type')
    const quantity = searchParams.get('quantity') || '1'

    // Redirect to Stripe Checkout — billing address, VAT ID, and company name
    // are collected directly on Stripe's hosted page.
    const handleStripeCheckout = async () => {
        if (!packageId) { setError('No package selected'); return }
        setStripeCheckoutLoading(true)
        setError(null)
        try {
            const { data } = await apiClient.post('/payment/checkout-session', {
                packageId,
                quantity: parseInt(quantity, 10) || 1,
            })
            window.location.href = data.url
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to start checkout. Please try again.')
            setStripeCheckoutLoading(false)
        }
    }

    const handleBillingValidation = (isValid: boolean, data: BillingFormData) => {
        setIsBillingValid(isValid)
        setBillingData(data)
    }

    const handleNextStep = () => {
        if (!isBillingValid) {
            setError(t('checkout.errors.fillRequired'))
            return
        }
        setError(null)
        setStep(2)
    }

    useEffect(() => {
        if (!paymentSuccessId) return
        redirectTimerRef.current = setInterval(() => {
            setRedirectCountdown((n) => {
                if (n <= 1) {
                    clearInterval(redirectTimerRef.current!)
                    window.location.href = '/dashboard'
                    return 0
                }
                return n - 1
            })
        }, 1000)
        return () => {
            if (redirectTimerRef.current) clearInterval(redirectTimerRef.current)
        }
    }, [paymentSuccessId])

    if (paymentSuccessId) {
        return (
            <div className="min-h-screen py-32 px-4 text-center">
                <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl animate-bounce">
                    ✓
                </div>
                <h1 className="text-4xl font-bold text-white mb-4">Payment Successful!</h1>
                <p className="text-gray-400 mb-4">Your credits have been added. You can now start or manage your events.</p>
                <p className="text-gray-500 mb-12 text-sm">Redirecting to dashboard in {redirectCountdown}s…</p>
                <a href="/dashboard" className="btn-primary px-12">Go to Dashboard Now</a>
            </div>
        )
    }

    return (
        <div className="min-h-screen py-16 px-4">
            <div className="w-full max-w-2xl mx-auto">
                <h1 className="text-4xl font-bold text-center mb-12 text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                    {t('checkout.title')}
                </h1>

                {/* Progress Steps */}
                <div className="flex justify-center mb-12">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${step >= 1 ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/50' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
                                1
                            </div>
                            <span className={`text-sm font-semibold transition-colors ${step >= 1 ? 'text-white' : 'text-gray-500'}`}>{t('checkout.steps.billing')}</span>
                        </div>

                        <div className={`w-12 h-0.5 rounded-full transition-colors ${step >= 2 ? 'bg-primary-600' : 'bg-white/10'}`}></div>

                        <div className="flex items-center gap-3">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${step >= 2 ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/50' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
                                2
                            </div>
                            <span className={`text-sm font-semibold transition-colors ${step >= 2 ? 'text-white' : 'text-gray-500'}`}>{t('checkout.steps.payment')}</span>
                        </div>
                    </div>
                </div>

                {/* ── Primary flow: Stripe Checkout (hosted, collects billing + VAT) ── */}
                <div className="mb-8 p-6 bg-white/5 border border-primary-500/30 rounded-2xl animate-slide-up">
                    <div className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-1">Recommended</div>
                    <h2 className="text-lg font-bold text-white mb-2">Pay with Stripe Checkout</h2>
                    <p className="text-gray-400 text-sm mb-6">
                        Stripe securely collects your card, billing address, and VAT ID.
                        No data is stored on our servers until payment is confirmed.
                    </p>
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    <button
                        onClick={handleStripeCheckout}
                        disabled={stripeCheckoutLoading || !packageId}
                        className="btn-primary w-full group transition-all"
                    >
                        {stripeCheckoutLoading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Redirecting to Stripe...
                            </div>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                Continue to Stripe Checkout
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </span>
                        )}
                    </button>
                </div>

                <div className="relative flex items-center gap-4 mb-8">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-xs text-gray-500 uppercase tracking-widest">or pay with card directly</span>
                    <div className="flex-1 h-px bg-white/10" />
                </div>

                <div className="animate-slide-up">
                    {step === 1 ? (
                        <>
                            <BillingDataForm
                                onValidationChange={handleBillingValidation}
                                initialData={user?.companyDetails}
                            />
                            {error && (
                                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium animate-shake">
                                    {error}
                                </div>
                            )}
                            <button
                                onClick={handleNextStep}
                                className="btn-primary mt-8 w-full group transition-all"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    {t('checkout.continuePayment')}
                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </span>
                            </button>
                        </>
                    ) : (
                        <div className="animate-fade-in">
                            <div className="mb-6 p-6 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-center group">
                                <div>
                                    <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">{t('checkout.selectedPackage')}</div>
                                    <div className="text-xl font-bold text-white uppercase tracking-tight group-hover:text-primary-400 transition-colors">
                                        {packageId} ({type})
                                    </div>
                                </div>
                                <button onClick={() => setStep(1)} className="text-xs text-gray-400 hover:text-white transition-colors underline decoration-primary-500/30 underline-offset-4">
                                    Edit Billing
                                </button>
                            </div>

                            {error && (
                                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium animate-shake">
                                    {error}
                                </div>
                            )}

                            <Elements stripe={stripePromise}>
                                <CheckoutForm
                                    packageId={packageId}
                                    type={type}
                                    quantity={quantity}
                                    billingData={billingData}
                                    onPaymentSuccess={(id: string) => setPaymentSuccessId(id)}
                                    onPaymentError={(msg: string) => setError(msg)}
                                />
                            </Elements>
                        </div>
                    )}
                </div>

                {/* Security Badges */}
                <div className="mt-12 py-8 border-t border-white/5 flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">🔒</div>
                        <div className="text-left">
                            <div className="text-[10px] font-black text-white uppercase tracking-widest">{t('checkout.badges.secure')}</div>
                            <div className="text-[10px] text-gray-500 font-bold">SSL · 256-BIT · STRIPE</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">🇷🇴</div>
                        <div className="text-left">
                            <div className="text-[10px] font-black text-white uppercase tracking-widest">ROMANIA ONLY</div>
                            <div className="text-[10px] text-gray-500 font-bold">Optimized for RO market</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CheckoutPage
