import { useEffect, useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { adminApi, AdminEvent } from '../../api/admin'

export default function AdminStoragePage() {
    const [events, setEvents] = useState<AdminEvent[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const data = await adminApi.getEvents()
            setEvents(data)
        } catch (error) {
            console.error('Failed to load storage data', error)
        } finally {
            setLoading(false)
        }
    }

    const totalStorageMB = events.reduce((acc, e) => acc + (e.storageMB || 0), 0)
    const totalGB = (totalStorageMB / 1024)

    // Top 5 Events by Storage
    const topEvents = [...events].sort((a, b) => b.storageMB - a.storageMB).slice(0, 5)

    if (loading) {
        return (
            <AdminLayout>
                <div className="p-8 text-gray-400">Loading storage data...</div>
            </AdminLayout>
        )
    }

    return (
        <AdminLayout>
            <h1 className="text-3xl font-bold text-white mb-2">Storage Management</h1>
            <p className="text-gray-400 mb-8">Monitor disk usage and optimize storage costs.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="glass-panel p-6">
                    <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">Total Storage Used</h3>
                    <div className="text-4xl font-bold text-white mb-1">
                        {totalGB.toFixed(2)} <span className="text-lg text-gray-500">GB</span>
                    </div>
                </div>
                <div className="glass-panel p-6">
                    <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">Estimated Cost (Monthly)</h3>
                    <div className="text-4xl font-bold text-green-400 mb-1">
                        ${(totalGB * 0.023).toFixed(2)} {/* Approx S3 cost */}
                    </div>
                    <p className="text-xs text-gray-500">Based on $0.023/GB</p>
                </div>
            </div>

            <div className="glass-panel p-6">
                <h3 className="text-lg font-bold text-white mb-6">Top Storage Consumers</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="p-4 text-sm font-medium text-gray-400">Event Name</th>
                                <th className="p-4 text-sm font-medium text-gray-400">Owner</th>
                                <th className="p-4 text-sm font-medium text-gray-400 text-right">Usage</th>
                                <th className="p-4 text-sm font-medium text-gray-400 text-right">% of Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {topEvents.map(evt => (
                                <tr key={evt.eventId}>
                                    <td className="p-4 text-white font-medium">{evt.name}</td>
                                    <td className="p-4 text-gray-400 text-sm">{evt.ownerName}</td>
                                    <td className="p-4 text-right text-yellow-400 font-bold">{evt.storageMB.toFixed(1)} MB</td>
                                    <td className="p-4 text-right text-gray-500 text-sm">
                                        {((evt.storageMB / (totalStorageMB || 1)) * 100).toFixed(1)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    )
}
