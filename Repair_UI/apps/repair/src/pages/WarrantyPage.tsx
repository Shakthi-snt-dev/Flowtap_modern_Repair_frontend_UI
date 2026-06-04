import React, { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, Plus, Search, Eye, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Button, Input, Modal } from '@flowtap/ui-core'
import { useAppSelector } from '@flowtap/store'
import { repairApi } from '../api/repair.api'
import toast from 'react-hot-toast'

type ClaimStatus = 'Submitted' | 'UnderReview' | 'Approved' | 'Rejected' | 'Resolved'
type ClaimType = 'Repair' | 'Replacement' | 'Refund'

interface WarrantyClaim {
  id: string
  claimNo: string
  clientName: string
  clientPhone: string
  deviceType: string
  brand: string
  model: string
  serialNumber?: string
  purchaseDate?: string
  warrantyExpiry?: string
  issueDescription: string
  claimType: ClaimType
  status: ClaimStatus
  vendorName?: string
  resolution?: string
  createdAt: string
}

const MOCK_CLAIMS: WarrantyClaim[] = [
  { id: 'WC-001', claimNo: 'WRN-2024-001', clientName: 'Imran Sheikh', clientPhone: '+92 300 7778899', deviceType: 'Smartphone', brand: 'Samsung', model: 'Galaxy S22', serialNumber: 'SN-S22-001', purchaseDate: '2023-10-15', warrantyExpiry: '2024-10-15', issueDescription: 'Screen flickering randomly after software update', claimType: 'Repair', status: 'Approved', vendorName: 'Samsung Service Center', createdAt: '2024-05-10T10:00:00Z' },
  { id: 'WC-002', claimNo: 'WRN-2024-002', clientName: 'Ayesha Siddiqui', clientPhone: '+92 321 5556677', deviceType: 'Laptop', brand: 'HP', model: 'Pavilion 14', purchaseDate: '2024-01-20', warrantyExpiry: '2025-01-20', issueDescription: 'Keyboard keys not responding after normal use', claimType: 'Replacement', status: 'UnderReview', vendorName: 'HP Authorized Service', createdAt: '2024-05-18T14:30:00Z' },
  { id: 'WC-003', claimNo: 'WRN-2024-003', clientName: 'Tariq Mehmood', clientPhone: '+92 333 1112233', deviceType: 'Smartphone', brand: 'Apple', model: 'iPhone 14', serialNumber: 'APLE14-XYZ', purchaseDate: '2023-12-01', warrantyExpiry: '2024-12-01', issueDescription: 'Battery swelling — device not charging', claimType: 'Repair', status: 'Submitted', vendorName: 'Apple Service Provider', createdAt: '2024-05-22T09:00:00Z' },
  { id: 'WC-004', claimNo: 'WRN-2024-004', clientName: 'Nadia Qureshi', clientPhone: '+92 345 9990011', deviceType: 'Tablet', brand: 'Lenovo', model: 'Tab P11', purchaseDate: '2023-06-10', warrantyExpiry: '2024-06-10', issueDescription: 'Wi-Fi card failed — no wireless connectivity', claimType: 'Replacement', status: 'Rejected', resolution: 'Physical damage found — not covered under warranty', createdAt: '2024-05-15T11:45:00Z' },
  { id: 'WC-005', claimNo: 'WRN-2024-005', clientName: 'Hamza Butt', clientPhone: '+92 312 4445566', deviceType: 'Smartphone', brand: 'OnePlus', model: '11 5G', serialNumber: 'OP11-ABCD', purchaseDate: '2024-02-14', warrantyExpiry: '2025-02-14', issueDescription: 'Speaker distortion at normal volume', claimType: 'Repair', status: 'Resolved', resolution: 'Speaker replaced under warranty — no charge', vendorName: 'OnePlus Service', createdAt: '2024-05-01T08:30:00Z' },
]

const STATUS_CONFIG: Record<ClaimStatus, { label: string; color: string; icon: React.ReactNode }> = {
  Submitted:    { label: 'Submitted',     color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',    icon: <Clock className="w-3 h-3" /> },
  UnderReview:  { label: 'Under Review',  color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <AlertTriangle className="w-3 h-3" /> },
  Approved:     { label: 'Approved',      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle2 className="w-3 h-3" /> },
  Rejected:     { label: 'Rejected',      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',       icon: <XCircle className="w-3 h-3" /> },
  Resolved:     { label: 'Resolved',      color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',   icon: <CheckCircle2 className="w-3 h-3" /> },
}

const CLAIM_TYPES: ClaimType[] = ['Repair', 'Replacement', 'Refund']
const STATUSES: ClaimStatus[] = ['Submitted', 'UnderReview', 'Approved', 'Rejected', 'Resolved']
const DEVICE_TYPES = ['Smartphone', 'Tablet', 'Laptop', 'Desktop', 'SmartWatch', 'Gaming Console', 'Printer', 'Other']

const emptyForm = {
  clientName: '', clientPhone: '',
  deviceType: 'Smartphone', brand: '', model: '', serialNumber: '',
  purchaseDate: '', warrantyExpiry: '',
  issueDescription: '', claimType: 'Repair' as ClaimType,
  vendorName: '', notes: '',
}

const isExpired = (expiry?: string) => {
  if (!expiry) return false
  return new Date(expiry) < new Date()
}

const daysLeft = (expiry?: string) => {
  if (!expiry) return null
  const diff = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)
  return diff
}

export const WarrantyPage: React.FC = () => {
  const tenant         = useAppSelector((s) => s.tenant.tenant)
  const currentStoreId = useAppSelector((s) => s.tenant.currentStoreId)

  const [claims, setClaims]           = useState<WarrantyClaim[]>(MOCK_CLAIMS)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAdd, setShowAdd]         = useState(false)
  const [viewItem, setViewItem]       = useState<WarrantyClaim | null>(null)
  const [form, setForm]               = useState(emptyForm)
  const [saving, setSaving]           = useState(false)

  const fetchClaims = useCallback(async () => {
    if (!tenant?.id) return
    try {
      const res = await repairApi.getWarrantyClaims({
        companyId: tenant.id,
        locationId: currentStoreId ?? undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
      })
      const data = res.data?.data ?? res.data
      if (Array.isArray(data) && data.length > 0) setClaims(data)
    } catch {
      // keep mock data on error
    }
  }, [tenant?.id, currentStoreId, statusFilter, search])

  useEffect(() => { fetchClaims() }, [fetchClaims])

  const filtered = claims.filter((c) => {
    const matchSearch = !search ||
      c.clientName.toLowerCase().includes(search.toLowerCase()) ||
      c.clientPhone.includes(search) ||
      c.claimNo.toLowerCase().includes(search.toLowerCase()) ||
      `${c.brand} ${c.model}`.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleSave = async () => {
    if (!form.clientName.trim() || !form.clientPhone.trim() || !form.brand.trim() || !form.model.trim() || !form.issueDescription.trim()) {
      toast.error('Client name, phone, device brand/model, and issue description are required')
      return
    }
    setSaving(true)
    try {
      await repairApi.createWarrantyClaim({
        companyId: tenant?.id ?? '',
        locationId: currentStoreId ?? undefined,
        clientName: form.clientName,
        clientPhone: form.clientPhone,
        deviceType: form.deviceType,
        brand: form.brand,
        model: form.model,
        serialNumber: form.serialNumber || undefined,
        purchaseDate: form.purchaseDate || undefined,
        warrantyExpiry: form.warrantyExpiry || undefined,
        issueDescription: form.issueDescription,
        claimType: form.claimType,
        vendorName: form.vendorName || undefined,
        notes: form.notes || undefined,
      })
      toast.success('Warranty claim submitted successfully')
      setShowAdd(false)
      setForm(emptyForm)
      fetchClaims()
    } catch {
      toast.error('Failed to submit claim. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (item: WarrantyClaim, newStatus: ClaimStatus) => {
    try {
      await repairApi.updateWarrantyClaimStatus(item.id, newStatus)
      setClaims((prev) => prev.map((c) => c.id === item.id ? { ...c, status: newStatus } : c))
      toast.success(`Claim status updated to "${STATUS_CONFIG[newStatus].label}"`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  const totalClaims = claims.length
  const activeClaims = claims.filter((c) => !['Rejected', 'Resolved'].includes(c.status)).length
  const approvedClaims = claims.filter((c) => c.status === 'Approved').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Warranty Claims</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{totalClaims} total claims</p>
          </div>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Claim
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Claims', value: totalClaims, color: 'text-gray-900 dark:text-white', bg: 'bg-white dark:bg-gray-800' },
          { label: 'Active', value: activeClaims, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Approved', value: approvedClaims, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center`}>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client, device, claim no..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Claim #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Client</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Device</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Warranty</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((item) => {
                const days = daysLeft(item.warrantyExpiry)
                const expired = isExpired(item.warrantyExpiry)
                return (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-green-600 dark:text-green-400 font-semibold">{item.claimNo}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{new Date(item.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{item.clientName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.clientPhone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{item.brand} {item.model}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.deviceType}</div>
                    </td>
                    <td className="px-4 py-3">
                      {item.warrantyExpiry ? (
                        <div>
                          <div className={`text-xs font-medium ${expired ? 'text-red-600 dark:text-red-400' : days !== null && days <= 30 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                            {expired ? 'Expired' : `${days}d left`}
                          </div>
                          <div className="text-xs text-gray-400">{item.warrantyExpiry}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                        {item.claimType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item, e.target.value as ClaimStatus)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${STATUS_CONFIG[item.status].color}`}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setViewItem(item)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-14 text-gray-400">
              <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No warranty claims found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>

      {/* New Claim Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setForm(emptyForm) }} title="New Warranty Claim" size="lg">
        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Client Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input label="Full Name *" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="Customer name" />
              </div>
              <div>
                <Input label="Phone *" value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} placeholder="+92 300 0000000" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Device & Warranty</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Device Type *</label>
                <select value={form.deviceType} onChange={(e) => setForm({ ...form, deviceType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {DEVICE_TYPES.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Claim Type *</label>
                <select value={form.claimType} onChange={(e) => setForm({ ...form, claimType: e.target.value as ClaimType })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {CLAIM_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Input label="Brand *" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="e.g. Samsung" />
              </div>
              <div>
                <Input label="Model *" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="e.g. Galaxy S23" />
              </div>
              <div>
                <Input label="Serial Number" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} placeholder="Device serial" />
              </div>
              <div>
                <Input label="Vendor / Service Center" value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} placeholder="Samsung Service Center" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Date</label>
                <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Warranty Expiry</label>
                <input type="date" value={form.warrantyExpiry} onChange={(e) => setForm({ ...form, warrantyExpiry: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Description *</label>
            <textarea value={form.issueDescription} onChange={(e) => setForm({ ...form, issueDescription: e.target.value })}
              rows={3} placeholder="Describe the defect or issue being claimed..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Button variant="secondary" onClick={() => { setShowAdd(false); setForm(emptyForm) }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
              Submit Claim
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Warranty Claim Details" size="md">
        {viewItem && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{viewItem.claimNo}</div>
                <div className="text-xs text-gray-500">{new Date(viewItem.createdAt).toLocaleString()}</div>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_CONFIG[viewItem.status].color}`}>
                {STATUS_CONFIG[viewItem.status].icon} {STATUS_CONFIG[viewItem.status].label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Client', viewItem.clientName],
                ['Phone', viewItem.clientPhone],
                ['Device', `${viewItem.brand} ${viewItem.model}`],
                ['Type', viewItem.deviceType],
                ['Serial', viewItem.serialNumber || '—'],
                ['Claim Type', viewItem.claimType],
                ['Purchase Date', viewItem.purchaseDate || '—'],
                ['Warranty Expiry', viewItem.warrantyExpiry
                  ? `${viewItem.warrantyExpiry} (${isExpired(viewItem.warrantyExpiry) ? 'Expired' : `${daysLeft(viewItem.warrantyExpiry)}d left`})`
                  : '—'],
                ['Vendor', viewItem.vendorName || '—'],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</div>
                  <div className="font-medium text-gray-900 dark:text-white text-sm">{value}</div>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Issue Description</div>
              <p className="text-sm text-gray-900 dark:text-white">{viewItem.issueDescription}</p>
            </div>
            {viewItem.resolution && (
              <div className={`rounded-lg p-3 ${viewItem.status === 'Rejected' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                <div className={`text-xs mb-1 ${viewItem.status === 'Rejected' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>Resolution</div>
                <p className="text-sm text-gray-800 dark:text-gray-200">{viewItem.resolution}</p>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setViewItem(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
