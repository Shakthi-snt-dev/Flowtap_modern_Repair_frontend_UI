import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Plus, Phone, User, Wrench, Calendar, DollarSign, Eye, RefreshCw,
  UserCheck, ChevronRight, ChevronLeft, Package, X, Play, Pause, Clock,
} from 'lucide-react'
import { useAppSelector } from '@flowtap/store'
import { ticketsApi } from '@flowtap/api-core'
import { inventoryApi } from '@flowtap/api-core'
import { employeesApi } from '@flowtap/api-core'
import {
  Button, Input, Select, Modal, Badge,
  SearchInput, Spinner, EmptyState, ImageUpload,
} from '@flowtap/ui-core'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ticket {
  id: string
  ticketNumber: string
  status: string
  customerName: string
  customerPhone: string
  brand: string
  model: string
  problem: string
  createdAt: string
  technician: string | null
  estimatedCost: number
  isTimerRunning: boolean
  totalTimeSpentSeconds: number
}

interface DeviceBrand { id: string; name: string }
interface DeviceModel { id: string; name: string; brandId: string }
interface EmployeeOption { id: string; name: string; jobTitle?: string }

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, 'warning' | 'info' | 'success' | 'danger' | 'purple' | 'default'> = {
  Pending: 'warning',
  'In Progress': 'info',
  Completed: 'success',
  Cancelled: 'danger',
  'Waiting for Parts': 'purple',
  'Ready for Pickup': 'info',
}

const STATUS_TABS = ['All', 'Pending', 'In Progress', 'Waiting for Parts', 'Ready for Pickup', 'Completed', 'Cancelled']
const PAGE_SIZE = 6

const formatTimer = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s}s`
}

const mapStatusFromBackend = (s: string) => {
  const map: Record<string, string> = {
    'New': 'Pending',
    'InProgress': 'In Progress',
    'Done': 'Completed',
    'Canceled': 'Cancelled',
    'WaitingForParts': 'Waiting for Parts',
    'Ready': 'Ready for Pickup',
  }
  return map[s] || s
}

const mapStatusToBackend = (s: string) => {
  const map: Record<string, string> = {
    'Pending': 'New',
    'In Progress': 'InProgress',
    'Completed': 'Done',
    'Cancelled': 'Canceled',
    'Waiting for Parts': 'WaitingForParts',
    'Ready for Pickup': 'Ready',
  }
  return map[s] || s
}

// ─── New Ticket Modal ──────────────────────────────────────────────────────────

interface NewTicketForm {
  // Step 1 – customer
  customerName: string
  customerPhone: string
  customerEmail: string
  // Step 2 – device
  brandId: string
  modelId: string
  problem: string
  appearance: string
  equipment: string
  password: string
  priority: string
  deadline: string
  deviceImageUrl: string
  // Step 3 – financials
  estimatedCost: string
  advanceCollected: string
  technicianId: string
  reason: string
}

const defaultForm: NewTicketForm = {
  customerName: '', customerPhone: '', customerEmail: '',
  brandId: '', modelId: '', problem: '', appearance: '', equipment: '', password: '',
  priority: 'Medium', deadline: '', deviceImageUrl: '',
  estimatedCost: '', advanceCollected: '', technicianId: '', reason: '',
}

interface NewTicketModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  tenantId: string
  storeId?: string | null
  brands: DeviceBrand[]
  employees: EmployeeOption[]
}

const NewTicketModal: React.FC<NewTicketModalProps> = ({
  open, onClose, onCreated, tenantId, storeId, brands, employees,
}) => {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<NewTicketForm>(defaultForm)
  const [models, setModels] = useState<DeviceModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Load models when brand changes
  useEffect(() => {
    if (!form.brandId) { setModels([]); return }
    setModelsLoading(true)
    inventoryApi
      .getDeviceModels({ brandId: form.brandId })
      .then((res) => {
        const raw = res.data?.data ?? res.data ?? []
        setModels((Array.isArray(raw) ? raw : []).map((m: Record<string, unknown>) => ({
          id: String(m.id),
          name: String(m.name ?? ''),
          brandId: form.brandId,
        })))
      })
      .catch(() => setModels([]))
      .finally(() => setModelsLoading(false))
  }, [form.brandId])

  const set = (field: keyof NewTicketForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm((f) => ({ ...f, brandId: e.target.value, modelId: '' }))
  }

  const handleClose = () => { setStep(1); setForm(defaultForm); onClose() }

  const handleSubmit = async () => {
    if (!form.problem.trim()) { toast.error('Problem description is required'); return }
    setSubmitting(true)
    try {
      await ticketsApi.createTicket({
        companyId: tenantId,
        locationId: storeId ?? undefined,
        clientName: form.customerName,
        clientPhone: form.customerPhone,
        clientEmail: form.customerEmail,
        deviceBrandId: form.brandId || undefined,
        deviceModelId: form.modelId || undefined,
        problemDescription: form.problem,
        estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : undefined,
        technicianEmployeeId: form.technicianId || undefined,
        priorityLevel: form.priority,
        appearance: form.appearance || undefined,
        password: form.password || undefined,
        equipment: form.equipment || undefined,
        deadline: form.deadline || undefined,
        reason: form.reason || undefined,
      })
      toast.success('Ticket created successfully')
      onCreated()
      handleClose()
    } catch {
      toast.error('Failed to create ticket')
    } finally {
      setSubmitting(false)
    }
  }

  const brandOptions = brands.map((b) => ({ value: b.id, label: b.name }))
  const modelOptions = models.map((m) => ({ value: m.id, label: m.name }))
  const priorityOptions = ['Low', 'Medium', 'High', 'Urgent'].map((p) => ({ value: p, label: p }))
  const techOptions = [
    { value: '', label: 'Unassigned' },
    ...employees.map((e) => ({ value: e.id, label: e.name + (e.jobTitle ? ` — ${e.jobTitle}` : '') })),
  ]

  const stepTitles = ['Customer Info', 'Device & Condition', 'Diagnosis & Financials']

  return (
    <Modal open={open} onClose={handleClose} title="New Service Ticket" size="lg"
      footer={
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={step === 1 ? handleClose : () => setStep((s) => s - 1)}
            icon={step > 1 ? <ChevronLeft className="w-4 h-4" /> : undefined}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`w-2 h-2 rounded-full transition-colors ${
                s === step ? 'bg-blue-600' : s < step ? 'bg-blue-300' : 'bg-gray-200 dark:bg-gray-600'
              }`} />
            ))}
          </div>
          {step < 3 ? (
            <Button onClick={() => {
              if (step === 1 && !form.customerName.trim()) { toast.error('Customer name is required'); return }
              setStep((s) => s + 1)
            }} icon={<ChevronRight className="w-4 h-4" />}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} loading={submitting}>Create Ticket</Button>
          )}
        </div>
      }
    >
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Step {step} of 3 — {stepTitles[step - 1]}</p>

      {step === 1 && (
        <div className="space-y-4">
          <Input label="Customer Name *" value={form.customerName} onChange={set('customerName')} placeholder="Full name" />
          <Input label="Phone *" value={form.customerPhone} onChange={set('customerPhone')} placeholder="+91 XXXXX XXXXX" />
          <Input label="Email (optional)" value={form.customerEmail} onChange={set('customerEmail')} placeholder="customer@email.com" type="email" />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Brand" value={form.brandId} onChange={handleBrandChange}
              options={brandOptions} placeholder="Select brand" />
            <div>
              <Select
                label={`Model${modelsLoading ? ' (loading…)' : ''}`}
                value={form.modelId}
                onChange={set('modelId')}
                options={modelOptions}
                placeholder={form.brandId ? 'Select model' : 'Select brand first'}
                disabled={!form.brandId || modelsLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Device Password" value={form.password} onChange={set('password')} placeholder="Pattern or PIN" />
            <Input label="Appearance" value={form.appearance} onChange={set('appearance')} placeholder="e.g. Scratches on back" />
          </div>

          <Input label="Equipment Left" value={form.equipment} onChange={set('equipment')} placeholder="e.g. Case, Charger, SIM card" />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Problem Description *</label>
            <textarea
              value={form.problem} onChange={set('problem')} rows={2}
              placeholder="Describe the issue..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Priority" value={form.priority} onChange={set('priority')} options={priorityOptions} />
            <Input label="Deadline" type="date" value={form.deadline} onChange={set('deadline')} />
          </div>

          <ImageUpload
            value={form.deviceImageUrl}
            onChange={(url) => setForm((f) => ({ ...f, deviceImageUrl: url }))}
            label="Device Photo (optional)"
            folder="tickets"
          />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Internal Diagnosis / Notes</label>
            <textarea
              value={form.reason} onChange={set('reason')} rows={2}
              placeholder="Technician notes..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Estimated Cost (₹)" value={form.estimatedCost} onChange={set('estimatedCost')} type="number" placeholder="0.00" />
            <Input label="Advance Collected (₹)" value={form.advanceCollected} onChange={set('advanceCollected')} type="number" placeholder="0.00" />
          </div>

          <Select
            label="Assign Technician"
            value={form.technicianId}
            onChange={set('technicianId')}
            options={techOptions}
          />
        </div>
      )}
    </Modal>
  )
}

// ─── Update Status Modal ───────────────────────────────────────────────────────

interface UpdateStatusModalProps {
  ticket: Ticket | null
  onClose: () => void
  onUpdated: (id: string, status: string) => void
}

const UpdateStatusModal: React.FC<UpdateStatusModalProps> = ({ ticket, onClose, onUpdated }) => {
  const [status, setStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (ticket) { setStatus(ticket.status); setNotes('') } }, [ticket])

  const statusOptions = Object.keys(STATUS_COLORS).map((s) => ({ value: s, label: s }))

  const handleSave = async () => {
    if (!ticket) return
    setSaving(true)
    try {
      const backendStatus = mapStatusToBackend(status)
      await ticketsApi.updateStatus(ticket.id, backendStatus, notes)
      onUpdated(ticket.id, status)
      toast.success('Status updated')
      onClose()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!ticket} onClose={onClose} title="Update Ticket Status" size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ticket</p>
          <p className="font-semibold text-gray-900 dark:text-white">{ticket?.ticketNumber}</p>
        </div>
        <Select label="New Status" value={status} onChange={(e) => setStatus(e.target.value)} options={statusOptions} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes (optional)</label>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Add a note..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-500"
          />
        </div>
      </div>
    </Modal>
  )
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────

interface AssignModalProps {
  ticket: Ticket | null
  onClose: () => void
  onAssigned: (id: string, technicianName: string) => void
  employees: EmployeeOption[]
}

const AssignModal: React.FC<AssignModalProps> = ({ ticket, onClose, onAssigned, employees }) => {
  const [employeeId, setEmployeeId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (ticket) setEmployeeId('') }, [ticket])

  const techOptions = employees.map((e) => ({
    value: e.id,
    label: e.name + (e.jobTitle ? ` — ${e.jobTitle}` : ''),
  }))

  const handleAssign = async () => {
    if (!ticket || !employeeId) { toast.error('Select a technician'); return }
    setSaving(true)
    try {
      await ticketsApi.assignTicket(ticket.id, employeeId)
      const emp = employees.find((e) => e.id === employeeId)
      onAssigned(ticket.id, emp?.name ?? employeeId)
      toast.success(`Assigned to ${emp?.name ?? 'technician'}`)
      onClose()
    } catch {
      toast.error('Failed to assign technician')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!ticket} onClose={onClose} title="Assign Technician" size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} loading={saving} disabled={!employeeId}>Assign</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ticket</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {ticket?.ticketNumber} — {ticket?.customerName}
          </p>
        </div>
        <Select
          label="Technician"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          options={techOptions}
          placeholder="Select technician"
        />
      </div>
    </Modal>
  )
}

// ─── Ticket Detail Modal ──────────────────────────────────────────────────────

interface TicketDetailFull extends Ticket {
  locationId?: string
  customerEmail?: string
  appearance?: string
  equipment?: string
  devicePassword?: string
  priority?: string
  deadline?: string
  advanceCollected?: number
  reason?: string
  deviceImageUrl?: string
  parts?: { id: string; productName: string; quantity: number; unitPrice: number }[]
}

interface TicketDetailModalProps {
  ticketId: string | null
  onClose: () => void
  tenantId: string
  employees: EmployeeOption[]
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ ticketId, onClose, tenantId, employees }) => {
  const [detail, setDetail] = useState<TicketDetailFull | null>(null)
  const [loading, setLoading] = useState(false)
  const [addPartOpen, setAddPartOpen] = useState(false)
  const [products, setProducts] = useState<{ id: string; name: string; price: number }[]>([])
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([])
  const [partForm, setPartForm] = useState({ productId: '', warehouseId: '', quantity: '1', unitPrice: '' })
  const [addingPart, setAddingPart] = useState(false)

  // Tasks state
  const [tasks, setTasks] = useState<any[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assigneeId: '', priority: 'Medium', deadline: '' })
  const [addingTask, setAddingTask] = useState(false)

  const loadTasks = useCallback(() => {
    if (!ticketId || !tenantId) return
    setLoadingTasks(true)
    ticketsApi.getTasks({ companyId: tenantId, ticketId })
      .then((res) => {
        const raw = res.data?.data ?? res.data ?? []
        setTasks(Array.isArray(raw) ? raw : [])
      })
      .catch(() => setTasks([]))
      .finally(() => setLoadingTasks(false))
  }, [ticketId, tenantId])

  const loadDetail = useCallback(() => {
    if (!ticketId) return
    setLoading(true)
    ticketsApi.getTicket(ticketId)
      .then((res) => {
        const t = res.data.data ?? res.data
        setDetail({
          id: String(t.id),
          locationId: t.locationId ? String(t.locationId) : undefined,
          ticketNumber: String(t.ticketNumber ?? t.id),
          status: mapStatusFromBackend(String(t.status ?? 'New')),
          customerName: String(t.clientName ?? t.customerName ?? 'Walk-in'),
          customerPhone: String(t.clientPhone ?? t.customerPhone ?? ''),
          customerEmail: t.clientEmail ? String(t.clientEmail) : undefined,
          brand: String(t.deviceBrand ?? t.brandName ?? ''),
          model: String(t.deviceModel ?? t.modelName ?? ''),
          problem: String(t.problemDescription ?? t.problem ?? ''),
          createdAt: String(t.createdAt ?? ''),
          technician: t.technicianName ? String(t.technicianName) : null,
          estimatedCost: Number(t.estimatedCost ?? 0),
          appearance: t.appearance ? String(t.appearance) : undefined,
          equipment: t.equipment ? String(t.equipment) : undefined,
          devicePassword: t.password ? String(t.password) : undefined,
          priority: t.priorityLevel ? String(t.priorityLevel) : undefined,
          deadline: t.deadline ? new Date(String(t.deadline)).toLocaleDateString('en-IN') : undefined,
          advanceCollected: t.advanceCollected ? Number(t.advanceCollected) : undefined,
          reason: t.reason ? String(t.reason) : undefined,
          deviceImageUrl: t.deviceImageUrl ? String(t.deviceImageUrl) : undefined,
          parts: Array.isArray(t.parts) ? t.parts.map((p: Record<string, unknown>) => ({
            id: String(p.id),
            productName: String(p.productName ?? p.name ?? ''),
            quantity: Number(p.quantity ?? 1),
            unitPrice: Number(p.unitPrice ?? p.price ?? 0),
          })) : [],
          isTimerRunning: Boolean(t.isTimerRunning),
          totalTimeSpentSeconds: Number(t.totalTimeSpentSeconds ?? 0),
        })
      })
      .catch(() => toast.error('Failed to load ticket details'))
      .finally(() => setLoading(false))
  }, [ticketId])

  useEffect(() => {
    if (ticketId) {
      loadDetail()
      loadTasks()
      setAddPartOpen(false)
      setAddTaskOpen(false)
    } else {
      setDetail(null)
      setTasks([])
    }
  }, [ticketId, loadDetail, loadTasks])

  // Load products + warehouses only when Add Part section opens
  useEffect(() => {
    if (!addPartOpen || !tenantId) return
    inventoryApi.getProducts({ companyId: tenantId, pageSize: 200 })
      .then((res) => {
        const raw = res.data.data?.items ?? res.data.data ?? []
        setProducts((Array.isArray(raw) ? raw : []).map((p: Record<string, unknown>) => ({
          id: String(p.id), name: String(p.name ?? ''),
          price: Number(p.defaultSalePrice ?? p.salePrice ?? p.price ?? 0),
        })))
      }).catch(() => {})
    inventoryApi.getWarehouses({ companyId: tenantId })
      .then((res) => {
        const raw = res.data.data?.items ?? res.data.data ?? []
        setWarehouses((Array.isArray(raw) ? raw : []).map((w: Record<string, unknown>) => ({
          id: String(w.id), name: String(w.name ?? ''),
        })))
      }).catch(() => {})
  }, [addPartOpen, tenantId])

  // Auto-fill unit price when product is selected
  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const p = products.find((x) => x.id === e.target.value)
    setPartForm((f) => ({ ...f, productId: e.target.value, unitPrice: p ? String(p.price) : f.unitPrice }))
  }

  const handleAddPart = async () => {
    if (!ticketId || !partForm.productId || !partForm.warehouseId) {
      toast.error('Select a product and warehouse')
      return
    }
    setAddingPart(true)
    try {
      await ticketsApi.addPart(ticketId, {
        productId: partForm.productId,
        warehouseId: partForm.warehouseId,
        quantity: Number(partForm.quantity) || 1,
        unitPrice: Number(partForm.unitPrice) || 0,
      })
      toast.success('Part added to ticket')
      setPartForm({ productId: '', warehouseId: '', quantity: '1', unitPrice: '' })
      setAddPartOpen(false)
      loadDetail() // refresh parts list
    } catch {
      toast.error('Failed to add part')
    } finally {
      setAddingPart(false)
    }
  }

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Done' ? 'New' : 'Done'
    try {
      await ticketsApi.updateTaskStatus(taskId, newStatus)
      toast.success('Task status updated')
      loadTasks()
    } catch {
      toast.error('Failed to update task status')
    }
  }

  const handleToggleTicketTimer = async () => {
    if (!ticketId) return
    try {
      await ticketsApi.toggleTicketTimer(ticketId)
      toast.success('Ticket timer toggled')
      loadDetail()
    } catch {
      toast.error('Failed to toggle ticket timer')
    }
  }

  const handleToggleTaskTimer = async (taskId: string) => {
    try {
      await ticketsApi.toggleTaskTimer(taskId)
      toast.success('Task timer toggled')
      loadTasks()
    } catch {
      toast.error('Failed to toggle task timer')
    }
  }

  const handleAddTask = async () => {
    if (!ticketId || !taskForm.title.trim() || !taskForm.assigneeId) {
      toast.error('Enter a task title and assignee')
      return
    }
    setAddingTask(true)
    try {
      await ticketsApi.createTask({
        locationId: detail?.locationId || undefined,
        authorEmployeeId: employees[0]?.id || undefined,
        assigneeEmployeeId: taskForm.assigneeId,
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        priority: taskForm.priority,
        deadline: taskForm.deadline ? new Date(taskForm.deadline).toISOString() : undefined,
        ticketId: ticketId || undefined,  // null when task has no linked ticket
        tags: [],
      })
      toast.success('Task created successfully')
      setTaskForm({ title: '', description: '', assigneeId: '', priority: 'Medium', deadline: '' })
      setAddTaskOpen(false)
      loadTasks()
    } catch {
      toast.error('Failed to create task')
    } finally {
      setAddingTask(false)
    }
  }

  const productOptions = products.map((p) => ({ value: p.id, label: p.name }))
  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name }))

  return (
    <Modal open={!!ticketId} onClose={onClose} title={detail ? `Ticket ${detail.ticketNumber}` : 'Ticket Details'} size="lg">
      {loading || !detail ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="space-y-5">
          {/* Status + header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={STATUS_COLORS[detail.status] ?? 'default'}>{detail.status}</Badge>
              <button onClick={handleToggleTicketTimer} className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                {detail.isTimerRunning ? <Pause className="w-3.5 h-3.5 text-orange-500" /> : <Play className="w-3.5 h-3.5 text-green-500" />}
                <span className={`text-xs font-medium ${detail.isTimerRunning ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300'}`}>
                  {formatTimer(detail.totalTimeSpentSeconds)}
                </span>
              </button>
            </div>
            <span className="text-xs text-gray-400">
              {detail.createdAt ? new Date(detail.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : ''}
            </span>
          </div>

          {/* Customer + device grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Customer</p>
              <p className="font-medium text-gray-900 dark:text-white">{detail.customerName}</p>
              {detail.customerPhone && <p className="text-sm text-gray-500">{detail.customerPhone}</p>}
              {detail.customerEmail && <p className="text-sm text-gray-500">{detail.customerEmail}</p>}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Device</p>
              <p className="font-medium text-gray-900 dark:text-white">{[detail.brand, detail.model].filter(Boolean).join(' ') || '—'}</p>
              {detail.appearance && <p className="text-sm text-gray-500">Condition: {detail.appearance}</p>}
              {detail.equipment && <p className="text-sm text-gray-500">Equipment: {detail.equipment}</p>}
              {detail.devicePassword && <p className="text-sm text-gray-500">Password: {detail.devicePassword}</p>}
            </div>
          </div>

          {/* Problem */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Problem Description</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">{detail.problem}</p>
          </div>

          {/* Financials row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Estimated Cost', value: detail.estimatedCost ? `₹${detail.estimatedCost.toLocaleString()}` : '—' },
              { label: 'Advance', value: detail.advanceCollected ? `₹${detail.advanceCollected.toLocaleString()}` : '—' },
              { label: 'Technician', value: detail.technician ?? 'Unassigned' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
              </div>
            ))}
          </div>

          {detail.reason && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Diagnosis / Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">{detail.reason}</p>
            </div>
          )}

          {/* Parts used */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Parts Used ({detail.parts?.length ?? 0})</p>
              <button
                onClick={() => setAddPartOpen((v) => !v)}
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Package className="w-3.5 h-3.5" />
                {addPartOpen ? 'Cancel' : '+ Add Part'}
              </button>
            </div>

            {detail.parts && detail.parts.length > 0 && (
              <div className="rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Part</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {detail.parts.map((part) => (
                      <tr key={part.id}>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{part.productName}</td>
                        <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{part.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">₹{part.unitPrice.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">₹{(part.quantity * part.unitPrice).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {addPartOpen && (
              <div className="mt-3 p-4 border border-blue-200 dark:border-blue-800 rounded-xl bg-blue-50 dark:bg-blue-900/10 space-y-3">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Add Part / Component</p>
                <div className="grid grid-cols-2 gap-3">
                  <Select label="Product" value={partForm.productId} onChange={handleProductChange}
                    options={productOptions} placeholder="Select product" />
                  <Select label="Warehouse" value={partForm.warehouseId}
                    onChange={(e) => setPartForm((f) => ({ ...f, warehouseId: e.target.value }))}
                    options={warehouseOptions} placeholder="Select warehouse" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Quantity" type="number" value={partForm.quantity} min="1"
                    onChange={(e) => setPartForm((f) => ({ ...f, quantity: e.target.value }))} />
                  <Input label="Unit Price (₹)" type="number" value={partForm.unitPrice}
                    onChange={(e) => setPartForm((f) => ({ ...f, unitPrice: e.target.value }))} />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleAddPart} loading={addingPart} size="sm"
                    icon={<Package className="w-3.5 h-3.5" />}>
                    Add Part
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Tasks & Checklist */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Tasks & Checklist ({tasks.length})</p>
              <button
                onClick={() => setAddTaskOpen((v) => !v)}
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                {addTaskOpen ? 'Cancel' : '+ Add Task'}
              </button>
            </div>

            {loadingTasks ? (
              <div className="flex justify-center py-4"><Spinner /></div>
            ) : tasks.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">No tasks created yet.</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => {
                  const assignee = employees.find((e) => e.id === task.assigneeEmployeeId)
                  return (
                    <div key={task.id} className="flex items-start justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:border-gray-200 transition-colors">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={task.status === 'Done'}
                          onChange={() => handleToggleTaskStatus(task.id, task.status)}
                          className="mt-1 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <p className={`text-sm font-medium ${task.status === 'Done' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              Tech: {assignee?.name ?? 'Unknown'}
                            </span>
                            {task.deadline && (
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                Due: {new Date(task.deadline).toLocaleDateString('en-IN')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={task.priority === 'Urgent' || task.priority === 'High' ? 'danger' : task.priority === 'Medium' ? 'warning' : 'info'}>
                          {task.priority}
                        </Badge>
                        <button onClick={() => handleToggleTaskTimer(task.id)} className="flex items-center justify-center p-1.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                          {task.isTimerRunning ? <Pause className="w-3.5 h-3.5 text-orange-500" /> : <Play className="w-3.5 h-3.5 text-green-500" />}
                        </button>
                        {(task.totalTimeSpentSeconds > 0 || task.isTimerRunning) && (
                          <span className="text-[10px] font-medium text-gray-500">
                            {formatTimer(task.totalTimeSpentSeconds)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {addTaskOpen && (
              <div className="mt-3 p-4 border border-blue-200 dark:border-blue-800 rounded-xl bg-blue-50 dark:bg-blue-900/10 space-y-3">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Create New Task</p>
                <div className="space-y-3">
                  <Input label="Task Title *" value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Test touch responsiveness" />
                  <Input label="Description (optional)" value={taskForm.description} onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. Ensure all screen corners are functioning" />
                  <div className="grid grid-cols-3 gap-3">
                    <Select label="Assignee *" value={taskForm.assigneeId} onChange={(e) => setTaskForm((f) => ({ ...f, assigneeId: e.target.value }))} options={employees.map(e => ({ value: e.id, label: e.name }))} placeholder="Select tech" />
                    <Select label="Priority" value={taskForm.priority} onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))} options={['Low', 'Medium', 'High', 'Urgent'].map(p => ({ value: p, label: p }))} />
                    <Input label="Due Date" type="date" value={taskForm.deadline} onChange={(e) => setTaskForm((f) => ({ ...f, deadline: e.target.value }))} />
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button onClick={handleAddTask} loading={addingTask} size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                      Create Task
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────

interface TicketCardProps {
  ticket: Ticket
  onView: (ticket: Ticket) => void
  onUpdateStatus: (ticket: Ticket) => void
  onAssign: (ticket: Ticket) => void
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket, onView, onUpdateStatus, onAssign }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col gap-3">
    {/* Top row */}
    <div className="flex items-start justify-between gap-2">
      <span className="font-bold text-gray-900 dark:text-white text-sm">{ticket.ticketNumber}</span>
      <Badge variant={STATUS_COLORS[ticket.status] ?? 'default'}>{ticket.status}</Badge>
    </div>

    {/* Customer */}
    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {ticket.customerName}</span>
      {ticket.customerPhone && (
        <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {ticket.customerPhone}</span>
      )}
    </div>

    {/* Device */}
    {(ticket.brand || ticket.model) && (
      <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-200">
        <Wrench className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-medium">{[ticket.brand, ticket.model].filter(Boolean).join(' ')}</span>
      </div>
    )}

    {/* Problem */}
    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{ticket.problem}</p>

    {/* Bottom info */}
    <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
      {ticket.createdAt && (
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {new Date(ticket.createdAt).toLocaleDateString('en-IN')}
        </span>
      )}
      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {ticket.technician ?? 'Unassigned'}</span>
      {ticket.estimatedCost > 0 && (
        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> ₹{ticket.estimatedCost.toLocaleString()}</span>
      )}
    </div>

    {/* Actions */}
    <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
      <Button size="sm" variant="ghost" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => onView(ticket)}>View</Button>
      <Button size="sm" variant="ghost" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => onUpdateStatus(ticket)}>
        Status
      </Button>
      <Button size="sm" variant="ghost" icon={<UserCheck className="w-3.5 h-3.5" />} onClick={() => onAssign(ticket)}>
        Assign
      </Button>
    </div>
  </div>
)

// ─── Main Page ────────────────────────────────────────────────────────────────

export const TicketsPage: React.FC = () => {
  const navigate = useNavigate()
  const tenant = useAppSelector((s) => s.tenant.tenant)
  const currentStoreId = useAppSelector((s) => s.tenant.currentStoreId)

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('All')
  const [page, setPage] = useState(1)
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [viewTicketId, setViewTicketId] = useState<string | null>(null)
  const [updateTicket, setUpdateTicket] = useState<Ticket | null>(null)
  const [assignTicket, setAssignTicket] = useState<Ticket | null>(null)

  // Lookup data
  const [brands, setBrands] = useState<DeviceBrand[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])

  // ── Load lookup data ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tenant?.id) return
    // Brands
    inventoryApi.getDeviceBrands()
      .then((res) => {
        const raw = res.data?.data ?? res.data ?? []
        setBrands((Array.isArray(raw) ? raw : []).map((b: Record<string, unknown>) => ({
          id: String(b.id), name: String(b.name ?? ''),
        })))
      })
      .catch(() => setBrands([]))

    // Employees (active only)
    employeesApi.getEmployees({ companyId: tenant.id, isActive: true, pageSize: 200 })
      .then((res) => {
        const raw = res.data?.data?.items ?? res.data?.data ?? res.data ?? []
        setEmployees((Array.isArray(raw) ? raw : []).map((e: Record<string, unknown>) => ({
          id: String(e.id),
          name: String(e.name ?? ''),
          jobTitle: e.jobTitle ? String(e.jobTitle) : undefined,
        })))
      })
      .catch(() => setEmployees([]))
  }, [tenant?.id])

  // ── Load tickets ──────────────────────────────────────────────────────────────
  const loadTickets = useCallback(() => {
    if (!tenant?.id) return
    setLoading(true)
    ticketsApi
      .getTickets({ companyId: tenant.id, locationId: currentStoreId ?? undefined, status: activeTab === 'All' ? undefined : mapStatusToBackend(activeTab) })
      .then((res) => {
        const data = res.data.data?.items ?? res.data.data ?? res.data ?? []
        setTickets(Array.isArray(data) ? data.map((t: Record<string, unknown>) => ({
          id: String(t.id),
          ticketNumber: String(t.ticketNumber ?? t.id),
          status: mapStatusFromBackend(String(t.status ?? 'New')),
          customerName: String(t.clientName ?? t.customerName ?? 'Walk-in'),
          customerPhone: String(t.clientPhone ?? t.customerPhone ?? ''),
          brand: String(t.deviceBrand ?? t.brandName ?? ''),
          model: String(t.deviceModel ?? t.modelName ?? ''),
          problem: String(t.problemDescription ?? t.problem ?? ''),
          createdAt: String(t.createdAt ?? ''),
          technician: t.technicianName ? String(t.technicianName) : null,
          estimatedCost: Number(t.estimatedCost ?? 0),
          isTimerRunning: Boolean(t.isTimerRunning ?? false),
          totalTimeSpentSeconds: Number(t.totalTimeSpentSeconds ?? 0),
        })) : [])
      })
      .catch(() => { toast.error('Failed to load tickets'); setTickets([]) })
      .finally(() => setLoading(false))
  }, [tenant?.id, currentStoreId, activeTab])

  useEffect(() => { loadTickets() }, [loadTickets])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return tickets
    return tickets.filter(
      (t) =>
        t.ticketNumber.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.customerPhone.includes(q) ||
        t.problem.toLowerCase().includes(q)
    )
  }, [tickets, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleStatusUpdated = (id: string, status: string) =>
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))

  const handleAssigned = (id: string, technicianName: string) =>
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, technician: technicianName } : t)))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Service Tickets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {filtered.length} ticket{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setNewModalOpen(true)}>New Ticket</Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setPage(1) }}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <SearchInput
        value={search}
        onChange={(v) => { setSearch(v); setPage(1) }}
        placeholder="Search by ticket # or customer name…"
        className="max-w-md"
      />

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : paginated.length === 0 ? (
        <EmptyState
          title="No tickets found"
          description={search ? 'Try a different search term' : 'Create your first service ticket'}
          action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setNewModalOpen(true)}>New Ticket</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onView={(t) => navigate(`/tickets/${t.id}`)}
                onUpdateStatus={setUpdateTicket}
                onAssign={setAssignTicket}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-300 px-2">
                Page {page} of {totalPages}
              </span>
              <Button size="sm" variant="outline" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <TicketDetailModal
        ticketId={viewTicketId}
        onClose={() => setViewTicketId(null)}
        tenantId={tenant?.id ?? ''}
        employees={employees}
      />
      <NewTicketModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onCreated={loadTickets}
        tenantId={tenant?.id ?? ''}
        storeId={currentStoreId}
        brands={brands}
        employees={employees}
      />
      <UpdateStatusModal
        ticket={updateTicket}
        onClose={() => setUpdateTicket(null)}
        onUpdated={handleStatusUpdated}
      />
      <AssignModal
        ticket={assignTicket}
        onClose={() => setAssignTicket(null)}
        onAssigned={handleAssigned}
        employees={employees}
      />
    </div>
  )
}
