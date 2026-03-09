import { useRef, useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Webcam from 'react-webcam'
import { eventsApi } from '../api/events'
import { Photo } from '../types'
import Navbar from '../components/Navbar'
import { apiClient } from '../api/client'

export default function GuestScanPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const webcamRef = useRef<Webcam>(null)
  const [hasConsent, setHasConsent] = useState(false)
  const [consentBiometric, setConsentBiometric] = useState(false)
  const [consentAge, setConsentAge] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [matches, setMatches] = useState<Photo[]>([])
  const [noMatch, setNoMatch] = useState(false)
  const [mode, setMode] = useState<'camera' | 'upload'>('camera')
  const [organizerLogo, setOrganizerLogo] = useState<string | undefined>(undefined)

  // Fetch Event Details (for branding)
  useEffect(() => {
    const fetchEvent = async () => {
      if (eventId) {
        try {
          const eventData = await eventsApi.getEvent(eventId)
          if (eventData.organizerLogo) {
            setOrganizerLogo(eventData.organizerLogo)
          }
        } catch (err) {
          console.error('Failed to load event details', err)
        }
      }
    }
    fetchEvent()
  }, [eventId])

  const handleConsentSubmit = async () => {
    if (consentBiometric && consentAge) {
      setHasConsent(true)
      try {
        await apiClient.post('/consent', {
          eventId,
          consentType: 'BIOMETRIC_PHOTO_MATCHING',
          accepted: true
        })
      } catch (err) {
        console.error('Failed to log consent', err)
      }
    }
  }

  const withdrawConsent = () => {
    setHasConsent(false)
    setConsentBiometric(false)
    setConsentAge(false)
    reset()
  }

  const videoConstraints = {
    width: 720,
    height: 1280,
    facingMode: "user"
  };

  const capture = () => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      setPhoto(imageSrc)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhoto(event.target.result as string)
        }
      }
      reader.readAsDataURL(e.target.files[0])
    }
  }

  const findMatches = async () => {
    if (!eventId || !photo) return
    setLoading(true)
    setNoMatch(false)
    try {
      // Convert base64 to File object
      const res = await fetch(photo)
      const blob = await res.blob()
      const file = new File([blob], 'face.jpg', { type: 'image/jpeg' })

      const result = await eventsApi.matchFace(eventId, file)

      // Flatten all matched photos
      const allPhotos = result.matches.flatMap(m => m.photos)
      setMatches(allPhotos)

      if (allPhotos.length === 0) {
        setNoMatch(true)
      }
    } catch (error) {
      console.error('Failed to match face:', error)
      alert('Failed to process photo')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setPhoto(null)
    setMatches([])
    setNoMatch(false)
  }

  return (
    <div className="min-h-screen pb-20">
      <Navbar customLogo={organizerLogo} />

      <div className="pt-24 px-4 max-w-lg mx-auto">
        {!hasConsent ? (
          <div className="animate-fade-in glass-panel p-8 md:p-10 shadow-3xl border border-white/5">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Privacy Check</h1>
              <p className="text-gray-400 font-light">We need your consent to find your photos.</p>
            </div>

            <div className="space-y-6 text-sm text-gray-400 leading-relaxed mb-10 bg-white/5 p-6 rounded-2xl border border-white/5">
              <p>
                PicSonar uses AI face search to find you in event photos.
                To do this, we need to take a selfie and generate a <strong>facial feature vector</strong> (biometric data).
              </p>
              <ul className="space-y-2 list-disc pl-4 italic opacity-70">
                <li>Your selfie is deleted immediately.</li>
                <li>Your face vector is encrypted & event-only.</li>
                <li>Data is deleted automatically after the event.</li>
              </ul>
            </div>

            <div className="space-y-4 mb-10">
              <label className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                <input
                  type="checkbox"
                  checked={consentBiometric}
                  onChange={(e) => setConsentBiometric(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 text-primary-600 focus:ring-primary-500 focus:ring-offset-slate-950"
                />
                <span className="text-gray-300 group-hover:text-white transition-colors">
                  I consent to special category biometric processing for photo matching.
                </span>
              </label>

              <label className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                <input
                  type="checkbox"
                  checked={consentAge}
                  onChange={(e) => setConsentAge(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 text-primary-600 focus:ring-primary-500 focus:ring-offset-slate-950"
                />
                <span className="text-gray-300 group-hover:text-white transition-colors">
                  I confirm I am 16+ (or have parental/guardian consent).
                </span>
              </label>
            </div>

            <button
              onClick={handleConsentSubmit}
              disabled={!consentBiometric || !consentAge}
              className="btn-primary w-full py-5 text-xl font-black shadow-2xl shadow-primary-500/20 disabled:grayscale disabled:opacity-20 transition-all uppercase tracking-widest"
            >
              Continue to Search →
            </button>

            <p className="mt-8 text-center text-[10px] text-gray-500 uppercase tracking-widest font-black antialiased">
              Read our full <a href="/privacy" target="_blank" className="underline hover:text-white transition-colors">Privacy Notice</a>
            </p>
          </div>
        ) : !photo ? (
          <div className="animate-fade-in flex flex-col h-[calc(100vh-140px)]">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Find Your Photos</h1>
              <p className="text-gray-400 font-light tracking-wide">Take a selfie to let AI find you.</p>
            </div>

            <div className="flex-1 relative bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 mb-8">
              {mode === 'camera' ? (
                <>
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={videoConstraints}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex justify-center items-center gap-8">
                    {/* Upload Button */}
                    <button onClick={() => setMode('upload')} className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    </button>

                    {/* Shutter Button */}
                    <button
                      onClick={capture}
                      className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center relative touch-manipulation active:scale-95 transition-transform"
                    >
                      <div className="w-16 h-16 bg-white rounded-full"></div>
                    </button>

                    {/* Toggle Camera (Placeholder for future) */}
                    <button className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white opacity-0 pointer-events-none">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-dark-900">
                  <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <p className="text-gray-300 mb-6">Select a photo from your gallery</p>
                  <label className="btn-primary cursor-pointer px-8 py-3">
                    Choose Photo
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <button onClick={() => setMode('camera')} className="mt-4 text-gray-400 hover:text-white underline">Back to Camera</button>
                </div>
              )}
            </div>
          </div>
        ) : matches.length === 0 && !noMatch ? (
          // Review and Confirm Screen
          <div className="animate-slide-up bg-dark-900 rounded-3xl p-8 text-center shadow-2xl border border-white/10 mt-10">
            <div className="w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-primary-500 shadow-xl mb-6 relative">
              <img src={photo} alt="Preview" className="w-full h-full object-cover" />
              {loading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary-500"></div>
                </div>
              )}
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Is this you?</h2>
            <p className="text-gray-400 mb-8">We'll search for this face in the gallery.</p>

            {!loading && (
              <div className="flex flex-col gap-3">
                <button onClick={findMatches} className="btn-primary w-full py-4 text-lg shadow-xl shadow-primary-500/20">
                  Scan & Find Photos
                </button>
                <button onClick={reset} className="btn-ghost w-full py-3 text-gray-400">
                  Retake Selfie
                </button>
              </div>
            )}
          </div>
        ) : (
          // Results or No Match
          <div className="animate-fade-in">
            {noMatch ? (
              <div className="glass-panel p-8 text-center">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">😔</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">No photos found</h2>
                <p className="text-gray-400 mb-8">It seems you're not in any of the uploaded photos yet.</p>
                <button onClick={reset} className="btn-primary w-full">Try Again</button>
              </div>
            ) : (
              <div>
                <div className="flex flex-col gap-4 mb-8">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white tracking-tight">Found {matches.length} Photos</h2>
                    <button onClick={reset} className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest border border-white/5 px-4 py-2 rounded-full transition-all">
                      New Scan
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        matches.forEach((p, i) => {
                          const link = document.createElement('a');
                          link.href = p.s3Url;
                          link.download = `photo-${i + 1}.jpg`;
                          link.click();
                        });
                      }}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-2xl text-xs font-bold border border-white/10 transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Download All
                    </button>
                    <button
                      onClick={() => {
                        const text = `Check out my photos from the event! Found using AI Face Search: ${window.location.href}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                      }}
                      className="bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] px-6 py-3 rounded-2xl border border-[#25D366]/20 transition-all flex items-center justify-center"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.63 1.438h.046c6.551 0 11.884-5.338 11.888-11.896.002-3.18-1.234-6.17-3.475-8.412Z" /></svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {matches.map((photo) => (
                    <div key={photo.photoId} className="relative group rounded-3xl overflow-hidden bg-white/5 border border-white/5">
                      <img src={photo.thumbnailUrl || photo.s3Url} alt="Match" className="w-full h-auto object-cover aspect-[3/4]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4 gap-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const text = `Hey! Look at this photo of me from the event! ${photo.s3Url}`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                            }}
                            className="flex-1 bg-[#25D366] text-white p-2 rounded-xl flex items-center justify-center"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.63 1.438h.046c6.551 0 11.884-5.338 11.888-11.896.002-3.18-1.234-6.17-3.475-8.412Z" /></svg>
                          </button>
                          <button
                            onClick={() => {
                              // Instagram doesn't have a direct URL share like WA, so we copy link to clipboard
                              navigator.clipboard.writeText(photo.s3Url);
                              alert('Photo link copied! Share it on your Instagram Story.');
                            }}
                            className="flex-1 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white p-2 rounded-xl flex items-center justify-center font-bold text-[10px]"
                          >
                            IG
                          </button>
                        </div>
                        <a
                          href={photo.s3Url}
                          download={`event-photo-${photo.photoId}.jpg`}
                          className="btn-primary text-[10px] py-2 w-full text-center font-black uppercase tracking-widest"
                          target="_blank" rel="noopener noreferrer"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-12 text-center pb-8 border-t border-white/5 pt-8">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-4">Privacy Controls</p>
                  <button
                    onClick={withdrawConsent}
                    className="text-xs text-red-500/50 hover:text-red-500 underline transition-colors"
                  >
                    Withdraw consent & delete my biometric data
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
