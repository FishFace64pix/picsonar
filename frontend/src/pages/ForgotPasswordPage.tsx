import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import Navbar from '../components/Navbar';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const response = await apiClient.post('/auth/forgot-password', { email });
            setMessage({ type: 'success', text: response.data.message });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to process request.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-950">
            <Navbar />
            <div className="pt-32 pb-12 px-4 flex flex-col items-center">
                <div className="w-full max-w-md animate-slide-up">
                    <Link to="/login" className="text-gray-400 hover:text-white mb-8 inline-flex items-center gap-2 group transition-colors">
                        <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to login
                    </Link>

                    <div className="glass-panel p-8 border border-white/10 shadow-2xl">
                        <h1 className="text-3xl font-black text-white mb-2">Reset Password</h1>
                        <p className="text-gray-400 mb-8 font-light">Enter your email and we'll send you a link to reset your password.</p>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-widest">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                                    placeholder="your@email.com"
                                />
                            </div>

                            {message && (
                                <div className={`p-4 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                    {message.text}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary py-4 font-black flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    'Send Reset Link'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
