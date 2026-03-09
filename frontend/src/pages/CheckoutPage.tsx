import { useState, useEffect, FormEvent } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../api/client'
import { BillingDataForm, BillingFormData } from '../components/BillingDataForm'

// Replace with your publishable key
const stripePromise = loadStripe('pk_test_51ScG2hLa4hy2djuhX3PDtOC7FexiFJHQ5HkZMl3RlpSm2NHSNpgRVtl4UybF3dD058WSRj4qqCfodc9yEShz5MBP00DvFZ8vlA')

interface CheckoutFormProps {
    onBack: () => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ onBack }) => {
    const { t } = useTranslation()
    const stripe = useStripe()
    const elements = useElements()
    const [message, setMessage] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (!stripe) {
            return
        }

        const clientSecret = new URLSearchParams(window.location.search).get(
            'payment_intent_client_secret'
        )

        if (!clientSecret) {
            return
        }

        stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
            switch (paymentIntent?.status) {
                case 'succeeded':
                    setMessage(t('checkout.messages.success'))
                    break
                case 'processing':
                    setMessage(t('checkout.messages.processing'))
                    break
                case 'requires_payment_method':
                    setMessage(t('checkout.messages.failed'))
                    break
                default:
                    setMessage(t('checkout.messages.error'))
                    break
            }
        })
    }, [stripe, t])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        if (!stripe || !elements) {
            return
        }

        setIsLoading(true)

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Return URL where the user is redirected after the payment
                return_url: `${window.location.origin}/dashboard`,
            },
        })

        if (error) {
            if (error.type === 'card_error' || error.type === 'validation_error') {
                setMessage(error.message || t('checkout.messages.unexpected'))
            } else {
                setMessage(t('checkout.messages.unexpected'))
            }
        }

        setIsLoading(false)
    }

    return (
        <div className="w-full animate-fade-in">
            <button
                onClick={onBack}
                className="mb-6 text-sm text-gray-400 hover:text-white flex items-center gap-2 transition-colors group"
            >
                <span className="group-hover:-translate-x-1 transition-transform">←</span> {t('checkout.backToBilling')}
            </button>
            <form id="payment-form" onSubmit={handleSubmit} className="glass-panel p-8 w-full border border-white/20">
                <h3 className="text-2xl font-bold mb-6 text-white">{t('checkout.paymentMethod')}</h3>
                <PaymentElement id="payment-element" options={{ layout: 'tabs' }} />
                <button
                    disabled={isLoading || !stripe || !elements}
                    id="submit"
                    className="btn-primary mt-8 w-full"
                >
                    <span id="button-text">
                        {isLoading ? <div className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> {t('checkout.processing')}</div> : t('checkout.payNow')}
                    </span>
                </button>
                {message && <div id="payment-message" className="mt-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center font-medium">{message}</div>}
            </form>
        </div>
    )
}

const CheckoutPage = () => {
    const { t } = useTranslation()
    const { user } = useAuth()
    const [step, setStep] = useState<'billing' | 'payment'>('billing')
    const [billingData, setBillingData] = useState<BillingFormData | null>(null)
    const [isBillingValid, setIsBillingValid] = useState(false)
    const [clientSecret, setClientSecret] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isCreatingIntent, setIsCreatingIntent] = useState(false)

    // Get package details from URL
    const searchParams = new URLSearchParams(window.location.search)
    const packageId = searchParams.get('package')
    const type = searchParams.get('type')
    const quantity = searchParams.get('quantity') || '1'

    const handleBillingValidation = (isValid: boolean, data: BillingFormData) => {
        setIsBillingValid(isValid)
        setBillingData(data)
    }

    const handleProceedToPayment = async () => {
        if (!isBillingValid || !billingData) {
            setError(t('checkout.errors.fillRequired'))
            return
        }

        setIsCreatingIntent(true)
        setError(null)

        try {
            const response = await apiClient.post('/payment/create-intent', {
                packageId,
                type,
                quantity,
                billingData
            })

            setClientSecret(response.data.clientSecret)
            setStep('payment')
        } catch (err: any) {
            console.error('Failed to create payment intent:', err)

            const errorMessage = err.response?.data?.error || t('checkout.errors.creatingPayment')

            if (errorMessage.includes('Invalid CUI')) {
                setError(t('checkout.errors.invalidCui'))
            } else if (errorMessage.includes('Missing required billing field')) {
                setError(t('checkout.errors.allRequired'))
            } else if (errorMessage.includes('Invalid email')) {
                setError(t('checkout.errors.invalidEmail'))
            } else {
                setError(errorMessage)
            }
        } finally {
            setIsCreatingIntent(false)
        }
    }

    const appearance = {
        theme: 'night' as const,
        variables: {
            colorPrimary: '#8b5cf6',
            colorBackground: '#0f172a',
            colorText: '#f8fafc',
            colorDanger: '#ef4444',
            fontFamily: 'Outfit, Inter, system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '12px',
        },
    }
    const options = {
        clientSecret,
        appearance,
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
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${step === 'billing' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/50' : 'bg-green-500 text-white'
                                }`}>
                                {step === 'payment' ? '✓' : '1'}
                            </div>
                            <span className={`text-sm font-semibold transition-colors ${step === 'billing' ? 'text-white' : 'text-gray-400'}`}>{t('checkout.steps.billing')}</span>
                        </div>

                        <div className="w-12 h-0.5 bg-white/10 rounded-full"></div>

                        <div className="flex items-center gap-3">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${step === 'payment' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/50' : 'bg-white/5 text-gray-500 border border-white/10'
                                }`}>
                                2
                            </div>
                            <span className={`text-sm font-semibold transition-colors ${step === 'payment' ? 'text-white' : 'text-gray-500'}`}>{t('checkout.steps.payment')}</span>
                        </div>
                    </div>
                </div>

                {/* Step Content */}
                {step === 'billing' ? (
                    <div className="animate-slide-up">
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
                            onClick={handleProceedToPayment}
                            disabled={!isBillingValid || isCreatingIntent}
                            className="btn-primary mt-8 w-full group"
                        >
                            {isCreatingIntent ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    {t('checkout.preparingPayment')}
                                </div>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    {t('checkout.continuePayment')}
                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </span>
                            )}
                        </button>
                    </div>
                ) : (
                    clientSecret && (
                        <Elements options={options} stripe={stripePromise}>
                            <CheckoutForm onBack={() => setStep('billing')} />
                        </Elements>
                    )
                )}

                {/* Security & Trust Badges */}
                <div className="mt-12 py-8 border-t border-white/5 flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">🔒</div>
                        <div className="text-left">
                            <div className="text-[10px] font-black text-white uppercase tracking-widest">{t('checkout.badges.secure')}</div>
                            <div className="text-[10px] text-gray-500 font-bold">{t('checkout.badges.encryption')}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">🇪🇺</div>
                        <div className="text-left">
                            <div className="text-[10px] font-black text-white uppercase tracking-widest">{t('checkout.badges.hosted')}</div>
                            <div className="text-[10px] text-gray-500 font-bold">{t('checkout.badges.region')}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">🛡️</div>
                        <div className="text-left">
                            <div className="text-[10px] font-black text-white uppercase tracking-widest">{t('checkout.badges.gdpr')}</div>
                            <div className="text-[10px] text-gray-500 font-bold">{t('checkout.badges.privacy')}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CheckoutPage
