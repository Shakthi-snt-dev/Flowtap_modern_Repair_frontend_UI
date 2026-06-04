import React, { useState, useEffect, useCallback } from 'react'
import { Modal, Button, Input, Select, Spinner } from '@flowtap/ui-core'
import { ticketsApi } from '@flowtap/api-core'
import { inventoryApi } from '@flowtap/api-core'
import { clientsApi } from '@flowtap/api-core'
import { useAppSelector } from '@flowtap/store'
import { useCurrency } from '@flowtap/shared'
import { cn } from '@flowtap/shared'
import { User, UserPlus, ChevronRight, ChevronLeft, CheckCircle2, Package, Wrench } from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface POSService {
  id: string
  name: string
  description?: string
  basePrice: number
  isUniversal: boolean
  serviceCategoryId?: string
  tier?: string
}

interface SelectedPart {
  productId: string
  name: string
  qty: number
  price: number
  warehouseId: string
}

interface Client {
  id: string
  name: string
  phone?: string
  email?: string
}

interface Props {
  open: boolean
  onClose: () => void
  selectedServices: POSService[]
  deviceBrand?: string
  deviceModel?: string
  deviceModelId?: string
  onTicketCreated: (ticketId: string, ticketNumber: string) => void
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const StepIndicator: React.FC<{ step: number; total: number; labels: string[] }> = ({ step, total, labels }) => (
  <div className="flex items-center gap-1 mb-6">
    {labels.map((label, i) => (
      <React.Fragment key={i}>
        <div className="flex flex-col items-center gap-1">
          <div
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
              i < step
                ? 'bg-green-500 text-white'
                : i === step
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            )}
          >
            {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
          </div>
          <span className={cn('text-[10px] font-medium whitespace-nowrap', i === step ? 'text-blue-600' : 'text-gray-400')}>
            {label}
          </span>
        </div>
        {i < total - 1 && (
          <div className={cn('flex-1 h-px mx-1 mb-4', i < step ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700')} />
        )}
      </React.Fragment>
    ))}
  </div>
)

// ─── Main component ───────────────────────────────────────────────────────────

export const RepairTicketWizard: React.FC<Props> = ({
  open,
  onClose,
  selectedServices,
  deviceBrand,
  deviceModel,
  deviceModelId,
  onTicketCreated,
}) => {
  const tenant          = useAppSelector((s) => s.tenant.tenant)
  const currentStoreId  = useAppSelector((s) => s.tenant.currentStoreId)
  const { format }      = useCurrency()

  // ── Step ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0)
  const STEPS = ['Customer & Device', 'Spare Parts', 'Review & Create']

  // ── Step 1 state ──────────────────────────────────────────────────────────
  const [clientId, setClientId]           = useState<string | null>(null)
  const [clientName, setClientName]       = useState('')
  const [clientPhone, setClientPhone]     = useState('')
  const [clientSearch, setClientSearch]   = useState('')
  const [clientResults, setClientResults] = useState<Client[]>([])
  const [searchingClients, setSearchingClients] = useState(false)

  const [deviceSerial, setDeviceSerial]   = useState('')
  const [reason, setReason]               = useState('')
  const [appearance, setAppearance]       = useState('')
  const [equipment, setEquipment]         = useState('')
  const [password, setPassword]           = useState('')
  const [priority, setPriority]           = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium')
  const [technicianId, setTechnicianId]   = useState('')
  const [employees, setEmployees]         = useState<{ id: string; name: string }[]>([])

  // ── Step 2 state ──────────────────────────────────────────────────────────
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([])
  const [suggestedProducts, setSuggestedProducts] = useState<Record<string, any[]>>({})
  const [loadingSuggested, setLoadingSuggested] = useState(false)
  const [warehouses, setWarehouses]       = useState<{ id: string; name: string }[]>([])
  const [partSearch, setPartSearch]       = useState('')
  const [partSearchResults, setPartSearchResults] = useState<any[]>([])
  const [searchingParts, setSearchingParts] = useState(false)

  // ── Step 3 state ──────────────────────────────────────────────────────────
  const [advanceAmount, setAdvanceAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [creating, setCreating]           = useState(false)

  // ── Load employees & warehouses on mount ──────────────────────────────────
  useEffect(() => {
    if (!open || !tenant?.id) return
    import('@flowtap/api-core').then((mod) => {
      mod.employeesApi.getEmployees({ companyId: tenant.id!, isActive: true, pageSize: 200 })
        .then((res) => {
          const raw = res.data?.data?.items ?? res.data?.data ?? []
          const emps = (Array.isArray(raw) ? raw : []).map((e: any) => ({
            id: String(e.id),
            name: String(e.name ?? ''),
          }))
          setEmployees(emps)
          if (emps.length > 0 && !technicianId) setTechnicianId(emps[0].id)
        })
        .catch(() => {})
    }).catch(() => {})

    inventoryApi.getWarehouses({ companyId: tenant.id })
      .then((res) => {
        const raw = res.data?.data?.items ?? res.data?.data ?? []
        setWarehouses((Array.isArray(raw) ? raw : []).map((w: any) => ({ id: String(w.id), name: String(w.name ?? '') })))
      })
      .catch(() => {})
  }, [open, tenant?.id])

  // ── Reset when wizard opens ────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setStep(0)
      setClientId(null)
      setClientName('')
      setClientPhone('')
      setClientSearch('')
      setClientResults([])
      setDeviceSerial('')
      setReason('')
      setAppearance('')
      setEquipment('')
      setPassword('')
      setPriority('Medium')
      setSelectedParts([])
      setSuggestedProducts({})
      setAdvanceAmount('')
      setPaymentMethod('Cash')
    }
  }, [open])

  // ── Client search ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!clientSearch.trim() || !tenant?.id) { setClientResults([]); return }
    const timer = setTimeout(() => {
      setSearchingClients(true)
      clientsApi.getClients({ companyId: tenant.id!, search: clientSearch, pageSize: 10 })
        .then((res) => {
          const raw = res.data?.data?.items ?? res.data?.data ?? []
          setClientResults((Array.isArray(raw) ? raw : []).map((c: any) => ({
            id: String(c.id),
            name: String(c.name ?? ''),
            phone: c.phone ? String(c.phone) : undefined,
            email: c.email ? String(c.email) : undefined,
          })))
        })
        .catch(() => setClientResults([]))
        .finally(() => setSearchingClients(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [clientSearch, tenant?.id])

  // ── Load suggested parts when entering step 2 ─────────────────────────────
  useEffect(() => {
    if (step !== 1 || !tenant?.id || !deviceModelId) return
    setLoadingSuggested(true)
    inventoryApi.getProductsByModel(deviceModelId, tenant.id)
      .then((res) => {
        const raw = res.data?.data ?? res.data ?? []
        const products = Array.isArray(raw) ? raw : []
        // Group by service — all services share the same suggested parts pool
        const grouped: Record<string, any[]> = {}
        for (const svc of selectedServices) {
          grouped[svc.id] = products
        }
        setSuggestedProducts(grouped)
      })
      .catch(() => {})
      .finally(() => setLoadingSuggested(false))
  }, [step, deviceModelId, tenant?.id, selectedServices])

  // ── Part search ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!partSearch.trim() || !tenant?.id) { setPartSearchResults([]); return }
    const timer = setTimeout(() => {
      setSearchingParts(true)
      inventoryApi.getProducts({ companyId: tenant.id!, search: partSearch, kind: 'Spare', pageSize: 10 })
        .then((res) => {
          const raw = res.data?.data?.items ?? res.data?.data ?? []
          setPartSearchResults(Array.isArray(raw) ? raw : [])
        })
        .catch(() => setPartSearchResults([]))
        .finally(() => setSearchingParts(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [partSearch, tenant?.id])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectClient = (c: Client) => {
    setClientId(c.id)
    setClientName(c.name)
    setClientPhone(c.phone ?? '')
    setClientSearch('')
    setClientResults([])
  }

  const handleWalkIn = () => {
    setClientId(null)
    setClientName('Walk-in Customer')
    setClientSearch('')
    setClientResults([])
  }

  const togglePart = (prod: any) => {
    const exists = selectedParts.some(p => p.productId === prod.id)
    if (exists) {
      setSelectedParts(prev => prev.filter(p => p.productId !== prod.id))
    } else {
      setSelectedParts(prev => [...prev, {
        productId: prod.id,
        name: prod.name,
        qty: 1,
        price: prod.locationSalePrice ?? prod.defaultSalePrice ?? 0,
        warehouseId: warehouses[0]?.id ?? '',
      }])
    }
  }

  const updatePartQty = (productId: string, qty: number) =>
    setSelectedParts(prev => prev.map(p => p.productId === productId ? { ...p, qty } : p))

  const updatePartWarehouse = (productId: string, wId: string) =>
    setSelectedParts(prev => prev.map(p => p.productId === productId ? { ...p, warehouseId: wId } : p))

  // ── Validation ─────────────────────────────────────────────────────────────

  const canProceedStep0 = reason.trim().length > 0

  // ── Create ticket ──────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!tenant?.id) return
    setCreating(true)
    try {
      const totalLabour = selectedServices.reduce((s, svc) => s + svc.basePrice, 0)
      const totalParts  = selectedParts.reduce((s, p) => s + p.price * p.qty, 0)

      // 1. Create ticket
      const ticketRes = await ticketsApi.createTicket({
        companyId:              tenant.id,
        locationId:             currentStoreId ?? undefined,
        clientId:               clientId ?? undefined,
        clientName:             clientId ? undefined : clientName || undefined,
        clientPhone:            clientId ? undefined : clientPhone || undefined,
        deviceBrandId:          deviceBrand,
        deviceModelId:          deviceModel,
        problemDescription:     reason,
        appearance:             appearance || undefined,
        equipment:              equipment || undefined,
        password:               password || undefined,
        priorityLevel:          priority,
        technicianEmployeeId:   technicianId || undefined,
        estimatedCost:          totalLabour + totalParts,
        reason:                 reason,
      })

      const ticketId     = ticketRes.data?.data?.id ?? ticketRes.data?.id ?? ticketRes.data?.data
      const ticketNumber = ticketRes.data?.data?.ticketNumber ?? ticketRes.data?.ticketNumber ?? String(ticketId)

      if (!ticketId) throw new Error('No ticket ID returned')

      // 2. Add each service as ticket item
      for (const svc of selectedServices) {
        try {
          await ticketsApi.addTicketItem(ticketId, {
            itemReferenceId: svc.id,
            name:            svc.name,
            type:            'Service',
            quantity:        1,
            price:           svc.basePrice,
          })
        } catch (e) {
          console.error('Failed to add service item:', e)
        }
      }

      // 3. Add each part as ticket item + record parts usage
      for (const part of selectedParts) {
        try {
          await ticketsApi.addTicketItem(ticketId, {
            itemReferenceId: part.productId,
            name:            part.name,
            type:            'Part',
            quantity:        part.qty,
            price:           part.price,
          })
        } catch (e) {
          console.error('Failed to add part item:', e)
        }
        try {
          await ticketsApi.addPartToTicket(ticketId, {
            productId:   part.productId,
            warehouseId: part.warehouseId,
            quantity:    part.qty,
            unitPrice:   part.price,
          })
        } catch (e) {
          console.error('Failed to record part usage:', e)
        }
      }

      // 4. Record advance payment if provided
      const advAmt = parseFloat(advanceAmount)
      if (advAmt > 0) {
        try {
          await ticketsApi.recordAdvance(ticketId, {
            amount: advAmt,
            method: paymentMethod,
          })
        } catch (e) {
          console.error('Failed to record advance:', e)
        }
      }

      onTicketCreated(String(ticketId), String(ticketNumber))
      toast.success(`Ticket #${ticketNumber} created!`)
      onClose()
    } catch (err) {
      console.error('Failed to create ticket:', err)
      toast.error('Failed to create ticket. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  const totalLabour = selectedServices.reduce((s, svc) => s + svc.basePrice, 0)
  const totalParts  = selectedParts.reduce((s, p) => s + p.price * p.qty, 0)
  const grandTotal  = totalLabour + totalParts

  // ── Render steps ───────────────────────────────────────────────────────────

  const renderStep0 = () => (
    <div className="space-y-4">
      {/* Customer */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Customer</label>
        {clientName ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
            <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300 flex-1">{clientName}</span>
            <button
              onClick={() => { setClientId(null); setClientName(''); setClientPhone('') }}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <input
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Search customers..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
              {searchingClients && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {clientResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 z-20 max-h-40 overflow-y-auto">
                  {clientResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectClient(c)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm border-b border-gray-50 dark:border-gray-700 last:border-0"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{c.name}</div>
                      {c.phone && <div className="text-xs text-gray-500">{c.phone}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleWalkIn}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Walk-in customer
            </button>
          </div>
        )}
      </div>

      {/* Device info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Brand</label>
          <div className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300">
            {deviceBrand || '—'}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Model</label>
          <div className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300">
            {deviceModel || '—'}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Serial Number (optional)</label>
        <input
          value={deviceSerial}
          onChange={(e) => setDeviceSerial(e.target.value)}
          placeholder="e.g. IMEI or S/N"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Reason for Repair *</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe the problem..."
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Appearance</label>
          <input
            value={appearance}
            onChange={(e) => setAppearance(e.target.value)}
            placeholder="Scratches, cracks..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Equipment</label>
          <input
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            placeholder="Charger, case..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Device Password (optional)</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="PIN or password"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Priority */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Priority</label>
        <div className="flex gap-2">
          {(['Low', 'Medium', 'High', 'Urgent'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={cn(
                'flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors',
                priority === p
                  ? p === 'Urgent' ? 'bg-red-600 text-white border-red-600'
                    : p === 'High'   ? 'bg-orange-500 text-white border-orange-500'
                    : p === 'Medium' ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-600 text-white border-gray-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-50'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Technician */}
      {employees.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Assign Technician</label>
          <select
            value={technicianId}
            onChange={(e) => setTechnicianId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Unassigned</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-5">
      {loadingSuggested && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {selectedServices.map((svc) => {
        const suggested = suggestedProducts[svc.id] ?? []
        return (
          <div key={svc.id}>
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{svc.name}</span>
            </div>
            {suggested.length === 0 && !loadingSuggested ? (
              <p className="text-xs text-gray-400 pl-6 italic">No suggested parts for this service</p>
            ) : (
              <div className="pl-6 space-y-1.5">
                {suggested.map((prod: any) => {
                  const isSelected = selectedParts.some(p => p.productId === prod.id)
                  const part = selectedParts.find(p => p.productId === prod.id)
                  return (
                    <div key={prod.id} className="flex items-center gap-3 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePart(prod)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                      />
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{prod.name}</span>
                      {isSelected && part && (
                        <>
                          <input
                            type="number"
                            min={1}
                            value={part.qty}
                            onChange={(e) => updatePartQty(prod.id, parseInt(e.target.value) || 1)}
                            className="w-14 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-center"
                          />
                          {warehouses.length > 1 && (
                            <select
                              value={part.warehouseId}
                              onChange={(e) => updatePartWarehouse(prod.id, e.target.value)}
                              className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-1 py-1 dark:bg-gray-800 dark:text-white"
                            >
                              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                          )}
                        </>
                      )}
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 w-16 text-right">
                        {format(prod.locationSalePrice ?? prod.defaultSalePrice ?? 0)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Search other parts */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Search other parts</label>
        <div className="relative">
          <input
            value={partSearch}
            onChange={(e) => setPartSearch(e.target.value)}
            placeholder="Search spare parts..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
          {searchingParts && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {partSearchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 z-20 max-h-40 overflow-y-auto">
              {partSearchResults.map((prod) => (
                <button
                  key={prod.id}
                  onClick={() => { togglePart(prod); setPartSearch(''); setPartSearchResults([]) }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm border-b border-gray-50 dark:border-gray-700 last:border-0 flex items-center justify-between"
                >
                  <span className="text-gray-800 dark:text-gray-200">{prod.name}</span>
                  <span className="text-xs text-blue-600">{format(prod.locationSalePrice ?? prod.defaultSalePrice ?? 0)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Skip link */}
      <button
        onClick={() => setStep(2)}
        className="text-xs text-gray-400 hover:text-blue-500 underline-offset-2 hover:underline transition-colors"
      >
        Skip — add parts later
      </button>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <p className="text-xs font-bold uppercase text-gray-500">Summary</p>
        </div>
        <div className="px-4 py-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Customer</span>
            <span className="font-medium text-gray-900 dark:text-white">{clientName || 'Walk-in'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Device</span>
            <span className="font-medium text-gray-900 dark:text-white">{[deviceBrand, deviceModel].filter(Boolean).join(' ') || '—'}</span>
          </div>
          {deviceSerial && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Serial</span>
              <span className="font-medium text-gray-900 dark:text-white">{deviceSerial}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Priority</span>
            <span className="font-medium text-gray-900 dark:text-white">{priority}</span>
          </div>
        </div>
      </div>

      {/* Services */}
      <div>
        <p className="text-xs font-bold uppercase text-gray-500 mb-2">Services ({selectedServices.length})</p>
        <div className="space-y-1.5">
          {selectedServices.map((svc) => (
            <div key={svc.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-gray-800 dark:text-gray-200">{svc.name}</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">{format(svc.basePrice)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Parts */}
      {selectedParts.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase text-gray-500 mb-2">Spare Parts ({selectedParts.length})</p>
          <div className="space-y-1.5">
            {selectedParts.map((p) => (
              <div key={p.productId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-gray-800 dark:text-gray-200">{p.name} × {p.qty}</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">{format(p.price * p.qty)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-2 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Labour</span>
            <span>{format(totalLabour)}</span>
          </div>
          {selectedParts.length > 0 && (
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Parts</span>
              <span>{format(totalParts)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base text-gray-900 dark:text-white pt-1 border-t border-gray-100 dark:border-gray-700">
            <span>Estimated Total</span>
            <span>{format(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Advance payment */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Advance Amount</label>
          <input
            type="number"
            min={0}
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          >
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="BankTransfer">Bank Transfer</option>
            <option value="Online">Online</option>
          </select>
        </div>
      </div>
    </div>
  )

  // ─── Modal footer ──────────────────────────────────────────────────────────

  const footer = (
    <div className="flex items-center justify-between">
      {step > 0 ? (
        <button
          onClick={() => setStep(s => s - 1)}
          disabled={creating}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      ) : (
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
      )}

      {step < 2 ? (
        <button
          onClick={() => setStep(s => s + 1)}
          disabled={step === 0 && !canProceedStep0}
          className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
        >
          {creating ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
          ) : (
            <><CheckCircle2 className="w-4 h-4" /> Create Ticket</>
          )}
        </button>
      )}
    </div>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`New Repair Ticket — Step ${step + 1} of ${STEPS.length}`}
      size="xl"
      footer={footer}
    >
      <StepIndicator step={step} total={STEPS.length} labels={STEPS} />
      {step === 0 && renderStep0()}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
    </Modal>
  )
}
