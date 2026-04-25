import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
    return (
        <footer className="py-12 border-t border-white/10 bg-dark-900/50 backdrop-blur-lg mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div className="col-span-1 md:col-span-1">
                        <Link to="/" className="flex items-center gap-2 mb-4 group">
                            <img src="/src/assets/logo.png" alt="PicSonar Logo" className="h-8 w-auto object-contain transition-transform group-hover:scale-110" />
                            <span className="font-bold text-xl text-white">PicSonar</span>
                        </Link>
                        <p className="text-gray-500 text-sm">
                            The smartest way to share event photos. Powered by AI.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Product</h4>
                        <ul className="space-y-2 text-sm text-gray-500">
                            <li><Link to="/" className="hover:text-primary-400 transition-colors">How it Works</Link></li>
                            <li><Link to="/register" className="hover:text-primary-400 transition-colors">For Organizers</Link></li>
                            <li><Link to="/login" className="hover:text-primary-400 transition-colors">Sign In</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Support</h4>
                        <ul className="space-y-2 text-sm text-gray-500">
                            <li><Link to="/contact" className="hover:text-primary-400 transition-colors">Contact Us</Link></li>
                            {/* <li><Link to="/faq" className="hover:text-primary-400 transition-colors">FAQ</Link></li> */}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4 uppercase tracking-widest text-[10px]">Legal</h4>
                        <ul className="space-y-2 text-sm text-gray-500">
                            <li><Link to="/privacy" className="hover:text-primary-400 transition-colors">Privacy Policy</Link></li>
                            <li><Link to="/terms" className="hover:text-primary-400 transition-colors">Terms of Service</Link></li>
                            <li><Link to="/dpa" className="hover:text-primary-400 transition-colors">Data Processing Agreement (DPA)</Link></li>
                            <li><Link to="/subprocessors" className="hover:text-primary-400 transition-colors">Subprocessors</Link></li>
                            <li><Link to="/consumer-rights" className="hover:text-primary-400 transition-colors">Consumer Rights (OUG 34/2014)</Link></li>
                        </ul>
                    </div>
                </div>

                {/*
                  Romanian consumer-protection disclosures.
                  ANPC link + ODR platform link are legally required on the
                  public footer of any B2C e-commerce site operating in RO.
                  Do not remove without legal review.
                */}
                <div className="border-t border-white/5 pt-6 pb-4">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-start md:items-center text-[11px] text-gray-500">
                        <div className="flex items-center gap-2">
                            <span className="uppercase tracking-widest font-bold text-gray-400">Protecția consumatorului:</span>
                            <a
                                href="https://anpc.ro"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-primary-400"
                            >
                                ANPC
                            </a>
                            <span className="text-gray-600">•</span>
                            <a
                                href="https://ec.europa.eu/consumers/odr/main/?event=main.home.show&amp;lng=RO"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-primary-400"
                            >
                                Soluționarea online a litigiilor (SOL/ODR)
                            </a>
                        </div>
                        <div className="text-gray-600">
                            Operator date: KAMBYTE SRL • CUI: RO54035709 • J2026012033003
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col gap-1">
                        <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest antialiased">
                            © {new Date().getFullYear()} PicSonar. All rights reserved.
                        </p>
                        <p className="text-gray-500 text-[10px] flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            EU Hosted • GDPR-aligned processing • Biometric data handled with explicit consent
                        </p>
                    </div>
                    <div className="flex space-x-6">
                        <a href="#" className="text-gray-600 hover:text-white transition-all hover:scale-110"><span className="sr-only">Twitter</span>𝕏</a>
                        <a href="#" className="text-gray-600 hover:text-white transition-all hover:scale-110"><span className="sr-only">Instagram</span>📸</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
