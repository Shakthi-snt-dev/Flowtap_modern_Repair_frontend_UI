import React, { useState, useEffect, useCallback } from 'react'
import { LayoutGrid, Wrench, Clock, AlertCircle, Package, CheckCircle2, RefreshCw } from 'lucide-react'
import { useAppSelector } from '@flowtap/store'
import { repairApi } from '../api/repair.api'
import toast from 'react-hot-toast'

type RepairStatus = 'Received' | 'Diagnosing' | 'AwaitingParts' | 'InRepair' | 'ReadyForPickup' | 'Completed'

interface BoardCard {
  id: string
  jobCardNo: string
  clientName: string
  deviceType: string
  brand: string
  model: string
  reportedIssue: string
  priority: 'Low' | 'Normal' | 'High' | 'Urgent'
  status: RepairStatus
  assignedTechnicianName?: string
  estimatedCost?: number
  createdAt: string
}

const COLUMNS: { status: RepairStatus; label: string; icon: React.ReactNode; color: string; headerBg: string }[] = [
  { status: 'Received',       label: 'Received',        icon: <Clock className="w-4 h-4" />,         color: 'border-gray-300 dark:border-gray-600',   headerBg: 'bg-gray-100 dark:bg-gray-700' },
  { status: 'Diagnosing',     label: 'Diagnosing',      icon: <RefreshCw className="w-4 h-4" />,     color: 'border-blue-300 dark:border-blue-700',    headerBg: 'bg-blue-100 dark:bg-blue-900/40' },
  { status: 'AwaitingParts',  label: 'Awaiting Parts',  icon: <Package className="w-4 h-4" />,       color: 'border-yellow-300 dark:border-yellow-700', headerBg: 'bg-yellow-100 dark:bg-yellow-900/40' },
  { status: 'InRepair',       label: 'In Repair',       icon: <Wrench className="w-4 h-4" />,        color: 'border-purple-300 dark:border-purple-700', headerBg: 'bg-purple-100 dark:bg-purple-900/40' },
  { status: 'ReadyForPickup', label: 'Ready',           icon: <CheckCircle2 className="w-4 h-4" />,  color: 'border-green-300 dark:border-green-700',   headerBg: 'bg-green-100 dark:bg-green-900/40' },
  { status: 'Completed',      label: 'Completed',       icon: <CheckCircle2 className="w-4 h-4" />,  color: 'border-teal-300 dark:border-teal-700',     headerBg: 'bg-teal-100 dark:bg-teal-900/40' },
]

const PRIORITY_DOT: Record<string, string> = {
  Low:    'bg-gray-400',
  Normal: 'bg-blue-500',
  High:   'bg-orange-500',
  Urgent: 'bg-red-600',
}

const MOCK_CARDS: BoardCard[] = [
  { id: 'CI-001', jobCardNo: 'JC-2024-001', clientName: 'Ahmed Hassan', deviceType: 'Smartphone', brand: 'Samsung', model: 'Galaxy S23', reportedIssue: 'Screen cracked, touch not working', priority: 'High', status: 'InRepair', assignedTechnicianName: 'Usman Ali', estimatedCost: 8500, createdAt: '2024-05-20T09:30:00Z' },
  { id: 'CI-002', jobCardNo: 'JC-2024-002', clientName: 'Sara Khan', deviceType: 'Laptop', brand: 'Dell', model: 'Inspiron 15', reportedIssue: 'Battery draining fast', priority: 'Normal', status: 'Diagnosing', assignedTechnicianName: 'Bilal Ahmed', estimatedCost: 5000, createdAt: '2024-05-21T11:00:00Z' },
  { id: 'CI-003', jobCardNo: 'JC-2024-003', clientName: 'Raza Malik', deviceType: 'Tablet', brand: 'Apple', model: 'iPad Air 4', reportedIssue: 'Water damage — not turning on', priority: 'Urgent', status: 'AwaitingParts', estimatedCost: 15000, createdAt: '2024-05-19T14:15:00Z' },
  { id: 'CI-004', jobCardNo: 'JC-2024-004', clientName: 'Fatima Nawaz', deviceType: 'Smartphone', brand: 'iPhone', model: '13 Pro Max', reportedIssue: 'Speaker not working', priority: 'Normal', status: 'ReadyForPickup', assignedTechnicianName: 'Usman Ali', estimatedCost: 4500, createdAt: '2024-05-18T08:00:00Z' },
  { id: 'CI-005', jobCardNo: 'JC-2024-005', clientName: 'Omar Farooq', deviceType: 'Smartphone', brand: 'Xiaomi', model: 'Redmi Note 12', reportedIssue: 'Camera not working', priority: 'Low', status: 'Received', createdAt: '2024-05-22T10:30:00Z' },
  { id: 'CI-006', jobCardNo: 'JC-2024-006', clientName: 'Sobia Amin', deviceType: 'Laptop', brand: 'HP', model: 'Envy 13', reportedIssue: 'Keyboard keys stuck', priority: 'Normal', status: 'Completed', assignedTechnicianName: 'Bilal Ahmed', estimatedCost: 3000, createdAt: '2024-05-15T13:00:00Z' },
  { id: 'CI-007', jobCardNo: 'JC-2024-007', clientName: 'Kamran Baig', deviceType: 'Smartphone', brand: 'Oppo', model: 'Reno 10', reportedIssue: 'Phone overheating & slow', priority: 'High', status: 'Received', createdAt: '2024-05-22T14:00:00Z' },
  { id: 'CI-008', jobCardNo: 'JC-2024-008', clientName: 'Lubna Tanvir', deviceType: 'Smartphone', brand: 'Vivo', model: 'Y100', reportedIssue: 'Charging not working', priority: 'Normal', status: 'InRepair', assignedTechnicianName: 'Usman Ali', estimatedCost: 2000, createdAt: '2024-05-21T16:00:00Z' },
]

export const RepairBoardPage: React.FC = () => {
  const tenant         = useAppSelector((s) => s.tenant.tenant)
  const currentStoreId = useAppSelector((s) => s.tenant.currentStoreId)

  const [cards, setCards] = useState<BoardCard[]>(MOCK_CARDS)
  const [dragging, setDragging] = useState<string | null>(null)

  const fetchBoard = useCallback(async () => {
    if (!tenant?.id) return
    try {
      const res = await repairApi.getCheckIns({
        companyId: tenant.id,
        locationId: currentStoreId ?? undefined,
        pageSize: 100,
      })
      const data = res.data?.data ?? res.data
      if (Array.isArray(data) && data.length > 0) setCards(data)
    } catch {
      // keep mock data on error
    }
  }, [tenant?.id, currentStoreId])

  useEffect(() => { fetchBoard() }, [fetchBoard])

  const moveCard = async (cardId: string, newStatus: RepairStatus) => {
    const card = cards.find((c) => c.id === cardId)
    if (!card || card.status === newStatus) return
    setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, status: newStatus } : c))
    try {
      await repairApi.updateCheckInStatus(cardId, newStatus)
    } catch {
      setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, status: card.status } : c))
      toast.error('Failed to move card')
    }
  }

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    setDragging(cardId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('cardId', cardId)
  }

  const handleDrop = (e: React.DragEvent, status: RepairStatus) => {
    e.preventDefault()
    const cardId = e.dataTransfer.getData('cardId')
    if (cardId) moveCard(cardId, status)
    setDragging(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const timeAgo = (iso: string) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
            <LayoutGrid className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Repair Board</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Drag cards to update repair status</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600 inline-block" /> Urgent
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> High
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Normal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> Low
          </span>
        </div>
      </div>

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
        {COLUMNS.map((col) => {
          const colCards = cards.filter((c) => c.status === col.status)
          return (
            <div
              key={col.status}
              className={`flex-shrink-0 w-60 rounded-xl border-2 ${col.color} bg-gray-50 dark:bg-gray-800/50 flex flex-col`}
              onDrop={(e) => handleDrop(e, col.status)}
              onDragOver={handleDragOver}
            >
              {/* Column Header */}
              <div className={`${col.headerBg} px-3 py-2.5 rounded-t-[10px] flex items-center justify-between`}>
                <div className="flex items-center gap-2 font-semibold text-sm text-gray-700 dark:text-gray-200">
                  {col.icon}
                  {col.label}
                </div>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-gray-900/40 px-1.5 py-0.5 rounded-full">
                  {colCards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 min-h-[120px]">
                {colCards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card.id)}
                    onDragEnd={() => setDragging(null)}
                    className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all select-none ${dragging === card.id ? 'opacity-40 scale-95' : ''}`}
                  >
                    {/* Priority dot + Job No */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[card.priority] ?? 'bg-gray-400'}`} />
                        <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">{card.jobCardNo}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">{timeAgo(card.createdAt)}</span>
                    </div>

                    {/* Client & Device */}
                    <div className="mb-1.5">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{card.clientName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{card.brand} {card.model}</div>
                    </div>

                    {/* Issue */}
                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">{card.reportedIssue}</p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                      {card.assignedTechnicianName ? (
                        <div className="flex items-center gap-1">
                          <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex-shrink-0">
                            {card.assignedTechnicianName[0]}
                          </div>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[80px]">{card.assignedTechnicianName}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400">Unassigned</span>
                      )}
                      {card.estimatedCost ? (
                        <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Rs {card.estimatedCost.toLocaleString()}</span>
                      ) : null}
                    </div>

                    {/* Quick move buttons */}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {COLUMNS.filter((c) => c.status !== card.status).slice(0, 3).map((c) => (
                        <button
                          key={c.status}
                          onClick={() => moveCard(card.id, c.status)}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          → {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {colCards.length === 0 && (
                  <div className="text-center py-8 text-gray-300 dark:text-gray-600 text-xs">
                    <div className="w-8 h-8 mx-auto mb-2 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center">
                      <Wrench className="w-4 h-4" />
                    </div>
                    Drop cards here
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {COLUMNS.map((col) => {
          const count = cards.filter((c) => c.status === col.status).length
          return (
            <div key={col.status} className={`rounded-xl border ${col.color} p-3 text-center`}>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{count}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{col.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
