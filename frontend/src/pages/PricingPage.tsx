import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getPackages } from '../constants/packages'
import Navbar from '../components/Navbar'

export default function PricingPage() {
    const { t } = useTranslation()
    return (
        <div className="min-h-screen bg-dark-900 pb-20">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-28">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-4">{t('pricingPage.title')}</h1>
                    <p className="text-xl text-gray-400">{t('pricingPage.subtitle')}</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    {getPackages(t).map((pkg) => (
                        <div
                            key={pkg.id}
                            className={`glass-panel p-8 flex flex-col items-center border hover:border-primary-500/50 transition-colors relative ${pkg.popular
                                ? 'border-primary-500 transform md:-translate-y-4 shadow-xl shadow-primary-500/10'
                                : 'border-white/10'
                                }`}
                        >
                            {pkg.popular && (
                                <div className="absolute top-0 -translate-y-1/2 bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                                    {t('pricingPage.mostPopular')}
                                </div>
                            )}

                            <h2 className="text-2xl font-bold text-white mb-2">{pkg.name}</h2>
                            <div className="text-4xl font-bold text-white mb-6 mt-4">
                                {pkg.price} <span className="text-lg text-gray-400 font-normal">{pkg.currency} / {pkg.billingPeriod}</span>
                            </div>

                            <div className="w-full border-t border-white/10 my-6"></div>

                            <ul className="space-y-4 mb-8 w-full flex-grow">
                                {pkg.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start text-gray-300">
                                        <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-sm">{feature.text}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link
                                to={`/checkout?package=${pkg.id}&type=package`}
                                className={`w-full text-center py-3 rounded-lg font-bold transition-all ${pkg.popular
                                    ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg hover:shadow-primary-500/30'
                                    : 'bg-white/10 hover:bg-white/20 text-white'
                                    }`}
                            >
                                {t('pricingPage.select')} {pkg.name}
                            </Link>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    )
}
