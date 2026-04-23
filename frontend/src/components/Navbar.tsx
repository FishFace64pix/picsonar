import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.png';

interface NavbarProps {
    customLogo?: string;
}

const Navbar: React.FC<NavbarProps> = ({ customLogo }) => {
    const { t, i18n } = useTranslation();
    const { user, logout, loading } = useAuth();
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const toggleLanguage = () => {
        const newLang = i18n.language.startsWith('en') ? 'ro' : 'en';
        i18n.changeLanguage(newLang);
    };

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-dark-950/80 backdrop-blur-lg border-b border-white/10 shadow-lg' : 'bg-transparent'
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <img src={customLogo || logo} alt="Logo" className="h-10 w-auto object-contain transition-transform group-hover:scale-110" />
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center space-x-8">
                        {loading ? (
                            <div className="flex items-center space-x-8 animate-pulse">
                                <div className="w-20 h-4 bg-white/10 rounded-full"></div>
                                <div className="w-20 h-4 bg-white/10 rounded-full"></div>
                                <div className="w-24 h-9 bg-white/5 rounded-xl"></div>
                            </div>
                        ) : user ? (
                            <>
                                <Link to="/dashboard" className="text-gray-300 hover:text-white transition-colors font-medium">
                                    {t('navbar.dashboard')}
                                </Link>
                                <Link to="/pricing" className="text-gray-300 hover:text-white transition-colors font-medium">
                                    {t('navbar.pricing')}
                                </Link>
                                <Link to="/profile" className="text-gray-300 hover:text-white transition-colors font-medium">
                                    {t('navbar.profile')}
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-sm font-semibold"
                                >
                                    {t('navbar.signOut')}
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/" className="text-gray-300 hover:text-white transition-colors font-medium">
                                    {t('navbar.howItWorks')}
                                </Link>
                                <Link to="/pricing" className="text-gray-300 hover:text-white transition-colors font-medium">
                                    {t('navbar.pricing')}
                                </Link>
                                <Link to="/login" className="text-gray-300 hover:text-white transition-colors font-medium">
                                    {t('navbar.login')}
                                </Link>
                                <Link
                                    to="/register"
                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 text-white font-bold shadow-lg shadow-primary-500/25 transition-all hover:scale-105"
                                >
                                    {t('navbar.getStarted')}
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Desktop Right items (Lang Switcher & Mobile Menu Button) */}
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={toggleLanguage}
                            className="hidden md:flex items-center justify-center p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all font-semibold uppercase text-xs"
                        >
                            {i18n.language.startsWith('en') ? 'EN' : 'RO'}
                        </button>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden flex items-center space-x-2">
                            <button
                                onClick={toggleLanguage}
                                className="flex items-center justify-center p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all font-semibold uppercase text-xs"
                            >
                                {i18n.language.startsWith('en') ? 'EN' : 'RO'}
                            </button>
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="text-gray-300 hover:text-white p-2"
                            >
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {mobileMenuOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="md:hidden absolute top-20 left-0 right-0 bg-dark-950/95 backdrop-blur-xl border-b border-white/10 p-4 shadow-2xl animate-fade-in">
                    <div className="flex flex-col space-y-4">
                        {loading ? (
                            <div className="flex flex-col space-y-4 animate-pulse">
                                <div className="w-full h-12 bg-white/5 rounded-xl"></div>
                                <div className="w-full h-12 bg-white/5 rounded-xl"></div>
                                <div className="w-full h-12 bg-white/5 rounded-xl"></div>
                            </div>
                        ) : user ? (
                            <>
                                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 rounded-xl bg-white/5 text-center font-medium">{t('navbar.dashboard')}</Link>
                                <Link to="/pricing" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 rounded-xl bg-white/5 text-center font-medium">{t('navbar.pricing')}</Link>
                                <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 rounded-xl bg-white/5 text-center font-medium">{t('navbar.profile')}</Link>
                                <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="block w-full px-4 py-3 rounded-xl border border-white/10 text-center font-medium">{t('navbar.signOut')}</button>
                            </>
                        ) : (
                            <>
                                <Link to="/" onClick={() => setMobileMenuOpen(false)} className="text-gray-300 hover:text-white py-2">{t('navbar.howItWorks')}</Link>
                                <Link to="/pricing" onClick={() => setMobileMenuOpen(false)} className="text-gray-300 hover:text-white py-2">{t('navbar.pricing')}</Link>
                                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-gray-300 hover:text-white py-2">{t('navbar.login')}</Link>
                                <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="btn-primary text-center">{t('navbar.getStarted')}</Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
