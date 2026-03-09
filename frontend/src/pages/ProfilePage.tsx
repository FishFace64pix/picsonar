import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';
import { CompanyDetails } from '../types';

const ProfilePage: React.FC = () => {
    const { user, logout } = useAuth();
    const [name, setName] = useState(user?.name || 'User');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Company Details State
    const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({
        companyName: '',
        regCom: '',
        cui: '',
        vatPayer: false,
        country: 'Romania',
        city: '',
        street: '',
        postalCode: '',
        billingEmail: user?.email || '',
        bank: '',
        iban: ''
    });

    useEffect(() => {
        if (user?.companyDetails) {
            setCompanyDetails({
                ...user.companyDetails,
                companyName: user.companyDetails.companyName || '',
                regCom: user.companyDetails.regCom || '',
                cui: user.companyDetails.cui || '',
                vatPayer: user.companyDetails.vatPayer || false,
                country: user.companyDetails.country || 'Romania',
                city: user.companyDetails.city || '',
                street: user.companyDetails.street || user.companyDetails.address || '',
                postalCode: user.companyDetails.postalCode || '',
                billingEmail: user.companyDetails.billingEmail || user.email || '',
                bank: user.companyDetails.bank || '',
                iban: user.companyDetails.iban || '',
            });
        }
    }, [user]);

    const handleUpdateProfile = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock update
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleUpdateBilling = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await authApi.updateProfile(companyDetails);
            setMessage({ type: 'success', text: 'Billing information updated successfully!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Failed to update billing information.' });
        }
    };

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock password change
        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
            return;
        }
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setTimeout(() => setMessage(null), 3000);
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
            <Navbar />
            <div className="flex-grow pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
                <div className="flex flex-col md:flex-row gap-8">

                    {/* Sidebar / User Card */}
                    <div className="w-full md:w-1/3">
                        <div className="glass-panel p-6 text-center animate-fade-in">
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-4xl font-bold text-white mb-4 border-4 border-white/10 shadow-lg">
                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <h2 className="text-xl font-bold text-white">{user?.name}</h2>
                            <p className="text-gray-400 text-sm mb-6">{user?.email}</p>

                            <button onClick={logout} className="btn-ghost w-full text-sm border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                                Sign Out
                            </button>
                        </div>
                    </div>

                    {/* Settings Forms */}
                    <div className="w-full md:w-2/3 space-y-8">
                        {message && (
                            <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-500/10 text-green-300 border border-green-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'} animate-fade-in`}>
                                {message.text}
                            </div>
                        )}

                        {/* General Info */}
                        <div className="glass-panel p-8 animate-slide-up">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                Profile Information
                            </h3>
                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={user?.email || ''}
                                        className="input-field opacity-50 cursor-not-allowed"
                                        disabled
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed.</p>
                                </div>
                                <div className="pt-2">
                                    <button type="submit" className="btn-primary px-8">Save Profile</button>
                                </div>
                            </form>
                        </div>

                        {/* Billing Information */}
                        <div className="glass-panel p-8 animate-slide-up" style={{ animationDelay: '0.05s' }}>
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                Billing Information (Romania)
                            </h3>
                            <form onSubmit={handleUpdateBilling} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Company Name</label>
                                    <input
                                        type="text"
                                        value={companyDetails.companyName}
                                        onChange={(e) => setCompanyDetails({ ...companyDetails, companyName: e.target.value })}
                                        className="input-field"
                                        placeholder="SC EXAMPLE SRL"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">CUI / CIF</label>
                                    <input
                                        type="text"
                                        value={companyDetails.cui}
                                        onChange={(e) => setCompanyDetails({ ...companyDetails, cui: e.target.value })}
                                        className="input-field"
                                        placeholder="RO123456"
                                        required
                                    />
                                </div>
                                <div className="flex items-center pt-8">
                                    <label className="flex items-center cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={companyDetails.vatPayer}
                                                onChange={(e) => setCompanyDetails({ ...companyDetails, vatPayer: e.target.checked })}
                                                className="sr-only"
                                            />
                                            <div className={`w-10 h-6 rounded-full transition-colors ${companyDetails.vatPayer ? 'bg-primary-600' : 'bg-white/10'}`}></div>
                                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${companyDetails.vatPayer ? 'translate-x-4' : ''}`}></div>
                                        </div>
                                        <span className="ml-3 text-sm font-medium text-gray-300 group-hover:text-white transition-colors">VAT Payer</span>
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Country</label>
                                    <select
                                        value={companyDetails.country}
                                        onChange={(e) => setCompanyDetails({ ...companyDetails, country: e.target.value })}
                                        className="input-field"
                                    >
                                        <option value="Romania" className="bg-slate-900">Romania</option>
                                        <option value="Other" className="bg-slate-900">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">City</label>
                                    <input
                                        type="text"
                                        value={companyDetails.city}
                                        onChange={(e) => setCompanyDetails({ ...companyDetails, city: e.target.value })}
                                        className="input-field"
                                        placeholder="Bucuresti"
                                        required
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Street Address</label>
                                    <input
                                        type="text"
                                        value={companyDetails.street}
                                        onChange={(e) => setCompanyDetails({ ...companyDetails, street: e.target.value })}
                                        className="input-field"
                                        placeholder="Str. Exemplu Nr. 1"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Postal Code</label>
                                    <input
                                        type="text"
                                        value={companyDetails.postalCode}
                                        onChange={(e) => setCompanyDetails({ ...companyDetails, postalCode: e.target.value })}
                                        className="input-field"
                                        placeholder="0123456"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Billing Email</label>
                                    <input
                                        type="email"
                                        value={companyDetails.billingEmail}
                                        onChange={(e) => setCompanyDetails({ ...companyDetails, billingEmail: e.target.value })}
                                        className="input-field"
                                        placeholder="billing@example.com"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Reg. Com. (J)</label>
                                    <input
                                        type="text"
                                        value={companyDetails.regCom}
                                        onChange={(e) => setCompanyDetails({ ...companyDetails, regCom: e.target.value })}
                                        className="input-field"
                                        placeholder="J40/123/2024"
                                    />
                                </div>
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Bank Name</label>
                                        <input
                                            type="text"
                                            value={companyDetails.bank || ''}
                                            onChange={(e) => setCompanyDetails({ ...companyDetails, bank: e.target.value })}
                                            className="input-field"
                                            placeholder="Banca Transilvania"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">IBAN</label>
                                        <input
                                            type="text"
                                            value={companyDetails.iban || ''}
                                            onChange={(e) => setCompanyDetails({ ...companyDetails, iban: e.target.value })}
                                            className="input-field"
                                            placeholder="RO00BTRLx..."
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2 pt-2">
                                    <button type="submit" className="btn-primary w-full md:w-auto px-8">Save Billing Info</button>
                                </div>
                            </form>
                        </div>

                        {/* Company Branding (White Label) */}
                        <div className="glass-panel p-8 animate-slide-up" style={{ animationDelay: '0.08s' }}>
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                Company Branding (White Label)
                            </h3>
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                {user?.plan === 'venue_bundle' ? (
                                    <>
                                        <div className="w-full md:w-1/3">
                                            <div className="relative group">
                                                <div className="w-full h-32 bg-white/5 rounded-xl border-dashed border-2 border-white/20 flex items-center justify-center overflow-hidden">
                                                    {companyDetails.logoUrl ? (
                                                        <img src={companyDetails.logoUrl} alt="Company Logo" className="w-full h-full object-contain p-2" />
                                                    ) : (
                                                        <span className="text-gray-500 text-sm">No Logo</span>
                                                    )}
                                                </div>
                                                <label className="btn-ghost text-xs w-full mt-2 cursor-pointer text-center block">
                                                    Upload Logo
                                                    <input
                                                        type="file"
                                                        accept="image/jpeg,image/png"
                                                        className="hidden"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0]
                                                            if (!file) return

                                                            try {
                                                                setMessage({ type: 'success', text: 'Uploading logo...' })

                                                                // 1. Get Presigned URL
                                                                // Note: getLogoUploadUrl now returns readUrl as well
                                                                const { uploadUrl, readUrl, key } = await authApi.getLogoUploadUrl()

                                                                // 2. Upload to S3
                                                                await fetch(uploadUrl, {
                                                                    method: 'PUT',
                                                                    body: file,
                                                                    headers: {
                                                                        'Content-Type': file.type
                                                                    }
                                                                })

                                                                // 3. Update Profile
                                                                // We save logoKey for key-based lookup, and use readUrl (signed) for immediate display
                                                                const updatedDetails = {
                                                                    ...companyDetails,
                                                                    logoUrl: readUrl,
                                                                    logoKey: key
                                                                }
                                                                setCompanyDetails(updatedDetails)
                                                                await authApi.updateProfile(updatedDetails)

                                                                setMessage({ type: 'success', text: 'Logo uploaded successfully!' })
                                                                setTimeout(() => setMessage(null), 3000)

                                                            } catch (err: any) {
                                                                console.error(err)
                                                                // Handle 403 specifically
                                                                if (err.response?.status === 403) {
                                                                    setMessage({ type: 'error', text: 'Upgrade to Venue/Agency plan to upload logo.' })
                                                                } else {
                                                                    setMessage({ type: 'error', text: 'Failed to upload logo.' })
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2 text-center">
                                                This logo will appear on the guest scanning page.
                                            </p>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-gray-400 text-sm leading-relaxed">
                                                As a Venue/Agency partner, you can replace the PicSonar branding with your own.
                                                Upload your company logo here, and it will be displayed in the header of the Guest Page for all your events.
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full text-center py-8">
                                        <div className="bg-white/5 rounded-xl p-6 border border-white/10 max-w-lg mx-auto">
                                            <h4 className="text-lg font-bold text-white mb-2">💎 Premium Feature</h4>
                                            <p className="text-gray-400 text-sm mb-4">
                                                Custom Branding (White Label) is available exclusively on the <span className="text-primary-400 font-bold">Venue/Agency</span> plan.
                                            </p>
                                            <Link to="/pricing" className="btn-primary inline-block px-6 py-2 text-sm">
                                                Upgrade Now
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Security */}
                        <div className="glass-panel p-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                Security
                            </h3>
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Current Password</label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="input-field"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="input-field"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="pt-2">
                                    <button type="submit" className="btn-ghost px-6 py-2 text-sm">Update Password</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default ProfilePage;
