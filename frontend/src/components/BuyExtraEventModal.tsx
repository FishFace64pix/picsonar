import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface BuyExtraEventModalProps {
    onClose: () => void
}

const getCreditBundles = (plan: string) => {
    switch (plan) {
        case 'studio':
            return [
                { id: 'extra_5', credits: 5, price: 1050, label: '5 Credits', tag: null, description: 'Best for small events' },
                { id: 'extra_10', credits: 10, price: 1950, label: '10 Credits', tag: 'MOST POPULAR', description: 'Best for weddings with 300+ guests' },
                { id: 'extra_15', credits: 15, price: 2775, label: '15 Credits', tag: 'SAVE 20%', description: 'Agency Choice - Maximum ROI' }
            ]
        case 'agency':
            return [
                { id: 'extra_5', credits: 5, price: 2750, label: '5 Credits', tag: null, description: 'Best for small events' },
                { id: 'extra_10', credits: 10, price: 5000, label: '10 Credits', tag: 'MOST POPULAR', description: 'Best for weddings with 300+ guests' },
                { id: 'extra_15', credits: 15, price: 7125, label: '15 Credits', tag: 'SAVE 20%', description: 'Agency Choice - Maximum ROI' }
            ]
        case 'starter':
        default:
            return [
                { id: 'extra_5', credits: 5, price: 600, label: '5 Credits', tag: null, description: 'Best for small events' },
                { id: 'extra_10', credits: 10, price: 1000, label: '10 Credits', tag: 'MOST POPULAR', description: 'Best for weddings with 300+ guests' },
                { id: 'extra_15', credits: 15, price: 1350, label: '15 Credits', tag: 'SAVE 20%', description: 'Agency Choice - Maximum ROI' }
            ]
    }
}

export default function BuyExtraEventModal({ onClose }: BuyExtraEventModalProps) {
    const navigate = useNavigate()
    const { user } = useAuth()

    // Get bundles based on user's active plan (fallback to starter)
    const bundles = getCreditBundles(user?.plan || 'starter')
    const [selectedBundle, setSelectedBundle] = useState(bundles[1]) // Default to most popular

    const handleBuy = () => {
        // We Use type=extra_event and send the quantity and bundle ID
        navigate(`/checkout?type=extra_event&package=${selectedBundle.id}&quantity=${selectedBundle.credits}`)
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

                <h2 className="text-2xl font-bold mb-1 text-white">Add Credits</h2>
                <p className="text-gray-400 mb-6 text-sm">Select a credit bundle to increase your event capacity.</p>

                <div className="space-y-4 mb-8">
                    {bundles.map((bundle) => (
                        <div
                            key={bundle.id}
                            onClick={() => setSelectedBundle(bundle)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col relative ${selectedBundle.id === bundle.id
                                ? 'border-primary-500 bg-primary-500/10 shadow-[0_0_15px_rgba(217,70,239,0.2)]'
                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                }`}
                        >
                            {bundle.tag && (
                                <div className="absolute -top-2.5 right-4 bg-primary-600 text-[10px] font-black text-white px-2 py-0.5 rounded-full tracking-widest shadow-lg">
                                    {bundle.tag}
                                </div>
                            )}
                            <div className="flex justify-between items-center mb-1">
                                <div className="text-white font-bold text-lg">{bundle.label}</div>
                                <div className="text-right">
                                    <div className="text-primary-400 font-bold text-xl">{bundle.price} RON</div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="text-gray-500 text-[10px] uppercase font-bold tracking-tight">{bundle.description}</div>
                                <div className="text-gray-400 text-[10px]">{(bundle.price / bundle.credits).toFixed(2)} RON / credit</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-white/5 rounded-xl p-4 mb-8 border border-white/10">
                    <div className="flex justify-between items-center text-lg font-bold">
                        <span className="text-white">Total</span>
                        <span className="text-primary-400">{selectedBundle.price} RON</span>
                    </div>
                </div>

                <button
                    onClick={handleBuy}
                    className="w-full btn-primary py-3 text-lg font-bold shadow-lg shadow-primary-500/25"
                >
                    Secure Checkout
                </button>
            </div>
        </div>
    )
}
