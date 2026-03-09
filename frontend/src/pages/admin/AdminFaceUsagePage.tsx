import { useEffect, useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { adminApi, AdminEvent } from '../../api/admin'

export default function AdminFaceUsagePage() {
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
            console.error('Failed to load face data', error)
        } finally {
            setLoading(false)
        }
    }

    const totalFaces = events.reduce((acc, e) => acc + (e.faceCount || 0), 0)
    // Approx Rekognition IndexFaces pricing: $0.001 per image? Or $1.00 per 1000 images processed?
    // Let's assume an arbitrary cost calculation or just show counts.
    const estimatedCost = (totalFaces / 1000) * 1.0

    return (
        <AdminLayout>
            <h1 className="text-3xl font-bold text-white mb-2">Face Recognition Usage</h1>
            <p className="text-gray-400 mb-8">Details on Rekognition API usage and face indexing.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="glass-panel p-6">
                    <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">Total Faces Indexed</h3>
                    <div className="text-4xl font-bold text-white">{totalFaces.toLocaleString()}</div>
                </div>
                <div className="glass-panel p-6">
                    <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">Est. API Cost</h3>
                    <div className="text-4xl font-bold text-pink-500">${estimatedCost.toFixed(2)}</div>
                </div>
            </div>

            <div className="glass-panel p-6">
                <h3 className="text-lg font-bold text-white mb-4">Usage By Event</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="p-4 text-sm font-medium text-gray-400">Event</th>
                                <th className="p-4 text-sm font-medium text-gray-400 text-right">Faces Found</th>
                                <th className="p-4 text-sm font-medium text-gray-400 text-right">Photo Count</th>
                                <th className="p-4 text-sm font-medium text-gray-400 text-right">Faces/Photo (Avg)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {events.sort((a, b) => b.faceCount - a.faceCount).slice(0, 20).map(evt => (
                                <tr key={evt.eventId}>
                                    <td className="p-4 text-white">{evt.name}</td>
                                    <td className="p-4 text-right text-pink-400 font-bold">{evt.faceCount}</td>
                                    <td className="p-4 text-right text-gray-400">{evt.photoCount}</td>
                                    <td className="p-4 text-right text-gray-500">
                                        {(evt.faceCount / (evt.photoCount || 1)).toFixed(1)}
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
