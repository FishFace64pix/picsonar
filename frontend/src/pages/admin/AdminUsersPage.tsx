import { useEffect, useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { adminApi, AdminUser } from '../../api/admin'

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    useEffect(() => {
        loadUsers()
    }, [])

    const loadUsers = async () => {
        try {
            const data = await adminApi.getUsers()
            setUsers(data)
        } catch (error) {
            console.error('Failed to load users', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAction = async (userId: string, action: 'suspend' | 'activate' | 'add_credits' | 'delete') => {
        if (!window.confirm(`Are you sure you want to ${action} this user?`)) return

        setActionLoading(userId)
        try {
            if (action === 'add_credits') {
                await adminApi.manageUser(userId, action, { amount: 5 }) // Gift 5 credits
            } else {
                await adminApi.manageUser(userId, action)
            }
            // Refresh list
            await loadUsers()
        } catch (error) {
            alert('Failed to perform action')
        } finally {
            setActionLoading(null)
        }
    }

    return (
        <AdminLayout>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">User Management</h1>
                <div className="bg-white/10 px-4 py-2 rounded-lg text-sm text-gray-400">
                    Total Users: <span className="text-white font-bold">{users.length}</span>
                </div>
            </div>

            <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th className="p-4 text-sm font-medium text-gray-400">User</th>
                                <th className="p-4 text-sm font-medium text-gray-400">Status</th>
                                <th className="p-4 text-sm font-medium text-gray-400">Events</th>
                                <th className="p-4 text-sm font-medium text-gray-400">Credits</th>
                                <th className="p-4 text-sm font-medium text-gray-400">Joined</th>
                                <th className="p-4 text-sm font-medium text-gray-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading users...</td></tr>
                            ) : users.map((user) => (
                                <tr key={user.userId} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="text-white font-medium">{user.name}</div>
                                        <div className="text-xs text-gray-500">{user.email}</div>
                                        <div className="text-[10px] text-gray-600 font-mono mt-1">{user.userId}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.subscriptionStatus === 'active' ? 'bg-green-500/10 text-green-400' :
                                                user.subscriptionStatus === 'suspended' ? 'bg-red-500/10 text-red-400' :
                                                    'bg-gray-500/10 text-gray-400'
                                            }`}>
                                            {user.subscriptionStatus}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-300">{user.eventCount}</td>
                                    <td className="p-4 text-gray-300 font-bold">{user.credits}</td>
                                    <td className="p-4 text-gray-500 text-sm">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {/* Gift Credits */}
                                            <button
                                                onClick={() => handleAction(user.userId, 'add_credits')}
                                                disabled={!!actionLoading}
                                                className="p-2 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20"
                                                title="Gift 5 Credits"
                                            >
                                                +Cred
                                            </button>

                                            {/* Suspend/Activate */}
                                            {user.subscriptionStatus === 'suspended' ? (
                                                <button
                                                    onClick={() => handleAction(user.userId, 'activate')}
                                                    disabled={!!actionLoading}
                                                    className="p-2 bg-green-500/10 text-green-400 rounded hover:bg-green-500/20"
                                                >
                                                    Activate
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleAction(user.userId, 'suspend')}
                                                    disabled={!!actionLoading}
                                                    className="p-2 bg-yellow-500/10 text-yellow-400 rounded hover:bg-yellow-500/20"
                                                >
                                                    Suspend
                                                </button>
                                            )}

                                            {/* Delete (Hidden for safety usually, but requested) */}
                                            <button
                                                onClick={() => handleAction(user.userId, 'delete')}
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
