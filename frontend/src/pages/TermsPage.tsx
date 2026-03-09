import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const TermsPage: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
            <Navbar />
            <div className="flex-grow pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
                <div className="glass-panel p-8 md:p-12 animate-fade-in border border-white/10 shadow-2xl">
                    <div className="mb-10">
                        <h1 className="text-4xl font-black mb-4 text-white uppercase tracking-tight">Terms of Service</h1>
                        <div className="flex items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                            <span>Version 1.0</span>
                            <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                            <span>Last Updated: 4 March 2026</span>
                        </div>
                    </div>

                    <div className="space-y-10 text-gray-300">
                        <section>
                            <h2 className="text-xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
                            <p>
                                By accessing or using PicSonar, you agree to be bound by these Terms of Service. If you are using the service on behalf of an organization, you agree to these terms for that organization.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-white mb-4">2. Description of Service</h2>
                            <p>
                                PicSonar provides an AI-powered facial recognition platform for event photo management. The service includes photo storage, face indexing, and matching tools.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-white mb-4">3. User Obligations</h2>
                            <ul className="list-disc pl-5 mt-2 space-y-2">
                                <li>Contains malicious code or viruses.</li>
                            </ul>
                            <p className="mt-2">
                                You are solely responsible for the content you upload and share through the Service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-3">4. Intellectual Property</h2>
                            <p>
                                You retain all rights to the photos you upload. By uploading content, you grant PicSonar a limited license to process and display the content for the purpose of providing the Service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-3">5. Disclaimer of Warranties</h2>
                            <p>
                                The Service is provided on an "as is" and "as available" basis. PicSonar makes no warranties regarding the accuracy or reliability of the facial recognition results.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-3">6. Termination</h2>
                            <p>
                                We act we reserve the right to terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default TermsPage;
