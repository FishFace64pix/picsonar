import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { adminApi } from '../api/admin';
import { Order } from '../types';

const AdminInvoicesPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const data = await adminApi.getOrders();
                setOrders(data);
            } catch (err: any) {
                console.error('Failed to fetch orders', err);
                setError('Failed to load orders. Make sure you have admin privileges.');
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    const handleViewInvoice = (order: Order) => {
        // Simple invoice view
        const invoiceContent = `
INVOICE #${order.orderId.slice(0, 8).toUpperCase()}
Date: ${new Date(order.createdAt).toLocaleDateString()}

BUYER:
Name: ${order.user?.name || 'N/A'}
Email: ${order.user?.email || 'N/A'}
Company: ${order.user?.companyDetails?.companyName || 'N/A'}
CUI: ${order.user?.companyDetails?.cui || 'N/A'}
Reg. Com: ${order.user?.companyDetails?.regCom || 'N/A'}
Address: ${order.user?.companyDetails?.address || 'N/A'}

DETAILS:
${order.description}
Amount: ${order.amount} ${order.currency}
Status: ${order.status}
        `;
        alert(invoiceContent);
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
            <Navbar />
            <div className="flex-grow pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">Admin Invoices</h1>
                    <div className="bg-primary-500/10 border border-primary-500/20 text-primary-400 px-4 py-2 rounded-full text-sm font-medium">
                        Administrator View
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl mb-8">
                        {error}
                    </div>
                )}

                <div className="glass-panel overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                    <th className="p-4 text-sm font-medium text-gray-400">Date</th>
                                    <th className="p-4 text-sm font-medium text-gray-400">User</th>
                                    <th className="p-4 text-sm font-medium text-gray-400">Company</th>
                                    <th className="p-4 text-sm font-medium text-gray-400">Amount</th>
                                    <th className="p-4 text-sm font-medium text-gray-400">Status</th>
                                    <th className="p-4 text-sm font-medium text-gray-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-gray-400">Loading orders...</td>
                                    </tr>
                                ) : orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-gray-400">No orders found.</td>
                                    </tr>
                                ) : (
                                    orders.map((order) => (
                                        <tr key={order.orderId} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 text-white text-sm">
                                                {new Date(order.createdAt).toLocaleDateString()}
                                                <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-white font-medium text-sm">{order.user?.name || 'Unknown'}</div>
                                                <div className="text-xs text-gray-500">{order.user?.email}</div>
                                            </td>
                                            <td className="p-4">
                                                {order.user?.companyDetails?.companyName ? (
                                                    <div>
                                                        <div className="text-white text-sm">{order.user.companyDetails.companyName}</div>
                                                        <div className="text-xs text-gray-500">{order.user.companyDetails.cui}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-500 text-sm italic">No verified company</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-white font-mono text-sm">
                                                {order.amount} {order.currency}
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                                        order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => handleViewInvoice(order)}
                                                    className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors"
                                                >
                                                    View Invoice
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default AdminInvoicesPage;
