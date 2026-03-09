import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { apiClient } from '../api/client';

const ContactPage: React.FC = () => {
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [status, setStatus] = React.useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            await apiClient.post('/contact', { name, email, message });
            setStatus({ type: 'success', text: "Thanks for contacting us! We'll get back to you shortly." });
            setName('');
            setEmail('');
            setMessage('');
        } catch (err) {
            setStatus({ type: 'error', text: "Failed to send message. Please try again later." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
            <Navbar />
            <div className="flex-grow pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto w-full">
                <div className="glass-panel p-8 md:p-12 animate-fade-in border border-white/10 shadow-2xl">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white text-center">Contact Us</h1>
                    <p className="text-gray-400 text-center mb-10 font-light">
                        Have a question about PicSonar? We're here to help.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-widest">Name</label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                                placeholder="Your Name"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-widest">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                                placeholder="name@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="message" className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-widest">Message</label>
                            <textarea
                                id="message"
                                rows={4}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors resize-none"
                                placeholder="How can we help you?"
                                required
                            ></textarea>
                        </div>

                        {status && (
                            <div className={`p-4 rounded-xl text-sm font-bold ${status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                {status.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-4 text-lg font-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : 'Send Message'}
                        </button>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default ContactPage;
