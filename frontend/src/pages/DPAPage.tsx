import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const DPAPage: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
            <Navbar />
            <div className="flex-grow pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
                <div className="glass-panel p-8 md:p-12 animate-fade-in border border-white/10 shadow-2xl">
                    <div className="mb-10">
                        <div className="text-primary-500 font-black text-xs uppercase tracking-widest mb-2">B2B Compliance</div>
                        <h1 className="text-4xl font-black mb-4 text-white uppercase tracking-tight">Data Processing Addendum (DPA)</h1>
                        <p className="text-gray-400 max-w-2xl">
                            This agreement governs the relationship between Photographers/Organizers (Data Controllers) and PicSonar (Data Processor).
                        </p>
                    </div>

                    <div className="space-y-12 text-gray-300 leading-relaxed">
                        <section className="bg-white/5 p-6 rounded-2xl border border-white/5">
                            <p className="italic">
                                This DPA forms part of the agreement between the Controller and Processor and governs the processing of personal data by PicSonar on behalf of the Controller in connection with the PicSonar platform.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-widest text-sm">1. Subject Matter and Scope</h2>
                            <p>
                                PicSonar processes personal data for the purpose of photo matching, including biometric extraction from selfies and uploaded photos, comparison of feature vectors, and delivery of matched photos to guests.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-widest text-sm">2. Processor Obligations</h2>
                            <ul className="space-y-4 list-disc pl-5">
                                <li><strong>Documented Instructions:</strong> Processor shall process data only on instructions from the Controller.</li>
                                <li><strong>Confidentiality:</strong> Staff authorized to process data are bound by confidentiality obligations.</li>
                                <li><strong>Security:</strong> Implementation of appropriate technical measures (AES-256 encryption, TLS 1.2+).</li>
                                <li><strong>Assistance:</strong> Processor will assist Controller in meeting GDPR obligations (DPIA, breach notification).</li>
                                <li><strong>Deletion:</strong> Irreversible deletion of biometric data upon event expiry.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-widest text-sm">3. Subprocessors</h2>
                            <p className="mb-4">
                                Controller provides general authorization for PicSonar to engage Subprocessors. PicSonar maintains an up-to-date list and ensures all subprocessors provide sufficient GDPR guarantees.
                            </p>
                            <a href="/subprocessors" className="text-primary-400 underline font-bold hover:text-white transition-colors">View Subprocessor List →</a>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-widest text-sm">4. Controller Responsibilities</h2>
                            <p className="mb-4">
                                The Controller (Photographer/Organizer) is responsible for Establishing and maintaining an appropriate legal basis (Consent) for biometric processing.
                            </p>
                            <div className="p-4 bg-primary-500/10 rounded-xl border border-primary-500/20 text-sm">
                                <strong>Note:</strong> Photographers must ensure guests are informed and consent is obtained via the PicSonar Guest Consent hurdle.
                            </div>
                        </section>

                        <footer className="pt-10 border-t border-white/10">
                            <p className="text-xs text-gray-500 italic">
                                By using PicSonar services as a Photographer/Organizer, you confirm that you have read, understood, and agree to the terms of this Data Processing Addendum.
                            </p>
                        </footer>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default DPAPage;
