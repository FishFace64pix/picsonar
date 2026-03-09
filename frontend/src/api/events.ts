import { apiClient } from './client'
import { Event, Photo, Face } from '../types'
import { v4 as uuidv4 } from 'uuid'

// Mock Data Store with LocalStorage Persistence
const loadFromStorage = (key: string) => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : []
  } catch {
    return []
  }
}

const saveToStorage = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data))
}

const mockStore = {
  events: loadFromStorage('mock_events') as Event[],
  photos: loadFromStorage('mock_photos') as Photo[],
  faces: loadFromStorage('mock_faces') as Face[],
}

// Initial Mock Data Seeding (only if empty)
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

if (USE_MOCK && mockStore.events.length === 0) {
  console.log('Mock Mode Enabled - Seeding Data')
  const seedEvent = {
    eventId: 'mock-event-1',
    userId: 'mock-user-1',
    eventName: 'Mock Wedding 2024',
    createdAt: new Date().toISOString(),
    status: 'active' as const,
    totalPhotos: 0,
    totalFaces: 0,
  }
  mockStore.events = [seedEvent]
  saveToStorage('mock_events', mockStore.events)
}

export const eventsApi = {
  createEvent: async (eventName: string, userId: string): Promise<Event> => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500))
      const newEvent: Event = {
        eventId: uuidv4(),
        userId,
        eventName,
        createdAt: new Date().toISOString(),
        status: 'active',
        totalPhotos: 0,
        totalFaces: 0,
      }
      mockStore.events.push(newEvent)
      saveToStorage('mock_events', mockStore.events)
      return newEvent
    }
    const response = await apiClient.post('/event', { eventName, userId })
    return response.data
  },

  getEvents: async (): Promise<Event[]> => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return [...mockStore.events]
    }
    const response = await apiClient.get('/events')
    return response.data
  },

  getEvent: async (eventId: string): Promise<Event> => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500))
      const event = mockStore.events.find(e => e.eventId === eventId)
      if (!event) throw new Error('Event not found')
      return event
    }
    const response = await apiClient.get(`/event/${eventId}`)
    return response.data
  },

  uploadPhoto: async (eventId: string, file: File, onProgress?: (progress: number) => void): Promise<Photo> => {
    if (USE_MOCK) {
      if (onProgress) {
        for (let i = 0; i <= 100; i += 20) {
          onProgress(i)
          await new Promise(r => setTimeout(r, 100))
        }
      }

      // 1. Create Photo
      const newPhoto: Photo = {
        photoId: uuidv4(),
        eventId,
        s3Url: URL.createObjectURL(file), // Persistent blob URL issue? Blobs revoke on refresh. 
        // Ideally we would base64 encode for localStorage but that's heavy. 
        // For now, we accept blob URLs will break on refresh unless we re-upload or use base64.
        // Let's stick to blob for performance but acknowledging the limitation, 
        // OR better: use a dummy placeholder image URL if blob fails? 
        // Actually, let's try to read file as dataUrl for persistence if small enough.
        s3Key: file.name,
        faces: [],
        uploadedAt: new Date().toISOString(),
      }

      // Attempt DataURL for persistence (limit size)
      if (file.size < 5000000) { // < 5MB
        const reader = new FileReader()
        newPhoto.s3Url = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.readAsDataURL(file)
        })
      }

      // 2. Mock Face Detection
      // Randomly decide if this photo has a face (80% chance)
      if (Math.random() > 0.2) {
        const faceId = uuidv4()
        newPhoto.faces.push(faceId)

        // Create Face record
        const newFace: Face = {
          faceId,
          eventId,
          rekognitionFaceId: uuidv4(),
          samplePhotoUrl: newPhoto.s3Url,
          associatedPhotos: [newPhoto.photoId]
        }

        // Check if we should merge with existing face (50% chance to be "same person")
        const existingFace = mockStore.faces.find(f => f.eventId === eventId && Math.random() > 0.5)
        if (existingFace) {
          existingFace.associatedPhotos.push(newPhoto.photoId)
          // Update photo's face list to point to existing face instead of new one?
          // Actually, the photo.faces is array of faceIds. 
          // Logic: If same person, we use existingFace.faceId
          newPhoto.faces = [existingFace.faceId]
          saveToStorage('mock_faces', mockStore.faces)
        } else {
          mockStore.faces.push(newFace)
          saveToStorage('mock_faces', mockStore.faces)

          // Update event stats
          const event = mockStore.events.find(e => e.eventId === eventId)
          if (event) event.totalFaces += 1
        }
      }

      mockStore.photos.push(newPhoto)
      saveToStorage('mock_photos', mockStore.photos)

      // Update event stats
      const event = mockStore.events.find(e => e.eventId === eventId)
      if (event) {
        event.totalPhotos += 1
        saveToStorage('mock_events', mockStore.events)
      }

      return newPhoto
    }

    const formData = new FormData()
    formData.append('photo', file)

    const response = await apiClient.post(`/event/${eventId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })
    return response.data
  },

  getEventFaces: async (eventId: string): Promise<Face[]> => {
    if (USE_MOCK) {
      return mockStore.faces.filter(f => f.eventId === eventId)
    }
    const response = await apiClient.get(`/event/${eventId}/faces`)
    return response.data
  },



  matchFace: async (eventId: string, imageFile: File): Promise<{ matches: Array<{ faceId: string; confidence: number; photos: Photo[] }> }> => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Get all photos for this event
      const eventPhotos = mockStore.photos.filter(p => p.eventId === eventId)

      if (eventPhotos.length === 0) {
        return { matches: [] }
      }

      // Randomly select some photos to be "matched"
      const matchedPhotos = eventPhotos.filter(() => Math.random() > 0.5)

      // Ensure at least one match if photos exist
      if (matchedPhotos.length === 0 && eventPhotos.length > 0) {
        matchedPhotos.push(eventPhotos[0])
      }

      return {
        matches: [
          {
            faceId: 'mock-face-match-' + Date.now(),
            confidence: 98.5,
            photos: matchedPhotos
          }
        ]
      }
    }
    const formData = new FormData()
    formData.append('image', imageFile)

    const response = await apiClient.post('/match-face', formData, {
      params: { eventId },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  getEventPhotos: async (eventId: string): Promise<Photo[]> => {
    if (USE_MOCK) {
      return mockStore.photos.filter(p => p.eventId === eventId)
    }
    // Real API implementation
    const response = await apiClient.get(`/event/${eventId}/photos`)
    return response.data
  },

  deletePhoto: async (eventId: string, photoId: string): Promise<void> => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 300))
      mockStore.photos = mockStore.photos.filter(p => p.photoId !== photoId)
      saveToStorage('mock_photos', mockStore.photos)

      // Update stats
      const event = mockStore.events.find(e => e.eventId === eventId)
      if (event && event.totalPhotos > 0) {
        event.totalPhotos -= 1
        saveToStorage('mock_events', mockStore.events)
      }
      return
    }
    await apiClient.delete(`/event/${eventId}/photos/${photoId}`)
  },

  deletePhotos: async (eventId: string, photoIds: string[]): Promise<void> => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500))
      mockStore.photos = mockStore.photos.filter(p => !photoIds.includes(p.photoId))
      saveToStorage('mock_photos', mockStore.photos)

      // Update stats
      const event = mockStore.events.find(e => e.eventId === eventId)
      if (event) {
        event.totalPhotos = Math.max(0, event.totalPhotos - photoIds.length)
        saveToStorage('mock_events', mockStore.events)
      }
      return
    }
    await apiClient.post(`/event/${eventId}/photos/delete-batch`, { photoIds })
  },

  generateQRCodes: async (eventId: string): Promise<{ qrCodesUrl: string }> => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 800))
      return { qrCodesUrl: '#' }
    }
    const response = await apiClient.post(`/event/${eventId}/generate-qr-codes`)
    return response.data
  }
}
