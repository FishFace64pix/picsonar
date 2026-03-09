import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const SubprocessorsPage: React.FC = () => {
    const subprocessors = [
        {
            name: "AWS (Amazon Web Services)",
            purpose: "Cloud hosting, Encrypted Storage, AI Facial Recognition Inference",
            location: "EU (Frankfurt / Ireland)",
            safeguards: "EU/EEA Nodes"
        },
        {
            name: "Stripe",
            purpose: "Subscription Payment Processing",
            location: "USA / EU",
            safeguards: "Standard Contractual Clauses (SCCs)"
        },
        {
            name: "SendGrid / AWS SES",
            purpose: "Transactional Email Delivery",
            location: "USA / EU",
            safeguards: "Standard Contractual Clauses (SCCs)"
        }
    ];

    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
            <Navbar />
            <div className="flex-grow pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
                <div className="glass-panel p-8 md:p-12 animate-fade-in border border-white/10 shadow-2xl">
                    <div className="mb-10">
                        <h1 className="text-4xl font-black mb-4 text-white uppercase tracking-tight">Subprocessors</h1>
                        <p className="text-gray-400">
                            PicSonar engages the following third-party entities to provide infrastructure and specialized services.
                        </p>
                    </div>

                    <div className="space-y-8">
                        {subprocessors.map((sub, i) => (
                            <div key={i} className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-primary-500/30 transition-all">
                                <h3 className="text-xl font-bold text-white mb-2">{sub.name}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
                                    <div>
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Purpose</div>
                                        <div className="text-gray-300">{sub.purpose}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Data Location</div>
                                        <div className="text-gray-300">{sub.location}</div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Safeguards</div>
                                        <div className="text-gray-300">{sub.safeguards}</div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="p-6 bg-primary-500/5 rounded-2xl border border-primary-500/10 mt-10">
                            <p className="text-sm text-gray-400 italic">
                                Note: Biometric facial feature vectors are processed and stored exclusively within EU/EEA infrastructure.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default SubprocessorsPage;
