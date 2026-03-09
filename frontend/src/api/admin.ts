import { apiClient } from './client'
import { Order } from '../types'

export interface AdminStats {
    totalUsers: number
    activeSubs: number
    totalEvents: number
    activeEvents: number
    totalPhotos: number
    totalFaces: number
    totalStorageGB: string
    todaysRevenue: number
    currency: string
}

export interface AdminUser {
    userId: string
    email: string
    name: string
    role: string
    subscriptionStatus: string
    createdAt: string
    lastLogin?: string
    eventCount: number
    credits: number
}

export interface AdminEvent {
    eventId: string
    name: string
    ownerId: string
    ownerName: string
    status: string
    date: string
    photoCount: number
    faceCount: number
    storageMB: number
}

export interface AdminFinanceStats {
    totalRevenue: number
    totalOrders: number
    recentOrders: {
        orderId: string
        userId: string
        amount: number
        currency: string
        pkg: string
        status: string
        date: string
    }[]
    packageStats: Record<string, number>
}

export interface AuditLog {
    logId: string
    timestamp: number
    adminId: string
    action: string
    details: any
    status: string
    dateIso: string
}

export interface AdminSettings {
    maintenanceMode: boolean
    allowNewRegistrations: boolean
    freeTierCredits: number
    maxPhotosPerEvent: number
    globalAnnouncement: string
}

export const adminApi = {
    getOrders: async (): Promise<Order[]> => {
        const response = await apiClient.get('/admin/orders')
        return response.data
    },
    getStats: async (): Promise<AdminStats> => {
        const response = await apiClient.get('/admin/stats')
        return response.data
    },
    getUsers: async (): Promise<AdminUser[]> => {
        const response = await apiClient.get('/admin/users')
        return response.data
    },
    manageUser: async (userId: string, action: 'suspend' | 'activate' | 'delete' | 'add_credits', payload?: any) => {
        const response = await apiClient.post('/admin/users/manage', { userId, action, payload })
        return response.data
    },
    getEvents: async (): Promise<AdminEvent[]> => {
        const response = await apiClient.get('/admin/events')
        return response.data
    },
    manageEvent: async (eventId: string, action: 'close_event' | 'open_event' | 'delete_event') => {
        const response = await apiClient.post('/admin/events/manage', { eventId, action })
        return response.data
    },
    getFinance: async (): Promise<AdminFinanceStats> => {
        const response = await apiClient.get('/admin/finance')
        return response.data
    },
    getLogs: async (): Promise<AuditLog[]> => {
        const response = await apiClient.get('/admin/logs')
        return response.data
    },
    getSettings: async (): Promise<AdminSettings> => {
        const response = await apiClient.get('/admin/settings')
        return response.data
    },
    updateSettings: async (settings: Partial<AdminSettings>): Promise<void> => {
        await apiClient.post('/admin/settings', settings)
    }
}
