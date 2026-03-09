import { useEffect, useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { adminApi, AuditLog } from '../../api/admin'

export default function AdminSecurityPage() {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadLogs()
    }, [])

    const loadLogs = async () => {
        try {
            const data = await adminApi.getLogs()
            setLogs(data)
        } catch (error) {
            console.error('Failed to load logs', error)
        } finally {
            setLoading(false)
        }
    }

    const getActionColor = (action: string) => {
        if (action.includes('delete')) return 'text-red-400'
        if (action.includes('suspend')) return 'text-yellow-400'
        if (action.includes('activate') || action.includes('open')) return 'text-green-400'
        return 'text-blue-400'
    }

    return (
        <AdminLayout>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Security & Audit Logs</h1>
                <button
                    onClick={loadLogs}
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-sm text-gray-300"
                >
                    Refresh Logs
                </button>
            </div>

            <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase">Timestamp</th>
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase">Admin / User</th>
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase">Action</th>
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase">Details</th>
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Loading logs...</td></tr>
                            ) : logs.map((log) => (
                                <tr key={log.logId} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 text-sm text-gray-500 font-mono">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-sm text-gray-300">
                                        {log.adminId}
                                    </td>
                                    <td className={`p-4 text-sm font-medium ${getActionColor(log.action)}`}>
                                        {log.action.toUpperCase()}
                                    </td>
                                    <td className="p-4 text-xs text-gray-400 font-mono max-w-xs truncate">
                                        {JSON.stringify(log.details)}
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${log.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {log.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {!loading && logs.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No logs found. Perform some admin actions first.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    )
}
