import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const PrivacyPage: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
            <Navbar />
            <div className="flex-grow pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
                <div className="glass-panel p-8 md:p-12 animate-fade-in border border-white/10 shadow-2xl">
                    <div className="mb-10">
                        <h1 className="text-4xl font-black mb-4 text-white uppercase tracking-tight">Privacy Policy</h1>
                        <div className="flex items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                            <span>Version 1.0</span>
                            <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                            <span>Last Updated: 4 March 2026</span>
                        </div>
                    </div>

                    <div className="space-y-12 text-gray-300 leading-relaxed">
                        <section className="bg-white/5 p-6 rounded-2xl border border-white/5">
                            <p className="italic text-primary-300">
                                This Privacy Policy describes how PicSonar processes personal data, including biometric data in the form of facial feature vectors, in compliance with the EU General Data Protection Regulation (GDPR) — Regulation (EU) 2016/679.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="text-primary-500">01.</span> Introduction
                            </h2>
                            <p className="mb-4">
                                PicSonar is an AI-powered event photo platform that enables photographers and event organizers to upload event photos and allows guests to locate their personal photos using facial recognition technology.
                            </p>
                            <p>
                                This Privacy Policy explains what personal data we collect, why we collect it, how we use it, and what rights you have as a data subject under the GDPR and applicable Romanian data protection law.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="text-primary-500">02.</span> Identity and Contact Details
                            </h2>
                            <div className="grid md:grid-cols-2 gap-6 mt-6">
                                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                                    <h3 className="text-white font-bold mb-3 uppercase tracking-widest text-xs">Data Processor</h3>
                                    <p className="text-sm"><strong>Company:</strong> PicSonar SRL</p>
                                    <p className="text-sm"><strong>Email:</strong> privacy@picsonar.com</p>
                                    <p className="text-sm"><strong>DPO:</strong> dpo@picsonar.com</p>
                                </div>
                                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                                    <h3 className="text-white font-bold mb-3 uppercase tracking-widest text-xs">Data Controllers</h3>
                                    <p className="text-sm italic">
                                        The Data Controller for personal data processed through each event is the photographer or event organizer. PicSonar processes data exclusively on their instructions.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="text-primary-500">03.</span> Categories of Data We Process
                            </h2>
                            <div className="space-y-4">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="py-3 font-bold text-white uppercase tracking-widest text-xs">Category</th>
                                                <th className="py-3 font-bold text-white uppercase tracking-widest text-xs">Description</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            <tr>
                                                <td className="py-4 font-bold text-primary-400">Selfie Image</td>
                                                <td className="py-4">A photograph taken by the guest to initiate photo search.</td>
                                            </tr>
                                            <tr>
                                                <td className="py-4 font-bold text-primary-400">Biometric Data</td>
                                                <td className="py-4">Facial feature vectors representing unique geometry. (GDPR Art. 9)</td>
                                            </tr>
                                            <tr>
                                                <td className="py-4 font-bold text-primary-400">Uploaded Photos</td>
                                                <td className="py-4">Event photographs uploaded by the Organizer.</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>

                        <section className="bg-primary-500/10 p-8 rounded-3xl border border-primary-500/20">
                            <h2 className="text-2xl font-bold text-white mb-4">Biometric Data & Facial Recognition</h2>
                            <p className="mb-4">
                                <strong>How it works:</strong> When you take a selfie, our system analyzes face geometry (distances between eyes, nose, mouth) and converts them into a string of numbers called a <strong>facial feature vector</strong>.
                            </p>
                            <p className="text-sm text-primary-300 italic">
                                * PicSonar does not sell your biometric data, nor do we create persistent biometric profiles beyond the specific event context.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="text-primary-500">04.</span> Legal Basis (GDPR Art. 6 & 9)
                            </h2>
                            <p className="mb-4">
                                We process biometric data (Special Category Data) exclusively based on <strong>explicit, informed, and freely given consent</strong> (Article 9(2)(a)).
                            </p>
                            <div className="p-6 bg-green-500/5 rounded-2xl border border-green-500/10 border-l-4 border-l-green-500">
                                <p className="text-sm font-bold text-green-400 uppercase tracking-widest mb-2">Consent is Voluntary</p>
                                <p className="text-sm">You may withdraw consent at any time. Withdrawal results in immediate deletion of your biometric data.</p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="text-primary-500">05.</span> Data Retention
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <div className="font-bold text-xs text-gray-500 uppercase tracking-widest mb-1">Selfie Photograph</div>
                                    <div className="text-white font-bold">Deleted Immediately</div>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <div className="font-bold text-xs text-gray-500 uppercase tracking-widest mb-1">Biometric Vectors</div>
                                    <div className="text-white font-bold">Deleted on Event Expiry</div>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="text-primary-500">06.</span> Your Rights
                            </h2>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    'Right to Access (Art. 15)',
                                    'Right to Erasure (Art. 17)',
                                    'Right to Portability (Art. 20)',
                                    'Right to Withdraw Consent (Art. 7)',
                                    'Right to Restriction (Art. 18)',
                                    'Right to Object (Art. 21)'
                                ].map((right, i) => (
                                    <li key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 text-sm font-medium">
                                        <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                                        {right}
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <footer className="pt-10 border-t border-white/10 text-center">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                                For any privacy requests: <a href="mailto:privacy@picsonar.com" className="text-primary-400 hover:text-white underline">privacy@picsonar.com</a>
                            </p>
                        </footer>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default PrivacyPage;
