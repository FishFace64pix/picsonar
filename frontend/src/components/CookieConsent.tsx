/**
 * GDPR / ePrivacy cookie consent banner.
 *
 * Romanian law (Legea 506/2004 on electronic privacy) requires explicit,
 * granular consent before we load any non-essential tracking. Our stack
 * today only uses strictly-necessary cookies (auth session, CSRF, load
 * balancer affinity) so the banner's primary role right now is honesty
 * — we tell visitors what we set, confirm it's all essential, and give
 * them a "learn more" link to the privacy policy.
 *
 * The user's choice is persisted in a first-party cookie (NOT
 * localStorage — consent records need to survive across subdomains) so
 * we don't nag on every page. A fresh cookie is re-requested after 12
 * months per the GDPR refresh guidance.
 *
 * Why a cookie and not localStorage:
 *   - localStorage is per-origin; if we ever move the app to a subdomain
 *     (app.picsonar.ro) we'd re-prompt needlessly.
 *   - Cookies with `Secure; SameSite=Lax` survive OAuth redirects,
 *     future-proofing for identity provider flows.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const CONSENT_COOKIE = 'picsonar_cookie_consent'
const CONSENT_TTL_DAYS = 365

type ConsentState = 'accepted' | 'declined'

function readConsentCookie(): ConsentState | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
  if (!match) return null
  const val = match.split('=')[1]
  return val === 'accepted' || val === 'declined' ? val : null
}

function writeConsentCookie(state: ConsentState): void {
  if (typeof document === 'undefined') return
  const maxAge = CONSENT_TTL_DAYS * 24 * 60 * 60
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? '; Secure'
      : ''
  document.cookie = `${CONSENT_COOKIE}=${state}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`
}

export default function CookieConsent() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(readConsentCookie() === null)
  }, [])

  if (!visible) return null

  const accept = () => {
    writeConsentCookie('accepted')
    setVisible(false)
  }
  const decline = () => {
    writeConsentCookie('declined')
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t('cookies.title', 'Cookie preferences')}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-dark-700 bg-dark-900/95 backdrop-blur px-4 py-4 shadow-2xl"
    >
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center gap-4">
        <div className="text-sm text-gray-200 flex-1">
          <p className="font-medium text-white mb-1">
            {t('cookies.title', 'We use strictly necessary cookies only')}
          </p>
          <p>
            {t(
              'cookies.body',
              'PicSonar uses only cookies required to keep you signed in and our site operating securely. We do not use advertising, cross-site tracking, or analytics cookies without your consent.',
            )}{' '}
            <Link to="/privacy" className="text-primary-400 hover:text-primary-300 underline">
              {t('cookies.learnMore', 'Read our privacy policy')}
            </Link>
            .
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={decline}
            className="px-4 py-2 text-sm rounded-lg border border-dark-600 text-gray-300 hover:bg-dark-800"
          >
            {t('cookies.decline', 'Only essential')}
          </button>
          <button
            type="button"
            onClick={accept}
            className="px-4 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium"
          >
            {t('cookies.accept', 'OK, got it')}
          </button>
        </div>
      </div>
    </div>
  )
}
