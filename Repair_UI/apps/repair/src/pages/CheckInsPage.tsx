import React, { useState, useEffect, useCallback } from 'react'
import { ClipboardList, Plus, Search, Eye, Printer, MoreVertical, Clock, CheckCircle2, AlertCircle, Wrench } from 'lucide-react'
import { Button, Input, Modal, Badge } from '@flowtap/ui-core'
import { useAppSelector } from '@flowtap/store'
import { repairApi } from '../api/repair.api'
import toast from 'react-hot-toast'

type Priority = 'Low' | 'Normal' | 'High' | 'Urgent'
type CheckInStatus = 'Received' | 'Diagnosing' | 'AwaitingParts' | 'InRepair' | 'ReadyForPickup' | 'Completed' | 'Cancelled'

interface CheckIn {
  id: string
  jobCardNo: string
  clientName: string
  clientPhone: string
  clientEmail?: string
  deviceType: string
  brand: string
  model: string
  serialNumber?: string
  imei?: string
  color?: string
  reportedIssue: string
  status: CheckInStatus
  priority: Priority
  estimatedCost?: number
  advanceCollected?: number
  assignedTechnicianName?: string
  createdAt: string
  notes?: string
}

const MOCK_CHECKINS: CheckIn[] = [
  { id: 'CI-001', jobCardNo: 'JC-2024-001', clientName: 'Ahmed Hassan', clientPhone: '+92 300 1234567', deviceType: 'Smartphone', brand: 'Samsung', model: 'Galaxy S23', serialNumber: 'SN123456789', imei: '352099001761481', color: 'Black', reportedIssue: 'Screen cracked, touch not working', status: 'InRepair', priority: 'High', estimatedCost: 8500, advanceCollected: 2000, assignedTechnicianName: 'Usman Ali', createdAt: '2024-05-20T09:30:00Z' },
  { id: 'CI-002', jobCardNo: 'JC-2024-002', clientName: 'Sara Khan', clientPhone: '+92 312 9876543', deviceType: 'Laptop', brand: 'Dell', model: 'Inspiron 15', serialNumber: 'DL987654', color: 'Silver', reportedIssue: 'Battery draining fast, charging port loose', status: 'Diagnosing', priority: 'Normal', estimatedCost: 5000, advanceCollected: 0, assignedTechnicianName: 'Bilal Ahmed', createdAt: '2024-05-21T11:00:00Z' },
  { id: 'CI-003', jobCardNo: 'JC-2024-003', clientName: 'Raza Malik', clientPhone: '+92 333 5551234', deviceType: 'Tablet', brand: 'Apple', model: 'iPad Air 4', serialNumber: 'IPAD001122', color: 'Space Gray', reportedIssue: 'Device not turning on after water damage', status: 'AwaitingParts', priority: 'Urgent', estimatedCost: 15000, advanceCollected: 5000, createdAt: '2024-05-19T14:15:00Z' },
  { id: 'CI-004', jobCardNo: 'JC-2024-004', clientName: 'Fatima Nawaz', clientPhone: '+92 321 4445678', deviceType: 'Smartphone', brand: 'iPhone', model: '13 Pro Max', color: 'Gold', reportedIssue: 'Speaker not working, microphone issue', status: 'ReadyForPickup', priority: 'Normal', estimatedCost: 4500, advanceCollected: 4500, assignedTechnicianName: 'Usman Ali', createdAt: '2024-05-18T08:00:00Z' },
  { id: 'CI-005', jobCardNo: 'JC-2024-005', clientName: 'Omar Farooq', clientPhone: '+92 345 7778899', deviceType: 'Smartphone', brand: 'Xiaomi', model: 'Redmi Note 12', reportedIssue: 'Camera not working, storage issue', status: 'Received', priority: 'Low', createdAt: '2024-05-22T10:30:00Z' },
]

const STATUS_CONFIG: Record<CheckInStatus, { label: string; color: string; icon: React.ReactNode }> = {
  Received:       { label: 'Received',        color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',    icon: <Clock className="w-3 h-3" /> },
  Diagnosing:     { label: 'Diagnosing',      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Search className="w-3 h-3" /> },
  AwaitingParts:  { label: 'Awaiting Parts',  color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <AlertCircle className="w-3 h-3" /> },
  InRepair:       { label: 'In Repair',       color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: <Wrench className="w-3 h-3" /> },
  ReadyForPickup: { label: 'Ready',           color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle2 className="w-3 h-3" /> },
  Completed:      { label: 'Completed',       color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400', icon: <CheckCircle2 className="w-3 h-3" /> },
  Cancelled:      { label: 'Cancelled',       color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',    icon: <AlertCircle className="w-3 h-3" /> },
}

const PRIORITY_COLORS: Record<Priority, string> = {
  Low:    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  Normal: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  High:   'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  Urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const DEVICE_TYPES = ['Smartphone', 'Tablet', 'Laptop', 'Desktop', 'SmartWatch', 'Gaming Console', 'Printer', 'Other']
const PRIORITIES: Priority[] = ['Low', 'Normal', 'High', 'Urgent']
const STATUSES: CheckInStatus[] = ['Received', 'Diagnosing', 'AwaitingParts', 'InRepair', 'ReadyForPickup', 'Completed', 'Cancelled']

const emptyForm = {
  clientName: '', clientPhone: '', clientEmail: '',
  deviceType: 'Smartphone', brand: '', model: '', serialNumber: '', imei: '', color: '',
  reportedIssue: '', accessoryHandedIn: '', priority: 'Normal' as Priority,
  estimatedCost: '', advanceCollected: '', notes: '',
}

export const CheckInsPage: React.FC = () => {
  const tenant      = useAppSelector((s) => s.tenant.tenant)
  const currentStoreId = useAppSelector((s) => s.tenant.currentStoreId)

  const [checkIns, setCheckIns]     = useState<CheckIn[]>(MOCK_CHECKINS)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAdd, setShowAdd]       = useState(false)
  const [viewItem, setViewItem]     = useState<CheckIn | null>(null)
  const [form, setForm]             = useState(emptyForm)
  const [saving, setSaving]         = useState(false)

  const fetchCheckIns = useCallback(async () => {
    if (!tenant?.id) return
    try {
      const res = await repairApi.getCheckIns({
        companyId: tenant.id,
        locationId: currentStoreId ?? undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
      })
      const data = res.data?.data ?? res.data
      if (Array.isArray(data) && data.length > 0) setCheckIns(data)
    } catch {
      // keep mock data on error
    }
  }, [tenant?.id, currentStoreId, statusFilter, search])

  useEffect(() => { fetchCheckIns() }, [fetchCheckIns])

  const filtered = checkIns.filter((c) => {
    const matchSearch = !search ||
      c.clientName.toLowerCase().includes(search.toLowerCase()) ||
      c.clientPhone.includes(search) ||
      c.jobCardNo.toLowerCase().includes(search.toLowerCase()) ||
      `${c.brand} ${c.model}`.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleSave = async () => {
    if (!form.clientName.trim() || !form.clientPhone.trim() || !form.brand.trim() || !form.model.trim() || !form.reportedIssue.trim()) {
      toast.error('Client name, phone, device brand/model, and reported issue are required')
      return
    }
    setSaving(true)
    try {
      await repairApi.createCheckIn({
        companyId: tenant?.id ?? '',
        locationId: currentStoreId ?? undefined,
        clientName: form.clientName,
        clientPhone: form.clientPhone,
        clientEmail: form.clientEmail || undefined,
        deviceType: form.deviceType,
        brand: form.brand,
        model: form.model,
        serialNumber: form.serialNumber || undefined,
        imei: form.imei || undefined,
        color: form.color || undefined,
        reportedIssue: form.reportedIssue,
        accessoryHandedIn: form.accessoryHandedIn || undefined,
        estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : undefined,
        advanceCollected: form.advanceCollected ? Number(form.advanceCollected) : undefined,
        priority: form.priority,
        notes: form.notes || undefined,
      })
      toast.success('Device check-in created successfully')
      setShowAdd(false)
      setForm(emptyForm)
      fetchCheckIns()
    } catch {
      toast.error('Failed to save check-in. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (item: CheckIn, newStatus: CheckInStatus) => {
    try {
      await repairApi.updateCheckInStatus(item.id, newStatus)
      setCheckIns((prev) => prev.map((c) => c.id === item.id ? { ...c, status: newStatus } : c))
      toast.success(`Status updated to "${STATUS_CONFIG[newStatus].label}"`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Device Check-Ins</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} job card{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Check-In
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client, device, job card..."
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

      {/* Status Summary Chips */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const count = checkIns.filter((c) => c.status === s).length
          if (count === 0) return null
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${STATUS_CONFIG[s].color} ${statusFilter === s ? 'ring-2 ring-offset-1 ring-current' : ''}`}
            >
              {STATUS_CONFIG[s].icon}
              {STATUS_CONFIG[s].label} ({count})
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Job Card</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Client</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Device</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Issue</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Est. Cost</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{item.jobCardNo}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{new Date(item.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{item.clientName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{item.clientPhone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{item.brand} {item.model}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{item.deviceType}{item.color ? ` · ${item.color}` : ''}</div>
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <p className="text-gray-600 dark:text-gray-300 text-xs truncate" title={item.reportedIssue}>{item.reportedIssue}</p>
                    {item.assignedTechnicianName && (
                      <p className="text-xs text-gray-400 mt-0.5">Tech: {item.assignedTechnicianName}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item, e.target.value as CheckInStatus)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${STATUS_CONFIG[item.status].color}`}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[item.priority]}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
                    {item.estimatedCost ? `Rs ${item.estimatedCost.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewItem(item)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toast.success('Printing job card...')}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 transition-colors"
                        title="Print Job Card"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-14 text-gray-400">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No check-ins found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Check-In Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setForm(emptyForm) }} title="New Device Check-In" size="lg">
        <div className="space-y-5">
          {/* Client Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Client Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Input label="Full Name *" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="Customer name" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Input label="Phone *" value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} placeholder="+92 300 0000000" />
              </div>
              <div className="col-span-2">
                <Input label="Email" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} placeholder="customer@email.com" />
              </div>
            </div>
          </div>

          {/* Device Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Device Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Device Type *</label>
                <select value={form.deviceType} onChange={(e) => setForm({ ...form, deviceType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {DEVICE_TYPES.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <Input label="Brand *" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="e.g. Samsung, Apple" />
              </div>
              <div>
                <Input label="Model *" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="e.g. Galaxy S23" />
              </div>
              <div>
                <Input label="Serial Number" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} placeholder="Device serial number" />
              </div>
              <div>
                <Input label="IMEI / MEID" value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} placeholder="15-digit IMEI" />
              </div>
              <div>
                <Input label="Color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="e.g. Midnight Black" />
              </div>
              <div>
                <Input label="Accessories Handed In" value={form.accessoryHandedIn} onChange={(e) => setForm({ ...form, accessoryHandedIn: e.target.value })} placeholder="e.g. Charger, Case" />
              </div>
            </div>
          </div>

          {/* Issue & Cost */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Issue & Cost</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reported Issue *</label>
                <textarea value={form.reportedIssue} onChange={(e) => setForm({ ...form, reportedIssue: e.target.value })}
                  rows={3} placeholder="Describe the problem reported by the customer..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input label="Estimated Cost (Rs)" type="number" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <Input label="Advance Collected (Rs)" type="number" value={form.advanceCollected} onChange={(e) => setForm({ ...form, advanceCollected: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Internal Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2} placeholder="Internal notes for technicians..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Button variant="secondary" onClick={() => { setShowAdd(false); setForm(emptyForm) }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
              Create Job Card
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Job Card Details" size="md">
        {viewItem && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{viewItem.jobCardNo}</div>
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
                ['Color', viewItem.color || '—'],
                ['Serial', viewItem.serialNumber || '—'],
                ['IMEI', viewItem.imei || '—'],
                ['Priority', viewItem.priority],
                ['Technician', viewItem.assignedTechnicianName || 'Unassigned'],
                ['Est. Cost', viewItem.estimatedCost ? `Rs ${viewItem.estimatedCost.toLocaleString()}` : '—'],
                ['Advance', viewItem.advanceCollected ? `Rs ${viewItem.advanceCollected.toLocaleString()}` : '—'],
                ['Balance', viewItem.estimatedCost && viewItem.advanceCollected != null
                  ? `Rs ${(viewItem.estimatedCost - (viewItem.advanceCollected ?? 0)).toLocaleString()}`
                  : '—'],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</div>
                  <div className="font-medium text-gray-900 dark:text-white text-sm">{value}</div>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reported Issue</div>
              <p className="text-sm text-gray-900 dark:text-white">{viewItem.reportedIssue}</p>
            </div>

            {viewItem.notes && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                <div className="text-xs text-yellow-700 dark:text-yellow-400 mb-1">Notes</div>
                <p className="text-sm text-gray-800 dark:text-gray-200">{viewItem.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => toast.success('Printing job card...')}>
                <Printer className="w-4 h-4 mr-2" /> Print Job Card
              </Button>
              <Button onClick={() => setViewItem(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
