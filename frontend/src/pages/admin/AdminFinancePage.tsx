import { useEffect, useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { adminApi, AdminFinanceStats } from '../../api/admin'

export default function AdminFinancePage() {
    const [stats, setStats] = useState<AdminFinanceStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await adminApi.getFinance()
                setStats(data)
            } catch (error) {
                console.error('Failed to load finance stats', error)
            } finally {
                setLoading(false)
            }
        }
        loadStats()
    }, [])

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-400">Loading Finance Data...</div>
                </div>
            </AdminLayout>
        )
    }

    return (
        <AdminLayout>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Finance & Subscriptions</h1>
                <div className="bg-green-500/10 border border-green-500/20 px-6 py-3 rounded-xl">
                    <span className="text-gray-400 text-sm">Lifetime Revenue</span>
                    <div className="text-3xl font-bold text-green-400">
                        {stats?.totalRevenue.toLocaleString()} RON
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* PACKAGE STATS */}
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-bold text-white mb-6">Package Performance</h3>
                    <div className="space-y-4">
                        {Object.entries(stats?.packageStats || {}).map(([pkg, count]) => {
                            const percentage = ((count / (stats?.totalOrders || 1)) * 100).toFixed(1)
                            return (
                                <div key={pkg} className="group">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-white font-medium capitalize">{pkg.replace(/_/g, ' ')}</span>
                                        <span className="text-gray-400">{count} sold</span>
                                    </div>
                                    <div className="w-full bg-white/5 rounded-full h-2">
                                        <div
                                            className="bg-primary-500 h-2 rounded-full transition-all duration-500 group-hover:bg-primary-400"
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                    <div className="text-right text-xs text-gray-500 mt-1">{percentage}%</div>
                                </div>
                            )
                        })}
                        {Object.keys(stats?.packageStats || {}).length === 0 && (
                            <p className="text-gray-500 text-center py-4">No sales data yet.</p>
                        )}
                    </div>
                </div>

                {/* RECENT ORDERS TABLE */}
                <div className="glass-panel p-0 overflow-hidden lg:col-span-2">
                    <div className="p-6 border-b border-white/10 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
                        <span className="text-xs text-gray-500">Last 50 orders</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase">Order ID</th>
                                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase">Package</th>
                                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase">Amount</th>
                                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase">User</th>
                                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {stats?.recentOrders.map((order) => (
                                    <tr key={order.orderId} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-mono text-xs text-gray-500">
                                            {order.orderId.substring(0, 8)}...
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-primary-500/10 text-primary-300 rounded text-xs font-medium capitalize">
                                                {order.pkg?.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4 font-bold text-white">
                                            {order.amount} {order.currency.toUpperCase()}
                                        </td>
                                        <td className="p-4 text-sm text-gray-400">
                                            {order.userId.substring(0, 10)}...
                                        </td>
                                        <td className="p-4 text-right text-sm text-gray-500">
                                            {new Date(order.date).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                                {stats?.recentOrders.length === 0 && (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">No transactions found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}
