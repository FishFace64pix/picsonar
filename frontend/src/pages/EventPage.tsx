import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { eventsApi } from '../api/events'
import { Event, Face, Photo } from '../types'
import PhotoUpload from '../components/PhotoUpload'
import Navbar from '../components/Navbar'

export default function EventPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [event, setEvent] = useState<Event | null>(null)
  const [faces, setFaces] = useState<Face[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingQR, setGeneratingQR] = useState(false)
  const [activeTab, setActiveTab] = useState<'photos' | 'faces'>('photos')

  // Delete / Selection State
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([])
  const [selectionMode, setSelectionMode] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    if (eventId) {
      loadEventData()
    }
  }, [eventId, user, navigate])

  const loadEventData = async () => {
    if (!eventId) return
    try {
      const [eventData, facesData, photosData] = await Promise.all([
        eventsApi.getEvent(eventId),
        eventsApi.getEventFaces(eventId),
        // @ts-ignore
        eventsApi.getEventPhotos ? eventsApi.getEventPhotos(eventId) : Promise.resolve([])
      ])
      setEvent(eventData)
      setFaces(facesData)
      setPhotos(photosData as Photo[])
    } catch (error) {
      console.error('Failed to load event data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateQRCodes = async () => {
    if (!eventId) return
    setGeneratingQR(true)
    try {
      const { qrCodesUrl } = await eventsApi.generateQRCodes(eventId)
      if (qrCodesUrl && qrCodesUrl !== '#') {
        window.open(qrCodesUrl, '_blank')
      } else {
        alert('QR Codes generated (Mock Mode)')
      }
      await loadEventData()
    } catch (error) {
      console.error('Failed to generate QR codes:', error)
    } finally {
      setGeneratingQR(false)
    }
  }

  const togglePhotoSelection = (photoId: string) => {
    if (selectedPhotos.includes(photoId)) {
      setSelectedPhotos(selectedPhotos.filter(id => id !== photoId))
    } else {
      setSelectedPhotos([...selectedPhotos, photoId])
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedPhotos.length === 0 || !eventId) return
    if (!confirm(`Are you sure you want to delete ${selectedPhotos.length} photos?`)) return

    try {
      await eventsApi.deletePhotos(eventId, selectedPhotos)
      setSelectedPhotos([])
      setSelectionMode(false)
      loadEventData()
    } catch (error) {
      console.error('Failed to delete photos:', error)
      alert('Failed to delete photos')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="pt-32 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="pt-32 text-center text-white">Event not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-40">
      <Navbar />

      {/* Hero Header */}
      <div className="relative pt-32 pb-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-white border-b border-white/10 pb-8">
          <div className="animate-fade-in">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-white mb-4 flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-2">
              {event.eventName}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>{new Date(event.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-white text-xs uppercase tracking-wide">{event.status}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-white/5 p-1 rounded-xl backdrop-blur-md self-start md:self-end">
            <button
              onClick={() => setActiveTab('photos')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 ${activeTab === 'photos' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              Gallery ({photos.length})
            </button>
            <button
              onClick={() => setActiveTab('faces')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 ${activeTab === 'faces' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              Detected Faces ({faces.length})
            </button>
          </div>
        </div>
      </div>
      {/* AI Processing Status Bar */}
      <div className="max-w-7xl mx-auto px-4 -mt-6 relative z-10">
        <div className="glass-panel p-4 flex flex-wrap items-center justify-between gap-6 border-primary-500/20 shadow-xl shadow-primary-500/10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">System Online</span>
            </div>
            <div className="h-4 w-px bg-white/10 hidden md:block"></div>
            <div className="flex items-center gap-4">
              <div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Processed</div>
                <div className="text-xl font-black text-white">{photos.length} <span className="text-xs text-gray-500 font-normal">Photos</span></div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Faces Indexed</div>
                <div className="text-xl font-black text-primary-400">{faces.length} <span className="text-xs text-gray-500 font-normal">Found</span></div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-grow max-w-md hidden lg:flex">
            <div className="flex-grow bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary-500 h-full w-[100%] transition-all duration-1000"></div>
            </div>
            <span className="text-[10px] font-bold text-gray-500 uppercase">Indexing 100%</span>
          </div>

          <div className="bg-primary-500/10 px-3 py-1 rounded-full border border-primary-500/20 text-[10px] font-black text-primary-400 uppercase tracking-widest">
            AI Engine v4.2 Pro
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Upload (Sticky on Desktop) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-8 animate-slide-up">
              <div className="glass-panel p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Add Photos
                </h2>
                {user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trial' ? (
                  <PhotoUpload eventId={eventId!} onUploadComplete={loadEventData} />
                ) : (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                    <p className="text-red-300 text-sm font-semibold mb-2">Upload Disabled</p>
                    <p className="text-gray-400 text-xs">Subscription required to upload photos and process faces.</p>
                  </div>
                )}
              </div>

              {/* GDPR & Data Compliance Panel */}
              <div className="glass-panel p-6 border-primary-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <h2 className="text-lg font-bold text-white uppercase tracking-tight">GDPR & Compliance</h2>
                </div>

                <div className="space-y-4">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Data Retention Status</div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-sm text-gray-300 font-medium">Auto-Deletion Scheduled</span>
                    </div>
                    <div className="mt-2 text-xs text-primary-400 font-bold">
                      {event?.createdAt ? new Date(new Date(event.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString() : 'TBD'}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                      All biometric vectors and photos will be irreversibly erased on this date.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 border border-white/5 rounded-lg text-center">
                      <div className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">Guest Consent</div>
                      <div className="text-[10px] text-green-400 font-bold uppercase mt-0.5">Active</div>
                    </div>
                    <div className="p-2 border border-white/5 rounded-lg text-center">
                      <div className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">Encryption</div>
                      <div className="text-[10px] text-primary-400 font-bold uppercase mt-0.5">AES-256</div>
                    </div>
                  </div>

                  <a href="/dpa" className="block text-center text-xs text-gray-500 hover:text-white underline transition-colors">
                    View Data Processing Addendum
                  </a>
                </div>
              </div>

              {/* Guest Sharing Link Panel */}
              <div className="glass-panel p-6 border-primary-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  </div>
                  <h2 className="text-lg font-bold text-white uppercase tracking-tight">Guest Link</h2>
                </div>
                <p className="text-xs text-gray-400 mb-3">Share this link so guests can find their photos.</p>
                <div className="bg-white/5 px-3 py-2 rounded-lg text-xs text-primary-300 font-mono break-all border border-white/10 mb-3">
                  {window.location.origin}/guest/{eventId}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/guest/${eventId}`)
                    alert('Guest link copied!')
                  }}
                  className="w-full bg-primary-600 hover:bg-primary-500 text-white py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                  Copy Link
                </button>
              </div>

            </div>
          </div>

          {/* Right Column: Gallery/Faces */}
          <div className="lg:col-span-2">
            {activeTab === 'photos' ? (
              <div className="animate-fade-in">
                {/* Selection / Delete Controls */}
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10 mb-6">
                  <div className="flex items-center gap-4">
                    <h2 className="font-bold text-white">Event Gallery</h2>
                    <span className="text-sm text-gray-400">{photos.length} photos</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectionMode ? (
                      <>
                        <span className="text-sm text-gray-300">{selectedPhotos.length} selected</span>
                        <button
                          onClick={handleDeleteSelected}
                          disabled={selectedPhotos.length === 0}
                          className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                        >
                          Delete Selected
                        </button>
                        <button
                          onClick={() => {
                            setSelectionMode(false)
                            setSelectedPhotos([])
                          }}
                          className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setSelectionMode(true)}
                        className="px-4 py-2 bg-white/5 text-gray-300 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Select & Delete
                      </button>
                    )}
                  </div>
                </div>

                {photos.length === 0 ? (
                  <div className="glass-panel p-12 text-center border-dashed border-2 border-white/10">
                    <p className="text-gray-400">No photos uploaded yet. Start dragging files to the left.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {photos.map((photo) => (
                      <div
                        key={photo.photoId}
                        onClick={() => selectionMode ? togglePhotoSelection(photo.photoId) : null}
                        className={`aspect-square rounded-xl overflow-hidden bg-white/5 relative group cursor-pointer border transition-all ${selectionMode && selectedPhotos.includes(photo.photoId)
                          ? 'border-primary-500 ring-2 ring-primary-500/50'
                          : 'border-white/5 hover:border-white/20'
                          }`}
                      >
                        <img
                          src={photo.thumbnailUrl || photo.s3Url}
                          alt="Event photo"
                          loading="lazy"
                          className={`w-full h-full object-cover transition-transform duration-500 ${!selectionMode && 'group-hover:scale-110'}`}
                        />

                        {/* Selection Overlay */}
                        {selectionMode && (
                          <div className={`absolute inset-0 flex items-start justify-end p-2 transition-colors ${selectedPhotos.includes(photo.photoId) ? 'bg-primary-500/20' : 'bg-black/20 hover:bg-black/10'}`}>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedPhotos.includes(photo.photoId) ? 'bg-primary-500 border-primary-500' : 'border-white bg-black/40'}`}>
                              {selectedPhotos.includes(photo.photoId) && (
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              )}
                            </div>
                          </div>
                        )}

                        {!selectionMode && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                            <span className="text-xs text-white/80">
                              {new Date(photo.uploadedAt).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-fade-in space-y-6">
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                  <div>
                    <h2 className="font-bold text-white">Detected People</h2>
                    <p className="text-sm text-gray-400">{faces.length} unique faces found</p>
                  </div>
                  {faces.length > 0 && (
                    <button
                      onClick={handleGenerateQRCodes}
                      disabled={generatingQR}
                      className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {generatingQR ? 'Generating...' : 'Regenerate QR'}
                    </button>
                  )}
                </div>

                {faces.length === 0 ? (
                  <div className="glass-panel p-12 text-center text-gray-400">
                    Upload photos to let AI detect faces automatically.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {faces.map((face) => (
                      <div key={face.faceId} className="glass-panel p-3 hover:bg-white/10 transition-colors group">
                        <div className="aspect-square rounded-lg overflow-hidden mb-3 relative">
                          <img
                            src={face.samplePhotoUrl}
                            alt="Face"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white font-bold text-lg">{face.associatedPhotos.length}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400">ID: {face.faceId.substring(0, 6)}</span>
                          {face.qrCodeUrl && (
                            <button onClick={() => window.open(face.qrCodeUrl, '_blank')} className="text-primary-400 hover:text-white text-xs font-semibold">
                              QR
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Persistent Bottom Bar for Mobile Guest Link */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-dark-950/80 backdrop-blur-xl border-t border-white/10 z-40 lg:hidden">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1">Guest Sharing Link</p>
            <div className="bg-white/10 px-3 py-2 rounded-lg text-sm text-white truncate font-mono">
              {window.location.origin}/guest/{eventId}
            </div>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/guest/${eventId}`)}
            className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          </button>
        </div>
      </div>

    </div >
  )
}
