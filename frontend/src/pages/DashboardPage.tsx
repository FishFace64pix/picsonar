import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { eventsApi } from '../api/events'
import { apiClient } from '../api/client'
import { Event } from '../types'
import Navbar from '../components/Navbar'
import OrderHistoryModal from '../components/OrderHistoryModal'
import BuyExtraEventModal from '../components/BuyExtraEventModal'


import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

export default function DashboardPage() {
  const { t } = useTranslation()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showBuyModal, setShowBuyModal] = useState(false)

  const [eventName, setEventName] = useState('')
  const [creating, setCreating] = useState(false)

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
    }
  }, [user, authLoading, navigate])

  // Payment Verification Logic
  useEffect(() => {
    const checkPayment = async () => {
      const searchParams = new URLSearchParams(window.location.search)
      const paymentIntentId = searchParams.get('payment_intent')
      const clientSecret = searchParams.get('payment_intent_client_secret')

      if (paymentIntentId && clientSecret) {
        try {
          window.history.replaceState({}, '', window.location.pathname)
          const response = await apiClient.post('/payment/verify', { paymentIntentId })
          if (response.status === 200 || response.status === 201) {
            alert(t('dashboard.messages.paymentSuccess'))
            window.location.reload()
          }
        } catch (err) {
          console.error('Error verifying payment', err)
        }
      }
    }
    if (user) checkPayment()
  }, [user])

  // React Query for Events
  const { data: events = [], isLoading: loading } = useQuery<Event[]>({
    queryKey: ['events', user?.userId],
    queryFn: () => eventsApi.getEvents(),
    enabled: !!user, // Only run if user exists
  })

  // Create Event Handler
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setCreating(true)
    try {
      const newEvent = await eventsApi.createEvent(eventName, user.userId)
      // Invalidate query to refresh list on back navigation
      queryClient.invalidateQueries({ queryKey: ['events'] })

      setShowCreateModal(false)
      setEventName('')
      navigate(`/event/${newEvent.eventId}`)
    } catch (error: any) {
      const message = error.response?.data?.error || t('dashboard.messages.createFailed')
      console.error('Failed to create event:', error)
      alert(message)
    } finally {
      setCreating(false)
    }
  }

  const handleMockAddCredits = () => {
    if (user) {
      const updatedUser = { ...user, eventCredits: (user.eventCredits || 0) + 5 }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      // Force reload or update auth context?
      // Since context reads from state, we might need a context helper.
      // For now, reload is easiest for mock.
      window.location.reload()
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-28">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('dashboard.title')}</h1>
            <p className="text-gray-400">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex gap-4 items-center">
            {user && (
              <div className="text-right hidden md:block">
                <div className="text-sm text-gray-400">{t('dashboard.availableCredits')}</div>
                <div className={`font-bold text-xl ${(user.eventCredits || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {user.eventCredits || 0} {t('dashboard.eventsLeft')}
                </div>
              </div>
            )}
            <div className="relative group flex gap-3">
              {/* Choose Plan - Only for non-subscribers */}
              {user?.subscriptionStatus === 'inactive' && (
                <Link
                  to="/pricing"
                  className="btn-primary flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {t('dashboard.choosePlan')}
                </Link>
              )}

              {/* Add Credits Button - Only show for active subscribers */}
              {user?.subscriptionStatus === 'active' && (
                <button
                  onClick={() => {
                    setShowBuyModal(true)
                  }}
                  className="btn-ghost flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {t('dashboard.addCredits')}
                </button>
              )}

              {/* Dev Only: Instant Mock Credits */}
              {import.meta.env.VITE_USE_MOCK === 'true' && (
                <button
                  onClick={handleMockAddCredits}
                  className="px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-lg text-xs hover:bg-yellow-500/20"
                >
                  +5 Mock Credits
                </button>
              )}

              <button
                onClick={() => {
                  if (user && (user.eventCredits || 0) > 0) {
                    setShowCreateModal(true)
                  } else {
                    alert(t('dashboard.noCreditsAlert'))
                    navigate('/pricing')
                  }
                }}
                className={`btn-primary flex items-center gap-2 ${(user?.eventCredits || 0) <= 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('dashboard.createNewEvent')}
              </button>
            </div>
          </div>
        </div>

        {/* 📑 Photographer Success Checklist */}
        {!loading && events.length < 3 && (
          <div className="grid lg:grid-cols-3 gap-8 mb-10 animate-slide-up">
            <div className="lg:col-span-2">
              {/* 📊 Mini Stats Box */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-panel p-6 border border-white/5">
                  <div className="text-gray-500 text-xs font-black uppercase mb-1 tracking-widest">{t('dashboard.stats.totalPhotos')}</div>
                  <div className="text-2xl font-bold text-white">{events.reduce((acc, curr) => acc + (curr.totalPhotos || 0), 0).toLocaleString()}</div>
                </div>
                <div className="glass-panel p-6 border border-white/5">
                  <div className="text-gray-500 text-xs font-black uppercase mb-1 tracking-widest">{t('dashboard.stats.facesIndexed')}</div>
                  <div className="text-2xl font-bold text-white">{events.reduce((acc, curr) => acc + (curr.totalFaces || 0), 0).toLocaleString()}</div>
                </div>
                <div className="glass-panel p-6 border border-white/5">
                  <div className="text-gray-500 text-xs font-black uppercase mb-1 tracking-widest">{t('dashboard.stats.guestSearches')}</div>
                  <div className="text-2xl font-bold text-white">{(events.reduce((acc, curr) => acc + (curr.totalPhotos || 0), 0) * 0.8).toFixed(0).toLocaleString()}</div>
                </div>
                <div className="glass-panel p-6 border border-primary-500/20 bg-primary-500/5">
                  <div className="text-primary-400 text-xs font-black uppercase mb-1 tracking-widest">{t('dashboard.stats.potentialRevenue')}</div>
                  <div className="text-2xl font-black text-white">{(events.length * 800).toLocaleString()} RON</div>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 border border-white/10 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-white uppercase tracking-widest">{t('dashboard.checklist.title')}</h3>
                <span className="text-[10px] bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full font-bold">
                  {Math.round([
                    events.length > 0,
                    events.some(e => e.totalPhotos > 0),
                    events.some(e => e.totalFaces > 0)
                  ].filter(Boolean).length / 3 * 100)}%
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${events.length > 0 ? 'bg-green-500 text-white' : 'border border-white/20 text-gray-500'}`}>
                    {events.length > 0 ? '✓' : '1'}
                  </div>
                  <span className={`text-xs font-bold ${events.length > 0 ? 'text-gray-400 line-through' : 'text-white'}`}>{t('dashboard.checklist.createEvent')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${events.some(e => e.totalPhotos > 0) ? 'bg-green-500 text-white' : 'border border-white/20 text-gray-500'}`}>
                    {events.some(e => e.totalPhotos > 0) ? '✓' : '2'}
                  </div>
                  <span className={`text-xs font-bold ${events.some(e => e.totalPhotos > 0) ? 'text-gray-400 line-through' : 'text-white'}`}>{t('dashboard.checklist.uploadPhotos')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${events.some(e => e.totalFaces > 0) ? 'bg-green-500 text-white' : 'border border-white/20 text-gray-500'}`}>
                    {events.some(e => e.totalFaces > 0) ? '✓' : '3'}
                  </div>
                  <span className={`text-xs font-bold ${events.some(e => e.totalFaces > 0) ? 'text-gray-400 line-through' : 'text-white'}`}>{t('dashboard.checklist.indexingComplete')}</span>
                </div>
              </div>

              {!events.some(e => e.totalPhotos > 0) && (
                <button
                  onClick={() => events.length > 0 ? navigate(`/event/${events[0].eventId}`) : setShowCreateModal(true)}
                  className="w-full mt-6 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {events.length > 0 ? t('dashboard.checklist.uploadNow') : t('dashboard.checklist.startFirstEvent')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 📊 Full Stats Box (Only when onboarding is hidden) */}
        {!loading && events.length >= 3 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10 animate-fade-in">
            <div className="glass-panel p-6 border border-white/5">
              <div className="text-gray-500 text-xs font-black uppercase mb-1 tracking-widest">{t('dashboard.stats.totalPhotos')}</div>
              <div className="text-2xl font-bold text-white">{events.reduce((acc, curr) => acc + (curr.totalPhotos || 0), 0).toLocaleString()}</div>
            </div>
            <div className="glass-panel p-6 border border-white/5">
              <div className="text-gray-500 text-xs font-black uppercase mb-1 tracking-widest">{t('dashboard.stats.facesIndexed')}</div>
              <div className="text-2xl font-bold text-white">{events.reduce((acc, curr) => acc + (curr.totalFaces || 0), 0).toLocaleString()}</div>
            </div>
            <div className="glass-panel p-6 border border-white/5">
              <div className="text-gray-500 text-xs font-black uppercase mb-1 tracking-widest">{t('dashboard.stats.guestSearches')}</div>
              <div className="text-2xl font-bold text-white">{(events.reduce((acc, curr) => acc + (curr.totalPhotos || 0), 0) * 0.8).toFixed(0).toLocaleString()}</div>
            </div>
            <div className="glass-panel p-6 border border-primary-500/20 bg-primary-500/5">
              <div className="text-primary-400 text-xs font-black uppercase mb-1 tracking-widest">{t('dashboard.stats.potentialRevenue')}</div>
              <div className="text-2xl font-black text-white">{(events.length * 800).toLocaleString()} RON</div>
              <div className="text-[10px] text-primary-500 font-bold mt-1">{t('dashboard.stats.estUpsell')}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-white/5 rounded-2xl border border-white/10"></div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="glass-panel p-12 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{t('dashboard.noEvents.title')}</h3>
            <p className="text-gray-400 mb-8 max-w-sm">{t('dashboard.noEvents.subtitle')}</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-ghost"
            >
              {t('dashboard.createNewEvent')}
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Create Card (First Item) */}
            <div
              onClick={() => {
                if (user && (user.eventCredits || 0) > 0) {
                  setShowCreateModal(true)
                } else {
                  alert(t('dashboard.noCreditsAlert'))
                  setShowBuyModal(true)
                }
              }}
              className={`glass-panel p-6 flex flex-col items-center justify-center min-h-[200px] cursor-pointer transition-colors group border-dashed border-2 border-white/20 ${(user?.eventCredits || 0) > 0 ? 'hover:bg-white/10 hover:border-primary-400' : 'opacity-50 grayscale hover:bg-white/5'
                }`}
            >
              <div className={`w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-4 transition-colors ${(user?.eventCredits || 0) > 0 ? 'group-hover:bg-primary-500' : ''
                }`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className={`font-semibold text-gray-300 transition-colors ${(user?.eventCredits || 0) > 0 ? 'group-hover:text-white' : ''
                }`}>{t('dashboard.createNewEvent')}</span>
            </div>

            {events.map((event) => (
              <Link
                key={event.eventId}
                to={`/event/${event.eventId}`}
                className="glass-panel p-6 hover:translate-y-[-4px] hover:shadow-2xl hover:border-primary-500/30 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-gradient-to-br from-primary-500/20 to-secondary-500/20 rounded-xl">
                      <svg className="w-6 h-6 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${event.status === 'active'
                      ? 'bg-green-500/10 text-green-400 border-green-500/20'
                      : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                      }`}>
                      {event.status}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary-300 transition-colors">{event.eventName}</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {t('dashboard.eventCard.created')} {new Date(event.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-300 border-t border-white/5 pt-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {event.totalPhotos} {t('dashboard.eventCard.photos')}
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {event.totalFaces} {t('dashboard.eventCard.faces')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* History Modal */}
      {showHistoryModal && (
        <OrderHistoryModal onClose={() => setShowHistoryModal(false)} />
      )}

      {/* Buy Extra Credits Modal */}
      {showBuyModal && (
        <BuyExtraEventModal onClose={() => setShowBuyModal(false)} />
      )}



      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="glass-panel p-8 w-full max-w-md animate-slide-up border border-white/20 shadow-2xl shadow-primary-500/20">
            <h2 className="text-2xl font-bold mb-1 text-white">{t('dashboard.createModal.title')}</h2>
            <p className="text-gray-400 mb-6 text-sm">{t('dashboard.createModal.subtitle')}</p>

            <form onSubmit={handleCreateEvent}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('dashboard.createModal.eventName')}
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  required
                  className="input-field"
                  placeholder={t('dashboard.createModal.placeholder')}
                  autoFocus
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setEventName('')
                  }}
                  className="flex-1 px-4 py-3 border border-white/10 rounded-xl hover:bg-white/5 text-gray-300 font-medium transition-colors"
                >
                  {t('dashboard.createModal.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 btn-primary"
                >
                  {creating ? t('dashboard.createModal.creating') : t('dashboard.createModal.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
