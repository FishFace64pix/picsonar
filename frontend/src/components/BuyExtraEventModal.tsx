import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PACKAGES } from '@picsonar/shared/constants'

interface BuyExtraEventModalProps {
    onClose: () => void
}

const pkg = PACKAGES['extra_event']
const PRICE_PER_EVENT = pkg.priceMinor / 100 // 199 RON

export default function BuyExtraEventModal({ onClose }: BuyExtraEventModalProps) {
    const navigate = useNavigate()
    const [quantity, setQuantity] = useState(1)

    const total = quantity * PRICE_PER_EVENT

    const handleBuy = () => {
        navigate(`/checkout?package=extra_event&quantity=${quantity}`)
    }

    return (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="glass-panel p-8 w-full max-w-md animate-slide-up border border-white/20 shadow-2xl shadow-primary-500/20 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <h2 className="text-2xl font-bold mb-1 text-white">Add Extra Events</h2>
                <p className="text-gray-400 mb-6 text-sm">
                    Each extra event credit gives you access to up to {pkg.limits.photoLimitPerEvent.toLocaleString()} photos
                    for {pkg.limits.storageMonths} months.
                </p>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                    <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">
                        How many events?
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <button
                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            disabled={quantity <= 1}
                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-bold text-xl flex items-center justify-center transition-colors"
                        >
                            −
                        </button>
                        <div className="text-center">
                            <div className="text-4xl font-black text-white">{quantity}</div>
                            <div className="text-xs text-gray-500 mt-1">
                                {quantity === 1 ? 'event credit' : 'event credits'}
                            </div>
                        </div>
                        <button
                            onClick={() => setQuantity(q => Math.min(10, q + 1))}
                            disabled={quantity >= 10}
                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-bold text-xl flex items-center justify-center transition-colors"
                        >
                            +
                        </button>
                    </div>
                    <div className="text-center mt-4 text-sm text-gray-400">
                        {PRICE_PER_EVENT} RON × {quantity} = <span className="text-primary-400 font-bold">{total} RON</span>
                    </div>
                </div>

                <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
                    <div className="flex justify-between items-center text-lg font-bold">
                        <span className="text-white">Total</span>
                        <span className="text-primary-400">{total} RON</span>
                    </div>
                </div>

                <button
                    onClick={handleBuy}
                    className="w-full btn-primary py-3 text-lg font-bold shadow-lg shadow-primary-500/25"
                >
                    Secure Checkout →
                </button>
            </div>
        </div>
    )
}
