import { useEffect, useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { adminApi, AdminEvent } from '../../api/admin'

export default function AdminEventsPage() {
    const [events, setEvents] = useState<AdminEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    useEffect(() => {
        loadEvents()
    }, [])

    const loadEvents = async () => {
        try {
            const data = await adminApi.getEvents()
            setEvents(data)
        } catch (error) {
            console.error('Failed to load events', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAction = async (eventId: string, action: 'close_event' | 'open_event' | 'delete_event') => {
        const confirmMsg = action === 'delete_event'
            ? 'WARNING: This will permanently delete the event data. Continue?'
            : `Are you sure you want to ${action.replace('_', ' ')}?`

        if (!window.confirm(confirmMsg)) return

        setActionLoading(eventId)
        try {
            await adminApi.manageEvent(eventId, action)
            await loadEvents() // Refresh list
        } catch (error) {
            alert('Failed to perform action')
        } finally {
            setActionLoading(null)
        }
    }

    // Calculate total usage for summary
    const totalStorageMB = events.reduce((acc, e) => acc + (e.storageMB || 0), 0)
    const totalPhotos = events.reduce((acc, e) => acc + (e.photoCount || 0), 0)

    return (
        <AdminLayout>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Events & Storage</h1>
                    <p className="text-gray-400 mt-1">
                        Total Storage: <span className="text-yellow-400 font-bold">{(totalStorageMB / 1024).toFixed(2)} GB</span>
                        <span className="mx-2">•</span>
                        Photos: <span className="text-pink-400 font-bold">{totalPhotos.toLocaleString()}</span>
                    </p>
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-lg text-sm text-gray-400">
                    Total Events: <span className="text-white font-bold">{events.length}</span>
                </div>
            </div>

            <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th className="p-4 text-sm font-medium text-gray-400">Event</th>
                                <th className="p-4 text-sm font-medium text-gray-400">Owner</th>
                                <th className="p-4 text-sm font-medium text-gray-400">Status</th>
                                <th className="p-4 text-sm font-medium text-gray-400">Photos / Faces</th>
                                <th className="p-4 text-sm font-medium text-gray-400">Est. Storage</th>
                                <th className="p-4 text-sm font-medium text-gray-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading events...</td></tr>
                            ) : events.map((evt) => (
                                <tr key={evt.eventId} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="text-white font-medium">{evt.name}</div>
                                        <div className="text-[10px] text-gray-600 font-mono mt-1">{evt.date.split('T')[0]}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-gray-300">{evt.ownerName}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${evt.status === 'active' ? 'bg-green-500/10 text-green-400' :
                                            evt.status === 'closed' ? 'bg-red-500/10 text-red-400' :
                                                'bg-gray-500/10 text-gray-400'
                                            }`}>
                                            {evt.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-300">
                                        <div className="flex items-center gap-2">
                                            <span>📷 {evt.photoCount}</span>
                                            <span className="text-gray-600">|</span>
                                            <span>👤 {evt.faceCount}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-yellow-500 font-medium" title={evt.storageMB % 1 === 0 ? "Estimated (2MB/photo)" : "Precise Calculation"}>
                                        {evt.storageMB.toFixed(2)} MB
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {evt.status === 'closed' ? (
                                                <button
                                                    onClick={() => handleAction(evt.eventId, 'open_event')}
                                                    disabled={!!actionLoading}
                                                    className="p-2 bg-green-500/10 text-green-400 rounded hover:bg-green-500/20"
                                                >
                                                    Open
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleAction(evt.eventId, 'close_event')}
                                                    disabled={!!actionLoading}
                                                    className="p-2 bg-yellow-500/10 text-yellow-400 rounded hover:bg-yellow-500/20"
                                                    title="Prevents new uploads"
                                                >
                                                    Close
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleAction(evt.eventId, 'delete_event')}
                                                disabled={!!actionLoading}
                                                className="p-2 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20"
                                            >
                                                Del
                                            </button>
                                        </div>
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
