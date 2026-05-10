import { useEffect, useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { adminApi, AdminFinanceStats, AdminStats } from '../../api/admin'

// AWS eu-central-1 pricing (approximate)
const S3_PER_GB_MONTH = 0.023        // $0.023/GB/month
const REKO_PER_IMAGE  = 0.001        // $1.00/1,000 images (IndexFaces)
const LAMBDA_PER_INVOCATION = 0.00025 // 512 MB × 30 s ≈ $0.00025/call
const USD_TO_RON = 4.60              // approximate exchange rate

export default function AdminFinancePage() {
    const [finance, setFinance] = useState<AdminFinanceStats | null>(null)
    const [sysStats, setSysStats] = useState<AdminStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState<string | null>(null)

    useEffect(() => {
        const load = async () => {
            try {
                const [f, s] = await Promise.all([adminApi.getFinance(), adminApi.getStats()])
                setFinance(f)
                setSysStats(s)
            } catch (error) {
                console.error('Failed to load finance stats', error)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-400">Loading Finance Data...</div>
                </div>
            </AdminLayout>
        )
    }

    // ── Revenue calculations ─────────────────────────────────────
    const totalRevenue = finance?.totalRevenue ?? 0
    const totalOrders  = finance?.totalOrders ?? 0
    const avgOrder     = totalOrders > 0 ? totalRevenue / totalOrders : 0

    const now = new Date()
    const thisMonthRevenue = (finance?.recentOrders ?? [])
        .filter(o => {
            const d = new Date(o.date)
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
        })
        .reduce((acc, o) => acc + o.amount, 0)

    // ── AWS cost calculations ────────────────────────────────────
    const totalStorageGB = parseFloat(sysStats?.totalStorageGB ?? '0')
    const totalPhotos    = sysStats?.totalPhotos ?? 0

    const s3MonthlyUSD     = totalStorageGB * S3_PER_GB_MONTH
    const rekognitionUSD   = totalPhotos * REKO_PER_IMAGE
    const lambdaUSD        = totalPhotos * LAMBDA_PER_INVOCATION

    const s3MonthlyRON   = s3MonthlyUSD * USD_TO_RON
    const rekognitionRON = rekognitionUSD * USD_TO_RON
    const lambdaRON      = lambdaUSD * USD_TO_RON

    // One-time processing costs (lifetime): Rekognition + Lambda
    const processingCostRON = rekognitionRON + lambdaRON

    // Net = Lifetime Revenue − Lifetime Processing − Current Monthly Storage
    const netEstimateRON = totalRevenue - processingCostRON - s3MonthlyRON
    const marginPct = totalRevenue > 0 ? (netEstimateRON / totalRevenue) * 100 : 0

    const fmt = (n: number, dec = 2) => n.toLocaleString('ro-RO', { minimumFractionDigits: dec, maximumFractionDigits: dec })

    return (
        <AdminLayout>
            {/* ── Header ── */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Finance & P&L</h1>
                    <p className="text-gray-400 text-sm mt-1">Gelir, gider ve net kar özeti</p>
                </div>
                <div className={`px-6 py-3 rounded-xl border ${netEstimateRON >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <span className="text-gray-400 text-xs block">Tahmini Net Kar</span>
                    <div className={`text-3xl font-bold ${netEstimateRON >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {fmt(netEstimateRON)} RON
                    </div>
                </div>
            </div>

            {/* ── Revenue summary cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="glass-panel p-5">
                    <div className="text-gray-400 text-xs uppercase font-medium mb-1">Toplam Gelir</div>
                    <div className="text-2xl font-bold text-white">{fmt(totalRevenue)} RON</div>
                    <div className="text-xs text-gray-500 mt-1">Tüm zamanlar</div>
                </div>
                <div className="glass-panel p-5">
                    <div className="text-gray-400 text-xs uppercase font-medium mb-1">Bu Ay Gelir</div>
                    <div className="text-2xl font-bold text-green-400">{fmt(thisMonthRevenue)} RON</div>
                    <div className="text-xs text-gray-500 mt-1">{now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</div>
                </div>
                <div className="glass-panel p-5">
                    <div className="text-gray-400 text-xs uppercase font-medium mb-1">Toplam Sipariş</div>
                    <div className="text-2xl font-bold text-white">{totalOrders}</div>
                    <div className="text-xs text-gray-500 mt-1">Tüm zamanlar</div>
                </div>
                <div className="glass-panel p-5">
                    <div className="text-gray-400 text-xs uppercase font-medium mb-1">Ortalama Sipariş</div>
                    <div className="text-2xl font-bold text-white">{fmt(avgOrder)} RON</div>
                    <div className="text-xs text-gray-500 mt-1">Sipariş başına</div>
                </div>
            </div>

            {/* ── Costs + P&L ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* AWS Costs */}
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-bold text-white mb-1">AWS Giderleri</h3>
                    <p className="text-xs text-gray-500 mb-5">eu-central-1 fiyatlarına göre tahmini · 1 USD ≈ {USD_TO_RON} RON</p>

                    <div className="space-y-4">
                        {/* S3 */}
                        <div className="flex items-start justify-between border-b border-white/5 pb-4">
                            <div>
                                <div className="text-white font-medium text-sm">S3 Depolama</div>
                                <div className="text-gray-500 text-xs mt-0.5">{fmt(totalStorageGB, 3)} GB × $0.023 · aylık yinelenen</div>
                            </div>
                            <div className="text-right">
                                <div className="text-yellow-400 font-bold">${fmt(s3MonthlyUSD)}<span className="text-xs text-gray-500 font-normal">/ay</span></div>
                                <div className="text-gray-400 text-xs">{fmt(s3MonthlyRON)} RON/ay</div>
                            </div>
                        </div>

                        {/* Rekognition */}
                        <div className="flex items-start justify-between border-b border-white/5 pb-4">
                            <div>
                                <div className="text-white font-medium text-sm">Rekognition IndexFaces</div>
                                <div className="text-gray-500 text-xs mt-0.5">{totalPhotos.toLocaleString()} fotoğraf × $0.001 · tek seferlik</div>
                            </div>
                            <div className="text-right">
                                <div className="text-pink-400 font-bold">${fmt(rekognitionUSD)}</div>
                                <div className="text-gray-400 text-xs">{fmt(rekognitionRON)} RON</div>
                            </div>
                        </div>

                        {/* Lambda */}
                        <div className="flex items-start justify-between border-b border-white/5 pb-4">
                            <div>
                                <div className="text-white font-medium text-sm">Lambda (processPhoto)</div>
                                <div className="text-gray-500 text-xs mt-0.5">{totalPhotos.toLocaleString()} çağrı × ~$0.00025 · tek seferlik</div>
                            </div>
                            <div className="text-right">
                                <div className="text-blue-400 font-bold">${fmt(lambdaUSD)}</div>
                                <div className="text-gray-400 text-xs">{fmt(lambdaRON)} RON</div>
                            </div>
                        </div>

                        {/* DynamoDB / API GW */}
                        <div className="flex items-start justify-between pb-2">
                            <div>
                                <div className="text-white font-medium text-sm">DynamoDB + API Gateway</div>
                                <div className="text-gray-500 text-xs mt-0.5">On-demand, düşük trafik</div>
                            </div>
                            <div className="text-right">
                                <div className="text-gray-400 font-bold text-sm">~$0.00</div>
                                <div className="text-gray-500 text-xs">ihmal edilebilir</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* P&L Summary */}
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-bold text-white mb-1">Kar-Zarar Özeti</h3>
                    <p className="text-xs text-gray-500 mb-5">İşlem maliyetleri kümülatif · depolama aylık baz alındı</p>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-gray-300 text-sm">Toplam Gelir</span>
                            <span className="text-green-400 font-bold">{fmt(totalRevenue)} RON</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-gray-300 text-sm">İşlem Maliyeti (Reko + Lambda)</span>
                            <span className="text-red-400 font-medium">− {fmt(processingCostRON)} RON</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-gray-300 text-sm">S3 Depolama (aylık)</span>
                            <span className="text-red-400 font-medium">− {fmt(s3MonthlyRON)} RON</span>
                        </div>

                        <div className={`flex justify-between items-center py-3 rounded-lg px-3 mt-2 ${netEstimateRON >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            <span className="text-white font-bold">Tahmini Net</span>
                            <span className={`text-2xl font-bold ${netEstimateRON >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {fmt(netEstimateRON)} RON
                            </span>
                        </div>

                        <div className="flex justify-between items-center py-2">
                            <span className="text-gray-400 text-sm">Net Marj</span>
                            <span className={`font-bold ${marginPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {fmt(marginPct, 1)}%
                            </span>
                        </div>

                        <div className="mt-4 p-3 bg-white/3 rounded-lg text-xs text-gray-500">
                            Bu hesaplama tahminidir. Rekognition SearchFaces, veri çıkışı (egress) ve Stripe işlem ücretleri ({fmt(totalRevenue * 0.014 + totalOrders * 0.25, 2)} RON ≈ ~%1.4 + 0,25 RON/işlem) dahil değildir.
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Bottom row: Package stats + Recent transactions ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* PACKAGE STATS */}
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-bold text-white mb-6">Paket Satışları</h3>
                    <div className="space-y-4">
                        {Object.entries(finance?.packageStats || {}).map(([pkg, count]) => {
                            const percentage = ((count / (finance?.totalOrders || 1)) * 100).toFixed(1)
                            return (
                                <div key={pkg} className="group">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-white font-medium capitalize">{pkg.replace(/_/g, ' ')}</span>
                                        <span className="text-gray-400">{count} adet</span>
                                    </div>
                                    <div className="w-full bg-white/5 rounded-full h-2">
                                        <div
                                            className="bg-primary-500 h-2 rounded-full transition-all duration-500 group-hover:bg-primary-400"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <div className="text-right text-xs text-gray-500 mt-1">{percentage}%</div>
                                </div>
                            )
                        })}
                        {Object.keys(finance?.packageStats || {}).length === 0 && (
                            <p className="text-gray-500 text-center py-4">Henüz satış yok.</p>
                        )}
                    </div>
                </div>

                {/* RECENT ORDERS TABLE */}
                <div className="glass-panel p-0 overflow-hidden lg:col-span-2">
                    <div className="p-6 border-b border-white/10 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white">Son İşlemler</h3>
                        <span className="text-xs text-gray-500">Son 50 sipariş</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase">Sipariş ID</th>
                                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase">Paket</th>
                                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase">Tutar</th>
                                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase">Firma / E-posta</th>
                                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase text-right">Tarih</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {finance?.recentOrders.map((order) => {
                                    const b = order.billing || {}
                                    const isOpen = expanded === order.orderId
                                    return (
                                        <>
                                            <tr
                                                key={order.orderId}
                                                className="hover:bg-white/5 transition-colors cursor-pointer"
                                                onClick={() => setExpanded(isOpen ? null : order.orderId)}
                                            >
                                                <td className="p-4 font-mono text-xs text-gray-500">
                                                    {order.orderId.substring(0, 14)}...
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2 py-1 bg-primary-500/10 text-primary-300 rounded text-xs font-medium capitalize">
                                                        {order.pkg?.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-bold text-white">
                                                    {order.amount} {order.currency.toUpperCase()}
                                                </td>
                                                <td className="p-4 text-sm">
                                                    {b.companyName
                                                        ? <><span className="text-white font-medium">{b.companyName}</span>{b.cui && <span className="text-gray-500 ml-2 text-xs">CUI: {b.cui}</span>}<br /><span className="text-gray-400 text-xs">{b.billingEmail}</span></>
                                                        : <span className="text-gray-600 italic text-xs">fatura bilgisi yok</span>
                                                    }
                                                </td>
                                                <td className="p-4 text-right text-sm text-gray-500">
                                                    {new Date(order.date).toLocaleDateString('tr-TR')}
                                                    <span className="ml-2 text-gray-600 text-xs">{isOpen ? '▲' : '▼'}</span>
                                                </td>
                                            </tr>
                                            {isOpen && (
                                                <tr key={`${order.orderId}-detail`} className="bg-white/3">
                                                    <td colSpan={5} className="px-8 py-4 text-xs text-gray-400 space-y-1">
                                                        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                                                            <div><span className="text-gray-600 uppercase tracking-wider text-[10px]">Firma</span><div className="text-white">{b.companyName || '—'}</div></div>
                                                            <div><span className="text-gray-600 uppercase tracking-wider text-[10px]">CUI / TVA</span><div className="text-white">{b.cui || '—'}</div></div>
                                                            <div><span className="text-gray-600 uppercase tracking-wider text-[10px]">Fatura E-posta</span><div className="text-white">{b.billingEmail || '—'}</div></div>
                                                            <div><span className="text-gray-600 uppercase tracking-wider text-[10px]">Adres</span><div className="text-white">{[b.street, b.city, b.postalCode].filter(Boolean).join(', ') || '—'}</div></div>
                                                            <div><span className="text-gray-600 uppercase tracking-wider text-[10px]">Sipariş ID</span><div className="text-white font-mono">{order.orderId}</div></div>
                                                            <div><span className="text-gray-600 uppercase tracking-wider text-[10px]">Kullanıcı ID</span><div className="text-white font-mono">{order.userId}</div></div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    )
                                })}
                                {finance?.recentOrders.length === 0 && (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">İşlem bulunamadı.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}
