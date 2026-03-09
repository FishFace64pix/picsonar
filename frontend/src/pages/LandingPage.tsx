import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPackages } from '../constants/packages';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const [audience, setAudience] = React.useState<'photographers' | 'guests'>('photographers');

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <div className="pt-24 flex justify-center sticky top-0 z-30 pointer-events-none">
        <div className="bg-white/5 backdrop-blur-xl p-1 rounded-full border border-white/10 flex pointer-events-auto">
          <button
            onClick={() => setAudience('photographers')}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${audience === 'photographers' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            {t('landing.audience.photographers')}
          </button>
          <button
            onClick={() => setAudience('guests')}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${audience === 'guests' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            {t('landing.audience.guests')}
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl -z-10 pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center transition-all duration-500">
          {audience === 'photographers' ? (
            <>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-semibold mb-6 animate-fade-in">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                </span>
                {t('landing.photographer.badge')}
              </div>

              <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-8 animate-fade-in">
                <span className="block text-white mb-2">{t('landing.photographer.title')}</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 via-white to-secondary-400">
                  {t('landing.photographer.titleHighlight')}
                </span>
              </h1>

              <p className="max-w-2xl mx-auto text-xl md:text-2xl text-gray-300 mb-12 animate-slide-up font-light">
                {t('landing.photographer.description')} <span className="text-white font-bold">{t('landing.photographer.descriptionEarn')}</span> {t('landing.photographer.descriptionSuffix')}
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-500/10 border border-secondary-500/20 text-secondary-400 text-sm font-semibold mb-6 animate-fade-in">
                {t('landing.guest.badge')}
              </div>

              <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-8 animate-fade-in">
                <span className="block text-white mb-2">{t('landing.guest.title')}</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-secondary-400 via-white to-primary-400">
                  {t('landing.guest.titleHighlight')}
                </span>
              </h1>

              <p className="max-w-2xl mx-auto text-xl md:text-2xl text-gray-300 mb-12 animate-slide-up font-light">
                {t('landing.guest.description')} <span className="text-white font-bold">{t('landing.guest.descriptionHighlight')}</span> {t('landing.guest.descriptionSuffix')}
              </p>
            </>
          )}

          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 animate-slide-up">
            <Link to="/register" className="btn-primary w-full sm:w-auto px-12 py-5 text-xl font-bold shadow-2xl shadow-primary-500/30">
              {audience === 'photographers' ? t('landing.photographer.cta') : t('landing.guest.cta')}
            </Link>
            <a href="#how-it-works" className="btn-ghost w-full sm:w-auto px-12 py-5 text-xl hover:bg-white/5 border border-white/10 backdrop-blur-sm">
              {t('landing.photographer.ctaSecondary')}
            </a>
          </div>
        </div>
      </section>

      {/* Features Highlight (Guest Experience) */}
      <section className="py-20 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-12 md:gap-24 opacity-60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">📱</div>
            <span className="text-white font-medium">{t('landing.features.noApp')}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">🔐</div>
            <span className="text-white font-medium">{t('landing.features.noLogin')}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">⚡</div>
            <span className="text-white font-medium">{t('landing.features.instant')}</span>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-6xl font-black mb-6 text-white">{t('landing.howItWorks.title')}</h2>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto">{t('landing.howItWorks.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="glass-panel p-10 relative group overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl group-hover:bg-primary-500/20 transition-all"></div>
              <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mb-8 text-2xl shadow-xl shadow-primary-500/20">
                📸
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">{t('landing.howItWorks.steps.step1.title')}</h3>
              <p className="text-gray-400 leading-relaxed">
                {t('landing.howItWorks.steps.step1.description')}
              </p>
            </div>

            {/* Step 2 */}
            <div className="glass-panel p-10 relative group overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary-500/10 rounded-full blur-2xl group-hover:bg-secondary-500/20 transition-all"></div>
              <div className="w-16 h-16 bg-secondary-600 rounded-2xl flex items-center justify-center mb-8 text-2xl shadow-xl shadow-secondary-500/20">
                🤳
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">{t('landing.howItWorks.steps.step2.title')}</h3>
              <p className="text-gray-400 leading-relaxed">
                {t('landing.howItWorks.steps.step2.description')}
              </p>
            </div>

            {/* Step 3 */}
            <div className="glass-panel p-10 relative group overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition-all"></div>
              <div className="w-16 h-16 bg-pink-600 rounded-2xl flex items-center justify-center mb-8 text-2xl shadow-xl shadow-pink-500/20">
                💰
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">{t('landing.howItWorks.steps.step3.title')}</h3>
              <p className="text-gray-400 leading-relaxed">
                {t('landing.howItWorks.steps.step3.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* White Label Section */}
      <section className="py-32 bg-dark-900/50 border-y border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="animate-fade-in">
              <h2 className="text-4xl md:text-6xl font-black mb-8 text-white leading-tight">{t('landing.whiteLabel.title')}<br />{t('landing.whiteLabel.titleHighlight')}</h2>
              <p className="text-xl text-gray-400 mb-10 leading-relaxed">
                {t('landing.whiteLabel.description')}
              </p>
              <ul className="space-y-6">
                <li className="flex items-center gap-4 text-white">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">✓</div>
                  <span className="font-semibold text-lg">{t('landing.whiteLabel.list1')}</span>
                </li>
                <li className="flex items-center gap-4 text-white">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">✓</div>
                  <span className="font-semibold text-lg">{t('landing.whiteLabel.list2')}</span>
                </li>
                <li className="flex items-center gap-4 text-white">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">✓</div>
                  <span className="font-semibold text-lg">{t('landing.whiteLabel.list3')}</span>
                </li>
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary-500/20 to-secondary-500/20 rounded-[4rem] flex items-center justify-center p-8 border border-white/10 backdrop-blur-3xl animate-float">
                <div className="text-center">
                  <div className="w-32 h-32 bg-white/10 rounded-3xl mx-auto mb-6 flex items-center justify-center border border-white/20">
                    <span className="text-6xl">✨</span>
                  </div>
                  <div className="h-4 w-48 bg-white/20 rounded-full mx-auto mb-4"></div>
                  <div className="h-4 w-32 bg-white/10 rounded-full mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 animate-fade-in">
            <h2 className="text-3xl md:text-6xl font-black mb-6 text-white tracking-tight">{t('landing.pricingSection.title')}</h2>
            <p className="text-gray-400 text-xl">{t('landing.pricingSection.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto lg:px-0">
            {getPackages(t).map((pkg) => (
              <div
                key={pkg.id}
                className={`glass-panel p-10 flex flex-col border hover:border-primary-500/50 transition-all relative group ${pkg.popular
                  ? 'border-primary-500 transform lg:-translate-y-4 shadow-2xl shadow-primary-500/20 z-10'
                  : 'border-white/10 hover:bg-white/[0.03]'
                  }`}
              >
                {pkg.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-primary-600 to-indigo-600 text-white px-6 py-2 rounded-full text-sm font-black shadow-xl uppercase tracking-widest">
                    {t('landing.pricingSection.recommended')}
                  </div>
                )}

                <h2 className="text-2xl font-black text-white mb-2">{pkg.name}</h2>
                <div className="flex items-baseline gap-2 mb-2 mt-4">
                  <span className="text-5xl font-black text-white">{pkg.price}</span>
                  <span className="text-xl text-gray-400 font-medium uppercase tracking-tighter">{pkg.currency}</span>
                </div>
                {pkg.originalPrice && (
                  <div className="text-gray-500 line-through text-lg mb-6">{pkg.originalPrice} RON</div>
                )}

                <div className="mt-4 p-4 rounded-2xl bg-primary-500/10 border border-primary-500/20 mb-8">
                  <div className="text-xs text-primary-400 font-black uppercase mb-1 tracking-widest">{t('landing.pricingSection.revenuePotential')}</div>
                  <div className="text-white font-bold text-lg">{t('landing.pricingSection.recommendedUpsell')} {pkg.recommendedUpsell}</div>
                </div>

                <div className="w-full h-px bg-white/5 mb-8"></div>

                <ul className="space-y-4 mb-10 flex-grow">
                  {pkg.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-gray-300 gap-3 group/item">
                      <div className="w-6 h-6 rounded-full bg-primary-500/10 text-primary-400 flex items-center justify-center flex-shrink-0 group-hover/item:bg-primary-500 group-hover/item:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium">{feature.text}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={`/checkout?package=${pkg.id}`}
                  className={`w-full text-center py-5 rounded-2xl font-black text-lg transition-all active:scale-95 ${pkg.popular
                    ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-xl shadow-primary-500/30'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                    }`}
                >
                  {t('landing.pricingSection.select')} {pkg.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
