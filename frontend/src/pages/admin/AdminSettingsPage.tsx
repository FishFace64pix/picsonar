import { useEffect, useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { adminApi, AdminSettings } from '../../api/admin'

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<AdminSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const data = await adminApi.getSettings()
            setSettings(data)
        } catch (error) {
            console.error('Failed to load settings', error)
            setMessage({ type: 'error', text: 'Failed to load settings.' })
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (field: keyof AdminSettings, value: any) => {
        if (!settings) return
        setSettings({ ...settings, [field]: value })
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!settings) return

        setSaving(true)
        setMessage(null)
        try {
            await adminApi.updateSettings(settings)
            setMessage({ type: 'success', text: 'Settings updated successfully!' })
        } catch (error) {
            console.error('Failed to save settings', error)
            setMessage({ type: 'error', text: 'Failed to update settings.' })
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <AdminLayout><div className="text-gray-400 p-8">Loading settings...</div></AdminLayout>

    return (
        <AdminLayout>
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-2">System Configuration</h1>
                <p className="text-gray-400 mb-8">Manage global application settings and limits.</p>

                {message && (
                    <div className={`p-4 mb-6 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-6">
                    {/* General Settings */}
                    <div className="glass-panel p-6">
                        <h2 className="text-xl font-bold text-white mb-4">General Settings</h2>

                        <div className="flex items-center justify-between py-4 border-b border-white/5">
                            <div>
                                <h3 className="text-white font-medium">Maintenance Mode</h3>
                                <p className="text-sm text-gray-500">Temporarily disable access for all users except admins.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings?.maintenanceMode || false}
                                    onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between py-4">
                            <div>
                                <h3 className="text-white font-medium">Allow New Registrations</h3>
                                <p className="text-sm text-gray-500">Enable or disable new user sign-ups.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings?.allowNewRegistrations || false}
                                    onChange={(e) => handleChange('allowNewRegistrations', e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                            </label>
                        </div>
                    </div>

                    {/* Limits */}
                    <div className="glass-panel p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Global Limits & Defaults</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Free Tier Credits (New Users)</label>
                                <input
                                    type="number"
                                    className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                                    value={settings?.freeTierCredits || 0}
                                    onChange={(e) => handleChange('freeTierCredits', parseInt(e.target.value))}
                                />
                                <p className="text-xs text-gray-500 mt-1">Number of free events given upon registration.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Max Photos Per Event</label>
                                <input
                                    type="number"
                                    className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                                    value={settings?.maxPhotosPerEvent || 1000}
                                    onChange={(e) => handleChange('maxPhotosPerEvent', parseInt(e.target.value))}
                                />
                                <p className="text-xs text-gray-500 mt-1">Hard limit for photo uploads per event.</p>
                            </div>
                        </div>
                    </div>

                    {/* Announcements */}
                    <div className="glass-panel p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Global Announcement</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Banner Message</label>
                            <textarea
                                className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-primary-500 h-24 resize-none"
                                placeholder="Enter a message to display to all users..."
                                value={settings?.globalAnnouncement || ''}
                                onChange={(e) => handleChange('globalAnnouncement', e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1">Leave empty to hide.</p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className={`px-8 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    )
}
