import React, { useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { apiClient } from '../api/client'

function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

interface BillingRow {
  date: string
  invoiceId: string
  companyName: string
  vatId: string | null
  vatIdVerified: boolean
  customerType: 'B2B' | 'B2C'
  fullName: string
  email: string
  country: string
  address: string
  amountRON: string
  currency: string
  packageId: string | null
  stripeSessionId: string
  stripePaymentIntentId: string | null
}

interface ExportResult {
  month: string
  count: number
  records: BillingRow[]
}

const AdminInvoicesPage: React.FC = () => {
  const [month, setMonth] = useState<string>(currentYearMonth())
  const [data, setData] = useState<ExportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRecords = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get(`/exports/invoices?month=${month}&format=json`)
      setData(res.data as ExportResult)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load billing records.')
    } finally {
      setLoading(false)
    }
  }

  const downloadCsv = async () => {
    try {
      const res = await apiClient.get(`/exports/invoices?month=${month}&format=csv`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `picsonar-invoices-${month}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError('CSV download failed.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <Navbar />
      <div className="flex-grow pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-white">Billing Records</h1>
          <div className="bg-primary-500/10 border border-primary-500/20 text-primary-400 px-4 py-2 rounded-full text-sm font-medium">
            Administrator View
          </div>
        </div>

        {/* Controls */}
        <div className="glass-panel p-6 mb-8 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
              Month
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-slate-800 border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500/50"
            />
          </div>
          <button
            onClick={fetchRecords}
            disabled={loading}
            className="btn-primary px-6"
          >
            {loading ? 'Loading…' : 'Load Records'}
          </button>
          {data && data.count > 0 && (
            <button
              onClick={downloadCsv}
              className="px-6 py-2 rounded-xl border border-primary-500/30 text-primary-400 hover:bg-primary-500/10 text-sm font-semibold transition-colors"
            >
              ↓ Download CSV
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl mb-8">
            {error}
          </div>
        )}

        {data && (
          <>
            <div className="mb-4 text-sm text-gray-400">
              {data.count} record{data.count !== 1 ? 's' : ''} for <span className="text-white font-semibold">{data.month}</span>
            </div>

            <div className="glass-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      {['Date', 'Invoice ID', 'Company', 'VAT ID', 'Type', 'Name / Email', 'Country', 'Amount', 'Package', 'Session'].map((h) => (
                        <th key={h} className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.count === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-gray-500">
                          No billing records for this month.
                        </td>
                      </tr>
                    ) : (
                      data.records.map((r) => (
                        <tr key={r.stripeSessionId} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 text-gray-300 whitespace-nowrap">{r.date}</td>
                          <td className="p-4 font-mono text-xs text-primary-400 whitespace-nowrap">{r.invoiceId}</td>
                          <td className="p-4 text-white font-medium">{r.companyName}</td>
                          <td className="p-4">
                            {r.vatId ? (
                              <span className={`font-mono text-xs ${r.vatIdVerified ? 'text-green-400' : 'text-yellow-400'}`}>
                                {r.vatId}
                                {!r.vatIdVerified && <span className="ml-1 text-yellow-500" title="Format unverified">⚠</span>}
                              </span>
                            ) : (
                              <span className="text-gray-600 text-xs italic">—</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.customerType === 'B2B' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                              {r.customerType}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="text-white">{r.fullName}</div>
                            <div className="text-xs text-gray-500">{r.email}</div>
                          </td>
                          <td className="p-4 text-gray-300">{r.country}</td>
                          <td className="p-4 text-white font-mono whitespace-nowrap">
                            {r.amountRON} <span className="text-gray-500 text-xs">{r.currency}</span>
                          </td>
                          <td className="p-4 text-gray-400 text-xs">{r.packageId ?? '—'}</td>
                          <td className="p-4">
                            <span className="font-mono text-xs text-gray-600 truncate block max-w-[120px]" title={r.stripeSessionId}>
                              {r.stripeSessionId.slice(0, 16)}…
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default AdminInvoicesPage
