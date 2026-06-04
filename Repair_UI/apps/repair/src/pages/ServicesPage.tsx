import React, { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Plus, Pencil, Clock, Tag, FileText } from 'lucide-react'
import { useAppSelector } from '@flowtap/store'
import { ticketsApi } from '@flowtap/api-core'
import {
  Button,
  Input,
  Select,
  Modal,
  Badge,
  SearchInput,
  Spinner,
  EmptyState,
} from '@flowtap/ui-core'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Service {
  id: string
  name: string
  category: string
  price: number
  duration: number
  isActive: boolean
  description: string
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: 'Hardware', label: 'Hardware' },
  { value: 'Software', label: 'Software' },
  { value: 'Diagnostics', label: 'Diagnostics' },
  { value: 'Accessories', label: 'Accessories' },
  { value: 'Other', label: 'Other' },
]

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

interface ServiceForm {
  name: string
  category: string
  price: string
  duration: string
  description: string
  isActive: boolean
}

const defaultForm: ServiceForm = {
  name: '', category: 'Hardware', price: '', duration: '', description: '', isActive: true,
}

interface ServiceModalProps {
  open: boolean
  service: Service | null
  tenantId: string
  onClose: () => void
  onSaved: (service: Service) => void
}

const ServiceModal: React.FC<ServiceModalProps> = ({ open, service, tenantId, onClose, onSaved }) => {
  const [form, setForm] = useState<ServiceForm>(defaultForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (service) {
      setForm({
        name: service.name,
        category: service.category,
        price: String(service.price),
        duration: String(service.duration),
        description: service.description,
        isActive: service.isActive,
      })
    } else {
      setForm(defaultForm)
    }
  }, [service, open])

  const set = (field: keyof ServiceForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSave = async () => {
    if (!form.name || !form.price || !form.duration) {
      toast.error('Please fill in all required fields')
      return
    }
    setSaving(true)
    try {
      const payload = {
        companyId: tenantId,
        name: form.name,
        category: form.category,
        price: parseFloat(form.price),
        duration: parseInt(form.duration, 10),
        description: form.description || undefined,
        isActive: form.isActive,
      }
      let savedId = service?.id ?? ''
      if (service) {
        await ticketsApi.updateService(service.id, payload)
      } else {
        const res = await ticketsApi.createService(payload)
        savedId = res.data?.data?.id ?? crypto.randomUUID()
      }
      const saved: Service = {
        id: savedId,
        name: form.name,
        category: form.category,
        price: parseFloat(form.price),
        duration: parseInt(form.duration, 10),
        description: form.description,
        isActive: form.isActive,
      }
      onSaved(saved)
      toast.success(service ? 'Service updated' : 'Service added')
      onClose()
    } catch {
      toast.error('Failed to save service')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={service ? 'Edit Service' : 'Add Service'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{service ? 'Save Changes' : 'Add Service'}</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input label="Service Name *" value={form.name} onChange={set('name')} placeholder="e.g. Screen Replacement" />
        <Select label="Category" value={form.category} onChange={set('category')} options={CATEGORY_OPTIONS} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Price (₹) *" value={form.price} onChange={set('price')} type="number" placeholder="0" />
          <Input label="Duration (min) *" value={form.duration} onChange={set('duration')} type="number" placeholder="30" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={2}
            placeholder="Brief description of the service..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-500"
          />
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="sr-only"
            />
            <div className={`w-10 h-6 rounded-full transition-colors ${form.isActive ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
        </label>
      </div>
    </Modal>
  )
}

// ─── Service Card ─────────────────────────────────────────────────────────────

interface ServiceCardProps {
  service: Service
  onEdit: (service: Service) => void
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, onEdit }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex flex-col gap-3">
    <div className="flex items-start justify-between gap-2">
      <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">{service.name}</h3>
      <Badge variant={service.isActive ? 'success' : 'default'}>{service.isActive ? 'Active' : 'Inactive'}</Badge>
    </div>

    <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500 dark:text-gray-400">
      <span className="flex items-center gap-1">
        <Tag className="w-3 h-3" />
        {service.category}
      </span>
      <span className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {service.duration} min
      </span>
    </div>

    {service.description && (
      <p className="text-xs text-gray-400 dark:text-gray-500 flex items-start gap-1">
        <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
        {service.description}
      </p>
    )}

    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700 mt-auto">
      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">₹{service.price.toLocaleString()}</span>
      <Button size="sm" variant="outline" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => onEdit(service)}>
        Edit
      </Button>
    </div>
  </div>
)

// ─── Main Page ────────────────────────────────────────────────────────────────

export const ServicesPage: React.FC = () => {
  const tenant = useAppSelector((s) => s.tenant.tenant)

  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editService, setEditService] = useState<Service | null>(null)

  useEffect(() => {
    if (!tenant?.id) return
    setLoading(true)
    ticketsApi
      .getServices(tenant.id)
      .then((res) => {
        const data = res.data.data?.items ?? res.data.data ?? res.data ?? []
        setServices(Array.isArray(data) ? data.map((s: Record<string, unknown>) => ({
          id: String(s.id),
          name: String(s.name ?? ''),
          category: String(s.category ?? 'Hardware'),
          price: Number(s.price ?? 0),
          duration: Number(s.duration ?? 30),
          isActive: Boolean(s.isActive ?? true),
          description: String(s.description ?? ''),
        })) : [])
      })
      .catch(() => { toast.error('Failed to load services'); setServices([]) })
      .finally(() => setLoading(false))
  }, [tenant?.id])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return services.filter(
      (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
    )
  }, [services, search])

  const handleOpenAdd = () => {
    setEditService(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (service: Service) => {
    setEditService(service)
    setModalOpen(true)
  }

  const handleSaved = (saved: Service) => {
    setServices((prev) => {
      const exists = prev.find((s) => s.id === saved.id)
      return exists ? prev.map((s) => (s.id === saved.id ? saved : s)) : [saved, ...prev]
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Services</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{filtered.length} service{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={handleOpenAdd}>Add Service</Button>
      </div>

      {/* Search */}
      <SearchInput value={search} onChange={setSearch} placeholder="Search services…" className="max-w-md" />

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No services found"
          description={search ? 'Try a different search term' : 'Add your first service to get started'}
          action={<Button icon={<Plus className="w-4 h-4" />} onClick={handleOpenAdd}>Add Service</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((service) => (
            <ServiceCard key={service.id} service={service} onEdit={handleOpenEdit} />
          ))}
        </div>
      )}

      <ServiceModal
        open={modalOpen}
        service={editService}
        tenantId={tenant?.id ?? ''}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
