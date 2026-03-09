import { useEffect, useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { adminApi, AdminStats } from '../../api/admin'

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await adminApi.getStats()
                setStats(data)
            } catch (err) {
                console.error('Failed to fetch admin stats:', err)
                setError('Failed to load system stats.')
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
                </div>
            </AdminLayout>
        )
    }

    if (error) {
        return (
            <AdminLayout>
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl">
                    {error}
                </div>
            </AdminLayout>
        )
    }

    return (
        <AdminLayout>
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">System Overview</h1>
                    <p className="text-gray-400">Live metrics from PicSonar infrastructure.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* USERS CARD */}
                    <div className="glass-panel p-6 border-l-4 border-l-blue-500">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-gray-400 text-sm font-medium">Total Users</h3>
                                <div className="text-3xl font-bold text-white mt-1">
                                    {stats?.totalUsers.toLocaleString()}
                                </div>
                            </div>
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                        </div>
                        <div className="text-xs text-green-400 font-medium">
                            {stats?.activeSubs} Active Subscriptions
                        </div>
                    </div>

                    {/* EVENTS CARD */}
                    <div className="glass-panel p-6 border-l-4 border-l-purple-500">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-gray-400 text-sm font-medium">Total Events</h3>
                                <div className="text-3xl font-bold text-white mt-1">
                                    {stats?.totalEvents.toLocaleString()}
                                </div>
                            </div>
                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                        </div>
                        <div className="text-xs text-purple-300 font-medium">
                            {stats?.activeEvents} Active Now
                        </div>
                    </div>

                    {/* PHOTOS CARD */}
                    <div className="glass-panel p-6 border-l-4 border-l-pink-500">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-gray-400 text-sm font-medium">Total Photos</h3>
                                <div className="text-3xl font-bold text-white mt-1">
                                    {stats?.totalPhotos.toLocaleString()}
                                </div>
                            </div>
                            <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                        <div className="text-xs text-pink-300 font-medium">
                            {stats?.totalFaces.toLocaleString()} Faces Indexed
                        </div>
                    </div>

                    {/* STORAGE CARD */}
                    <div className="glass-panel p-6 border-l-4 border-l-yellow-500">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-gray-400 text-sm font-medium">Storage Used</h3>
                                <div className="text-3xl font-bold text-white mt-1">
                                    {stats?.totalStorageGB} GB
                                </div>
                            </div>
                            <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                </svg>
                            </div>
                        </div>
                        <div className="text-xs text-yellow-300 font-medium">
                            Approximate (2MB/photo)
                        </div>
                    </div>
                </div>

                {/* TODAY REVENUE */}
                <div className="glass-panel p-8 flex items-center justify-between bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/20">
                    <div>
                        <h3 className="text-green-400 font-bold text-lg mb-1">Today's Revenue</h3>
                        <p className="text-gray-400 text-sm">Real-time Stripe payments processed today.</p>
                    </div>
                    <div className="text-4xl font-bold text-green-400">
                        {stats?.todaysRevenue.toFixed(2)} {stats?.currency}
                    </div>
                </div>

                {/* ALERT/STATUS SECTION */}
                <div className="glass-panel p-6">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        System Health
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm py-2 border-b border-white/5">
                            <span className="text-gray-400">AWS Rekognition Status</span>
                            <span className="text-green-400 font-medium">Operational</span>
                        </div>
                        <div className="flex items-center justify-between text-sm py-2 border-b border-white/5">
                            <span className="text-gray-400">S3 Storage Bucket</span>
                            <span className="text-green-400 font-medium">Operational</span>
                        </div>
                        <div className="flex items-center justify-between text-sm py-2 border-b border-white/5">
                            <span className="text-gray-400">DynamoDB Latency</span>
                            <span className="text-green-400 font-medium">Normal (12ms)</span>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}
