import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Wrench, Package, Tag, Clock, CreditCard,
  CheckCircle2, AlertCircle, DollarSign, User, Smartphone,
  FileText, Plus, X, Banknote, Wallet, Trash2,
  Building2, ExternalLink, RefreshCw, Search, ShoppingBag,
  CheckCheck,
} from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@flowtap/store'
import { clearCart, addItem, setClient, setTicketContext } from '@flowtap/store'
import { ticketsApi } from '@flowtap/api-core'
import { Button, Badge, Spinner, Modal, Input } from '@flowtap/ui-core'
import { cn } from '@flowtap/shared'
import { useCurrency } from '@flowtap/shared'

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface TicketItem {
  id: string
  itemReferenceId: string
  name: string
  type: string        // Service | Part | Product
  quantity: number
  price: number
  cost: number
  discountAmount: number
  taxPercent: number
}

interface TicketPayment {
  id: string
  amount: number
  method: string
  purpose: string
  externalReference?: string
  comment?: string
  paidAt: string
  saleId?: string
}

interface Ticket {
  id: string
  companyId: string
  locationId: string
  clientId: string
  ticketNumber: string
  type: string
  status: string
  priority: string
  primaryServiceId?: string
  executorEmployeeId?: string
  managerEmployeeId?: string
  clientName?: string
  clientPhone?: string
  clientEmail?: string
  technicianName?: string
  managerName?: string
  createdAt: string
  deadline?: string
  closedAt?: string
  // Device
  deviceType?: string
  deviceBrand?: string
  deviceModel?: string
  deviceSerial?: string
  deviceModification?: string
  appearance?: string
  password?: string
  equipment?: string
  // Notes
  reason?: string
  mastersNotes?: string
  preRepairChecklist?: string
  accessoryList?: string
  // Financials
  estimatedCost: number
  prepayment: number
  totalCost: number
  isPaid: boolean
  prepaymentMethod?: string
  prepaymentPaidAt?: string
  // Sale
  saleId?: string
  // Timer
  isTimerRunning: boolean
  totalTimeSpentSeconds: number
  // Children
  items: TicketItem[]
  payments: TicketPayment[]
}

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STATUS_CONFIG: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'danger' | 'purple' | 'default'; icon: React.ReactNode }> = {
  New:            { label: 'Pending',           variant: 'warning', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  InProgress:     { label: 'In Progress',       variant: 'info',    icon: <RefreshCw className="w-3.5 h-3.5" /> },
  WaitingForParts:{ label: 'Waiting for Parts', variant: 'purple',  icon: <Package className="w-3.5 h-3.5" /> },
  Ready:          { label: 'Ready for Pickup',  variant: 'info',    icon: <CheckCheck className="w-3.5 h-3.5" /> },
  Done:           { label: 'Done',              variant: 'success', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  Canceled:       { label: 'Cancelled',         variant: 'danger',  icon: <X className="w-3.5 h-3.5" /> },
}

const PRIORITY_COLOR: Record<string, string> = {
  Low: 'text-gray-500', Medium: 'text-blue-500', High: 'text-orange-500', Urgent: 'text-red-500'
}

const ITEM_TYPE_ICON: Record<string, React.ReactNode> = {
  Service: <Wrench className="w-4 h-4 text-blue-500" />,
  Part:    <Package className="w-4 h-4 text-orange-500" />,
  Product: <Tag className="w-4 h-4 text-green-500" />,
}

const METHOD_ICON: Record<string, React.ReactNode> = {
  Cash:       <Banknote className="w-4 h-4" />,
  Card:       <CreditCard className="w-4 h-4" />,
  UPI:        <Smartphone className="w-4 h-4" />,
  NetBanking: <Building2 className="w-4 h-4" />,
  Wallet:     <Wallet className="w-4 h-4" />,
}

const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'NetBanking', 'Wallet']

const formatTimer = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// â”€â”€â”€ Add Item Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ItemType = 'Service' | 'Part' | 'Product'

interface SearchResult {
  id: string
  name: string
  price: number
  type: ItemType
  description?: string
  taxPercent?: number
}

interface AddItemModalProps {
  open: boolean
  ticketId: string
  tenantId: string
  onClose: () => void
  onSaved: () => void
}

const AddItemModal: React.FC<AddItemModalProps> = ({ open, ticketId, tenantId, onClose, onSaved }) => {
  const [activeType, setActiveType] = useState<ItemType>('Service')
  const [search, setSearch]         = useState('')
  const [results, setResults]       = useState<SearchResult[]>([])
  const [searching, setSearching]   = useState(false)
  const [selected, setSelected]     = useState<SearchResult | null>(null)
  const [qty, setQty]               = useState('1')
  const [price, setPrice]           = useState('')
  const [discount, setDiscount]     = useState('0')
  const [tax, setTax]               = useState('0')
  const [saving, setSaving]         = useState(false)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset when modal opens or tab changes
  useEffect(() => {
    if (open) { setSearch(''); setResults([]); setSelected(null); setQty('1'); setPrice(''); setDiscount('0'); setTax('0') }
  }, [open, activeType])

  // Debounced search
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current)
    if (!search.trim() || !tenantId) { setResults([]); return }
    searchRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        if (activeType === 'Service') {
          const { ticketsApi: api } = await import('@flowtap/api-core')
          const res = await api.getServices(tenantId)
          const raw: any[] = res.data?.data?.items ?? res.data?.data ?? []
          setResults(
            raw
              .filter((s: any) => s.name?.toLowerCase().includes(search.toLowerCase()) && s.isActive !== false)
              .slice(0, 12)
              .map((s: any) => ({ id: String(s.id), name: String(s.name), price: Number(s.basePrice ?? 0), type: 'Service' as ItemType, description: s.description }))
          )
        } else {
          const { inventoryApi } = await import('@flowtap/api-core')
          const res = await inventoryApi.getProducts({ companyId: tenantId, search: search.trim(), pageSize: 12 })
          const raw: any[] = res.data?.data?.items ?? res.data?.data ?? []
          setResults(
            raw.map((p: any) => ({
              id: String(p.id),
              name: String(p.name),
              price: Number(p.locationSalePrice ?? p.defaultSalePrice ?? 0),
              type: activeType,
              taxPercent: 0,
            }))
          )
        }
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 350)
  }, [search, activeType, tenantId])

  const handleSelect = (item: SearchResult) => {
    setSelected(item)
    setPrice(String(item.price))
    setTax(String(item.taxPercent ?? 0))
  }

  const handleSave = async () => {
    if (!selected) { toast.error('Select an item first'); return }
    const qtyVal  = parseFloat(qty)
    const priceVal = parseFloat(price)
    if (!qtyVal || qtyVal <= 0)  { toast.error('Enter a valid quantity'); return }
    if (isNaN(priceVal) || priceVal < 0) { toast.error('Enter a valid price'); return }
    setSaving(true)
    try {
      await ticketsApi.addTicketItem(ticketId, {
        itemReferenceId: selected.id,
        name:            selected.name,
        type:            selected.type,
        quantity:        qtyVal,
        price:           priceVal,
        discountAmount:  parseFloat(discount) || 0,
        taxPercent:      parseFloat(tax) || 0,
      })
      toast.success(`${selected.name} added to ticket`)
      onSaved()
      onClose()
    } catch {
      toast.error('Failed to add item')
    } finally {
      setSaving(false)
    }
  }

  const TABS: { type: ItemType; label: string; icon: React.ReactNode }[] = [
    { type: 'Service', label: 'Service',     icon: <Wrench className="w-4 h-4" /> },
    { type: 'Part',    label: 'Part',        icon: <Package className="w-4 h-4" /> },
    { type: 'Product', label: 'Product',     icon: <Tag className="w-4 h-4" /> },
  ]

  return (
    <Modal open={open} onClose={onClose} title="Add Item to Ticket" size="md">
      <div className="space-y-4">
        {/* Type tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          {TABS.map(t => (
            <button key={t.type} onClick={() => setActiveType(t.type)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-semibold transition-all',
                activeType === t.type
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${activeType.toLowerCase()}s...`}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          {searching && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
        </div>

        {/* Results list */}
        {results.length > 0 && !selected && (
          <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-800">
            {results.map(r => (
              <button key={r.id} onClick={() => handleSelect(r)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{r.name}</p>
                  {r.description && <p className="text-xs text-gray-400 truncate max-w-xs">{r.description}</p>}
                </div>
                <span className="text-sm font-bold text-blue-600 shrink-0 ml-3">
                  {r.price > 0 ? `${r.price.toFixed(2)}` : 'Free'}
                </span>
              </button>
            ))}
          </div>
        )}

        {search.trim() && !searching && results.length === 0 && !selected && (
          <p className="text-sm text-center text-gray-400 py-3">No {activeType.toLowerCase()}s found matching "{search}"</p>
        )}

        {/* Selected item + form */}
        {selected && (
          <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{selected.name}</p>
                <p className="text-xs text-blue-600">{selected.type}</p>
              </div>
              <button onClick={() => { setSelected(null); setSearch('') }}
                className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Quantity" type="number" min="0.01" step="0.01"
                value={qty} onChange={e => setQty(e.target.value)} />
              <Input label="Unit Price" type="number" min="0" step="0.01"
                value={price} onChange={e => setPrice(e.target.value)} />
              <Input label="Discount Amount" type="number" min="0" step="0.01"
                value={discount} onChange={e => setDiscount(e.target.value)} />
              <Input label="Tax %" type="number" min="0" step="0.01"
                value={tax} onChange={e => setTax(e.target.value)} />
            </div>

            {/* Live total preview */}
            {(() => {
              const q = parseFloat(qty) || 0
              const p = parseFloat(price) || 0
              const d = parseFloat(discount) || 0
              const t = parseFloat(tax) || 0
              const net   = q * p - d
              const total = net * (1 + t / 100)
              return (
                <div className="flex justify-between items-center pt-1 border-t border-blue-200 dark:border-blue-700">
                  <span className="text-xs text-gray-500">Line total</span>
                  <span className="font-bold text-gray-900 dark:text-white">{total.toFixed(2)}</span>
                </div>
              )
            })()}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving} disabled={!selected}>
            Add to Ticket
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// â”€â”€â”€ Advance Payment Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface AdvanceModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  ticketId: string
}

const AdvanceModal: React.FC<AdvanceModalProps> = ({ open, onClose, onSaved, ticketId }) => {
  const [amount, setAmount]   = useState('')
  const [method, setMethod]   = useState('Cash')
  const [ref, setRef]         = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving]   = useState(false)

  const reset = () => { setAmount(''); setMethod('Cash'); setRef(''); setComment('') }

  const handleSave = async () => {
    const val = parseFloat(amount)
    if (!val || val <= 0) { toast.error('Enter a valid amount'); return }
    setSaving(true)
    try {
      await ticketsApi.recordAdvance(ticketId, {
        amount: val, method, externalReference: ref || undefined, comment: comment || undefined
      })
      toast.success('Advance recorded')
      reset()
      onSaved()
      onClose()
    } catch {
      toast.error('Failed to record advance')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record Advance Payment" size="sm">
      <div className="space-y-4">
        <Input
          label="Amount"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method</label>
          <div className="grid grid-cols-5 gap-1.5">
            {PAYMENT_METHODS.map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 px-1 rounded-lg border-2 text-[10px] font-bold uppercase tracking-tight transition-all',
                  method === m
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-200 text-gray-500 hover:border-blue-300 dark:border-gray-700 dark:text-gray-400'
                )}
              >
                {METHOD_ICON[m]}
                <span className="truncate w-full text-center">{m === 'NetBanking' ? 'Net' : m}</span>
              </button>
            ))}
          </div>
        </div>
        <Input label="Reference / Transaction ID" value={ref} onChange={e => setRef(e.target.value)} placeholder="Optional" />
        <Input label="Comment" value={comment} onChange={e => setComment(e.target.value)} placeholder="Optional" />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Record Advance</Button>
        </div>
      </div>
    </Modal>
  )
}

// â”€â”€â”€ Collect / Checkout Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface CollectModalProps {
  open: boolean
  onClose: () => void
  onCollected: (saleId: string) => void
  ticketId: string
  totalCost: number
  alreadyPaid: number  // sum of recorded advance payments
}

const CollectModal: React.FC<CollectModalProps> = ({
  open, onClose, onCollected, ticketId, totalCost, alreadyPaid
}) => {
  const remaining        = Math.max(0, totalCost - alreadyPaid)
  const [amount, setAmount]   = useState('')
  const [method, setMethod]   = useState('Cash')
  const [ref,    setRef]      = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving]   = useState(false)

  // Pre-fill amount with remaining balance when modal opens
  useEffect(() => {
    if (open) {
      setAmount(remaining > 0 ? String(remaining.toFixed(2)) : '0')
      setMethod('Cash'); setRef(''); setComment('')
    }
  }, [open, remaining])

  const handleCollect = async () => {
    const amt = parseFloat(amount) || 0
    setSaving(true)
    try {
      const res = await ticketsApi.collectTicket(ticketId, {
        finalPaymentAmount: amt > 0 ? amt : undefined,
        finalPaymentMethod: amt > 0 ? method : undefined,
        externalReference:  ref || undefined,
        comment:            comment || undefined,
      })
      const saleId = res.data?.data ?? res.data
      toast.success('Ticket collected - sale created!')
      onCollected(String(saleId))
    } catch {
      toast.error('Failed to complete collection')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Complete & Collect" size="sm">
      <div className="space-y-4">
        {/* Payment summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-center">
            <p className="text-[10px] text-gray-400 uppercase font-bold">Total</p>
            <p className="text-sm font-black text-gray-900 dark:text-white">{totalCost.toFixed(2)}</p>
          </div>
          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
            <p className="text-[10px] text-blue-500 uppercase font-bold">Advance</p>
            <p className="text-sm font-black text-blue-700 dark:text-blue-300">{alreadyPaid.toFixed(2)}</p>
          </div>
          <div className={cn(
            'p-2.5 rounded-xl text-center',
            remaining > 0 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-green-50 dark:bg-green-900/20'
          )}>
            <p className={cn('text-[10px] uppercase font-bold', remaining > 0 ? 'text-orange-500' : 'text-green-500')}>
              {remaining > 0 ? 'Due' : 'Fully Paid'}
            </p>
            <p className={cn('text-sm font-black', remaining > 0 ? 'text-orange-700 dark:text-orange-300' : 'text-green-700 dark:text-green-300')}>
              {remaining.toFixed(2)}
            </p>
          </div>
        </div>

        {remaining > 0 ? (
          <>
            <Input
              label="Amount to collect"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method</label>
              <div className="grid grid-cols-5 gap-1.5">
                {PAYMENT_METHODS.map(m => (
                  <button key={m} onClick={() => setMethod(m)}
                    className={cn(
                      'flex flex-col items-center gap-1 py-2 px-1 rounded-lg border-2 text-[10px] font-bold uppercase tracking-tight transition-all',
                      method === m
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-200 text-gray-500 hover:border-blue-300 dark:border-gray-700 dark:text-gray-400'
                    )}>
                    {METHOD_ICON[m]}
                    <span className="truncate w-full text-center">{m === 'NetBanking' ? 'Net' : m}</span>
                  </button>
                ))}
              </div>
            </div>

            <Input label="Reference / Transaction ID" value={ref} onChange={e => setRef(e.target.value)} placeholder="Optional" />
            <Input label="Comment" value={comment} onChange={e => setComment(e.target.value)} placeholder="Optional" />
          </>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <p className="text-sm text-green-800 dark:text-green-300">
              This ticket is fully covered by advance payments. No additional payment needed.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleCollect}
            loading={saving}
            icon={<ShoppingBag className="w-4 h-4" />}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Complete & Collect
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dispatch  = useAppDispatch()
  const tenant    = useAppSelector(s => s.tenant.tenant)
  const { format } = useCurrency()

  const [ticket, setTicket]             = useState<Ticket | null>(null)
  const [loading, setLoading]           = useState(true)
  const [tab, setTab]                   = useState<'items' | 'payments' | 'details'>('items')
  const [advanceOpen, setAdvanceOpen]   = useState(false)
  const [addItemOpen, setAddItemOpen]   = useState(false)
  const [removingId, setRemovingId]     = useState<string | null>(null)
  const [markingReady, setMarkingReady] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const res = await ticketsApi.getTicket(id)
      const raw = res.data?.data ?? res.data
      setTicket(raw)
    } catch {
      toast.error('Failed to load ticket')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleRemoveItem = async (itemId: string) => {
    if (!ticket) return
    setRemovingId(itemId)
    try {
      await ticketsApi.removeTicketItem(ticket.id, itemId)
      toast.success('Item removed')
      load()
    } catch {
      toast.error('Failed to remove item')
    } finally {
      setRemovingId(null)
    }
  }

  const handleMarkReady = async () => {
    if (!ticket) return
    setMarkingReady(true)
    try {
      await ticketsApi.updateStatus(ticket.id, 'Ready')
      toast.success('Ticket marked as Ready for Pickup')
      load()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setMarkingReady(false)
    }
  }

  // Pre-fill POS cart with ticket items, then navigate to /pos for final checkout
  const handleGoToPOS = () => {
    if (!ticket) return

    const alreadyPaid = ticket.payments.reduce((s, p) => s + p.amount, 0)

    // 1. Clear any previous cart state
    dispatch(clearCart())

    // 2. Set the client (if known)
    if (ticket.clientId && ticket.clientName) {
      dispatch(setClient({ id: ticket.clientId, name: ticket.clientName }))
    }

    // 3. Load every ticket item (services + parts) into the cart for display
    ticket.items.forEach((item) => {
      const discountPct = item.price > 0 && item.quantity > 0
        ? parseFloat(((item.discountAmount / (item.price * item.quantity)) * 100).toFixed(2))
        : 0
      dispatch(addItem({
        id:          crypto.randomUUID(),
        productId:   item.itemReferenceId,
        type:        item.type as 'Product' | 'Service' | 'Part',
        name:        item.name,
        sku:         '',
        price:       item.price,
        quantity:    item.quantity,
        discount:    discountPct,
        taxRate:     item.taxPercent,
        isTaxIncluded: false,
      }))
    })

    // 4. Record the ticket context (advance credit + ticket identity)
    dispatch(setTicketContext({
      ticketId:    ticket.id,
      ticketNumber: ticket.ticketNumber,
      advancePaid: alreadyPaid,
    }))

    // 5. Navigate to POS — cart is pre-filled, PaymentPanel shows remaining balance
    navigate('/pos')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  )

  if (!ticket) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
      <AlertCircle className="w-12 h-12" />
      <p>Ticket not found</p>
      <Button variant="ghost" onClick={() => navigate('/tickets')}>Back to tickets</Button>
    </div>
  )

  const statusCfg   = STATUS_CONFIG[ticket.status] ?? { label: ticket.status, variant: 'default' as const, icon: null }
  const isDone      = ticket.status === 'Done' || ticket.status === 'Canceled'
  const isReady     = ticket.status === 'Ready'
  const isLocked    = isDone || isReady   // items cannot be added/removed
  const totalPaid   = ticket.payments.reduce((s, p) => s + p.amount, 0)
  const remaining   = Math.max(0, (ticket.totalCost || ticket.estimatedCost) - totalPaid)

  // Compute line-item total
  const itemsTotal  = ticket.items.reduce((s, i) => {
    const net = i.price * i.quantity - i.discountAmount
    return s + net * (1 + i.taxPercent / 100)
  }, 0)

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-10">
      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/tickets')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{ticket.ticketNumber}</h1>
            <Badge variant={statusCfg.variant}>
              <span className="flex items-center gap-1">{statusCfg.icon}{statusCfg.label}</span>
            </Badge>
            <span className={cn('text-sm font-semibold', PRIORITY_COLOR[ticket.priority])}>
              {ticket.priority}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Created {new Date(ticket.createdAt).toLocaleDateString()}
            {ticket.deadline && ` · Due ${new Date(ticket.deadline).toLocaleDateString()}`}
            {ticket.totalTimeSpentSeconds > 0 && (
              <span className="inline-flex items-center gap-1 ml-2">
                <Clock className="w-3.5 h-3.5" />
                {formatTimer(ticket.totalTimeSpentSeconds)}
              </span>
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {/* â”€â”€ Active ticket (not Ready, not Done/Cancelled) â”€â”€ */}
          {!isDone && !isReady && (
            <>
              <Button variant="secondary" size="sm" icon={<DollarSign className="w-4 h-4" />}
                onClick={() => setAdvanceOpen(true)}>
                Advance
              </Button>
              <Button variant="secondary" size="sm" icon={<CheckCheck className="w-4 h-4" />}
                onClick={handleMarkReady} loading={markingReady}>
                Mark Ready
              </Button>
            </>
          )}

          {/* â”€â”€ Ready for pickup â”€â”€ */}
          {isReady && (
            <>
              <Button variant="secondary" size="sm" icon={<DollarSign className="w-4 h-4" />}
                onClick={() => setAdvanceOpen(true)}>
                Advance
              </Button>
              <Button size="sm" icon={<ShoppingBag className="w-4 h-4" />}
                onClick={handleGoToPOS}
                className="bg-green-600 hover:bg-green-700 text-white">
                Complete &amp; Collect
              </Button>
            </>
          )}

          {/* â”€â”€ Sale link (after collection) â”€â”€ */}
          {ticket.saleId && (
            <Button variant="secondary" size="sm" icon={<ExternalLink className="w-4 h-4" />}
              onClick={() => navigate(`/sales/${ticket.saleId}`)}>
              View Sale
            </Button>
          )}
        </div>
      </div>

      {/* â”€â”€ Info cards row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <InfoCard label="Device" value={[ticket.deviceBrand, ticket.deviceModel].filter(Boolean).join(' ') || '-'} icon={<Smartphone className="w-4 h-4 text-blue-500" />} />
        <InfoCard label="Serial" value={ticket.deviceSerial || '-'} icon={<Tag className="w-4 h-4 text-purple-500" />} />
        <InfoCard label="Estimated" value={format(ticket.estimatedCost)} icon={<DollarSign className="w-4 h-4 text-orange-500" />} />
        <InfoCard
          label={ticket.isPaid ? 'Paid ✓' : 'Remaining'}
          value={ticket.isPaid ? format(ticket.totalCost || ticket.estimatedCost) : format(remaining)}
          icon={<CreditCard className="w-4 h-4 text-green-500" />}
          highlight={ticket.isPaid ? 'success' : remaining > 0 ? 'warn' : 'neutral'}
        />
      </div>

      {/* â”€â”€ Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-gray-800">
          {(['items', 'payments', 'details'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-3 px-4 text-sm font-semibold capitalize transition-colors',
                tab === t
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              {t === 'items' ? `Items (${ticket.items.length})` :
               t === 'payments' ? `Payments (${ticket.payments.length})` : 'Details'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* â”€â”€ Items Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {tab === 'items' && (
            <div className="space-y-3">
              {ticket.items.length === 0 ? (
                <>
                  <EmptySection icon={<Wrench className="w-8 h-8" />} message="No items added to this ticket yet" />
                  {!isLocked && (
                    <Button variant="secondary" icon={<Plus className="w-4 h-4" />}
                      onClick={() => setAddItemOpen(true)} className="w-full">
                      Add Service / Item
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-gray-800">
                          <th className="text-left pb-2 font-medium">Item</th>
                          <th className="text-right pb-2 font-medium">Qty</th>
                          <th className="text-right pb-2 font-medium">Price</th>
                          <th className="text-right pb-2 font-medium">Discount</th>
                          <th className="text-right pb-2 font-medium">Tax</th>
                          <th className="text-right pb-2 font-medium">Total</th>
                          {!isLocked && <th className="pb-2 w-8" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {ticket.items.map(item => {
                          const net   = item.price * item.quantity - item.discountAmount
                          const total = net * (1 + item.taxPercent / 100)
                          return (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="py-2.5 pr-4">
                                <div className="flex items-center gap-2">
                                  {ITEM_TYPE_ICON[item.type] ?? <Tag className="w-4 h-4 text-gray-400" />}
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                                    <p className="text-[11px] text-gray-400">{item.type}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 text-right text-gray-600 dark:text-gray-300">{item.quantity}</td>
                              <td className="py-2.5 text-right text-gray-600 dark:text-gray-300">{format(item.price)}</td>
                              <td className="py-2.5 text-right text-gray-500">
                                {item.discountAmount > 0 ? `-${format(item.discountAmount)}` : '-'}
                              </td>
                              <td className="py-2.5 text-right text-gray-500">
                                {item.taxPercent > 0 ? `${item.taxPercent}%` : '-'}
                              </td>
                              <td className="py-2.5 text-right font-semibold text-gray-900 dark:text-white">{format(total)}</td>
                              {!isLocked && (
                                <td className="py-2.5 pl-2">
                                  <button
                                    onClick={() => handleRemoveItem(item.id)}
                                    disabled={!!removingId}
                                    className="p-1 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40 rounded"
                                    title="Remove item"
                                  >
                                    {removingId === item.id
                                      ? <span className="inline-block w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                      : <Trash2 className="w-3.5 h-3.5" />}
                                  </button>
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 dark:border-gray-700">
                          <td colSpan={!isLocked ? 6 : 5} className="pt-3 text-sm font-semibold text-gray-500">Items Total</td>
                          <td className="pt-3 text-right text-base font-black text-gray-900 dark:text-white">{format(itemsTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Add item button */}
                  {!isLocked && (
                    <Button variant="secondary" icon={<Plus className="w-4 h-4" />}
                      onClick={() => setAddItemOpen(true)} className="w-full">
                      Add Service / Item
                    </Button>
                  )}

                  {/* Sale link banner */}
                  {ticket.saleId && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">
                          Sale created from this ticket
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Items were transferred automatically when the ticket was marked Done
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}
                        onClick={() => navigate(`/sales/${ticket.saleId}`)}>
                        View Sale
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* â”€â”€ Payments Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {tab === 'payments' && (
            <div className="space-y-4">
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white">{format(ticket.totalCost || ticket.estimatedCost)}</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <p className="text-xs text-blue-600 uppercase font-bold tracking-wider">Paid</p>
                  <p className="text-lg font-black text-blue-700 dark:text-blue-300">{format(totalPaid)}</p>
                </div>
                <div className={cn('p-3 rounded-xl', remaining > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20')}>
                  <p className={cn('text-xs uppercase font-bold tracking-wider', remaining > 0 ? 'text-red-600' : 'text-green-600')}>
                    {remaining > 0 ? 'Remaining' : 'Fully Paid'}
                  </p>
                  <p className={cn('text-lg font-black', remaining > 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300')}>
                    {format(remaining)}
                  </p>
                </div>
              </div>

              {/* Payment list */}
              {ticket.payments.length === 0 ? (
                <EmptySection icon={<CreditCard className="w-8 h-8" />} message="No advance payments recorded yet" />
              ) : (
                <div className="space-y-2">
                  {ticket.payments.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl">
                      <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                        {METHOD_ICON[p.method] ?? <CreditCard className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {p.method} - <span className="text-blue-600">{p.purpose}</span>
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(p.paidAt).toLocaleString()}
                          {p.externalReference && ` · Ref: ${p.externalReference}`}
                          {p.comment && ` · ${p.comment}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-gray-900 dark:text-white">{format(p.amount)}</p>
                        {p.saleId ? (
                          <span className="text-[10px] text-green-600 font-medium">Linked to sale</span>
                        ) : (
                          <span className="text-[10px] text-gray-400">Advance</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Record advance / collect buttons */}
              {!isDone && (
                <div className="flex gap-2">
                  <Button variant="secondary" icon={<Plus className="w-4 h-4" />}
                    onClick={() => setAdvanceOpen(true)} className="flex-1">
                    Record Advance
                  </Button>
                  {isReady && (
                    <Button icon={<ShoppingBag className="w-4 h-4" />}
                      onClick={handleGoToPOS}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                      Collect &amp; Close
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* â”€â”€ Details Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {tab === 'details' && (
            <div className="space-y-5">
              {/* Device info */}
              <Section title="Device Information" icon={<Smartphone className="w-4 h-4" />}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <DetailField label="Brand"       value={ticket.deviceBrand} />
                  <DetailField label="Model"       value={ticket.deviceModel} />
                  <DetailField label="Serial"      value={ticket.deviceSerial} />
                  <DetailField label="Appearance"  value={ticket.appearance} />
                  <DetailField label="Equipment"   value={ticket.equipment} />
                  <DetailField label="Password"    value={ticket.password ? '******' : undefined} />
                </div>
              </Section>

              {/* Problem & notes */}
              <Section title="Notes" icon={<FileText className="w-4 h-4" />}>
                <DetailField label="Problem / Reason" value={ticket.reason} fullWidth />
                <DetailField label="Master's Notes"   value={ticket.mastersNotes} fullWidth />
                <DetailField label="Accessories"      value={ticket.accessoryList} fullWidth />
              </Section>

              {/* Assigned */}
              <Section title="Assignment" icon={<User className="w-4 h-4" />}>
                <div className="grid grid-cols-2 gap-3">
                  <DetailField label="Technician" value={ticket.technicianName ?? (ticket.executorEmployeeId ? ticket.executorEmployeeId : undefined)} />
                  <DetailField label="Manager"    value={ticket.managerName    ?? (ticket.managerEmployeeId  ? ticket.managerEmployeeId  : undefined)} />
                </div>
              </Section>
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ Advance modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AdvanceModal
        open={advanceOpen}
        onClose={() => setAdvanceOpen(false)}
        onSaved={load}
        ticketId={ticket.id}
      />

      {/* â”€â”€ Add Item modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AddItemModal
        open={addItemOpen}
        ticketId={ticket.id}
        tenantId={tenant?.id ?? ''}
        onClose={() => setAddItemOpen(false)}
        onSaved={load}
      />

    </div>
  )
}

// â”€â”€â”€ Small helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const InfoCard: React.FC<{
  label: string; value: string; icon: React.ReactNode
  highlight?: 'success' | 'warn' | 'neutral'
}> = ({ label, value, icon, highlight }) => (
  <div className={cn(
    'p-3 rounded-xl border',
    highlight === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
    highlight === 'warn'    ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
    'bg-white border-gray-100 dark:bg-gray-900 dark:border-gray-800'
  )}>
    <div className="flex items-center gap-1.5 mb-1">{icon}<p className="text-xs text-gray-500 font-medium">{label}</p></div>
    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{value}</p>
  </div>
)

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div>
    <div className="flex items-center gap-2 mb-3">
      <div className="text-gray-400">{icon}</div>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{title}</h3>
    </div>
    <div className="space-y-2">{children}</div>
  </div>
)

const DetailField: React.FC<{ label: string; value?: string | null; fullWidth?: boolean }> = ({ label, value, fullWidth }) => {
  if (!value) return null
  return (
    <div className={fullWidth ? 'col-span-full' : ''}>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 dark:text-gray-200">{value}</p>
    </div>
  )
}

const EmptySection: React.FC<{ icon: React.ReactNode; message: string }> = ({ icon, message }) => (
  <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
    {icon}
    <p className="text-sm">{message}</p>
  </div>
)
