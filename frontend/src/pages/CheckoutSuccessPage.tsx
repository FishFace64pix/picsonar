/**
 * /checkout/success?session_id=cs_xxx
 *
 * Landing page after Stripe Checkout redirects back. The session_id is
 * provided by Stripe. We show a confirmation and redirect to /dashboard
 * after 4 seconds. Credits are applied by the webhook — no client-side
 * verification needed here.
 */
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

export default function CheckoutSuccessPage() {
    const [searchParams] = useSearchParams()
    const sessionId = searchParams.get('session_id')
    const [countdown, setCountdown] = useState(4)

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((n) => {
                if (n <= 1) {
                    clearInterval(timer)
                    window.location.href = '/dashboard'
                    return 0
                }
                return n - 1
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center animate-fade-in">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                    <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <h1 className="text-4xl font-black text-white mb-4">Payment Successful!</h1>
                <p className="text-gray-400 mb-2">
                    Your credits have been added to your account.
                </p>
                <p className="text-gray-400 mb-2 text-sm">
                    A receipt has been sent to your email address.
                </p>

                {sessionId && (
                    <p className="text-gray-600 text-xs mt-4 mb-8 font-mono">
                        Ref: {sessionId}
                    </p>
                )}

                <p className="text-gray-500 text-sm mb-8">
                    Redirecting to your dashboard in {countdown}s…
                </p>

                <Link
                    to="/dashboard"
                    className="btn-primary px-10 inline-block"
                >
                    Go to Dashboard Now
                </Link>
            </div>
        </div>
    )
}
