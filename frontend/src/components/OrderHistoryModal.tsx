import { useEffect, useState } from 'react'
import { authApi } from '../api/auth'

interface Order {
    orderId: string
    createdAt: string
    amount: number
    currency: string
    status: string
    packageId: string
    paymentIntentId: string
}

interface OrderHistoryModalProps {
    onClose: () => void
}

export default function OrderHistoryModal({ onClose }: OrderHistoryModalProps) {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadOrders()
    }, [])

    const loadOrders = async () => {
        try {
            const data = await authApi.getOrders()
            setOrders(data)
        } catch (error) {
            console.error('Failed to load orders:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amount / 100)
    }

    const formatPackageName = (packageId: string) => {
        const names: Record<string, string> = {
            'starter': 'Starter',
            'studio': 'Studio',
            'agency': 'Agency',
            'extra_5': 'Extra Credits (5)',
            'extra_10': 'Extra Credits (10)',
            'extra_15': 'Extra Credits (15)'
        }
        return names[packageId] || packageId
    }

    return (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="glass-panel p-8 w-full max-w-4xl animate-slide-up border border-white/20 shadow-2xl relative max-h-[90vh] overflow-hidden flex flex-col">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <h2 className="text-2xl font-bold mb-6 text-white text-center">Purchase History</h2>

                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="text-center py-10 text-gray-400">Loading history...</div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">No purchase history found.</div>
                    ) : (
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-gray-400 border-b border-white/10 text-sm">
                                        <th className="p-4 font-medium">Date</th>
                                        <th className="p-4 font-medium">Item</th>
                                        <th className="p-4 font-medium">Amount</th>
                                        <th className="p-4 font-medium">Status</th>
                                        <th className="p-4 font-medium text-right">Order ID</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm text-gray-300">
                                    {orders.map((order) => (
                                        <tr key={order.orderId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="p-4">{new Date(order.createdAt).toLocaleDateString()}</td>
                                            <td className="p-4 font-medium text-white">{formatPackageName(order.packageId)}</td>
                                            <td className="p-4">{formatCurrency(order.amount, order.currency)}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.status === 'PAID' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-mono text-xs text-gray-500">{order.orderId.slice(-8)}...</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
