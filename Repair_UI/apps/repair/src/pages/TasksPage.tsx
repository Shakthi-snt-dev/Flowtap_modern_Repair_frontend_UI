import React, { useState, useEffect, useRef } from 'react'
import { useAppSelector } from '@flowtap/store'
import { ticketsApi } from '@flowtap/api-core'
import { Modal, Select, Input, Button, Spinner, Badge } from '@flowtap/ui-core'
import {
  ClipboardList, Plus, Calendar, AlertCircle, Clock, Tag, ArrowRight,
  Play, Square, Timer, User, ExternalLink, Search,
} from 'lucide-react'
import { cn } from '@flowtap/shared'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

interface TaskDto {
  id: string
  title: string
  description: string
  priority: string
  status: string
  deadline?: string
  completedAt?: string
  ticketId?: string
  ticketCode?: string
  assigneeEmployeeId: string
  assigneeName: string
  authorEmployeeId: string
  authorName: string
  tags: string[]
  isTimerRunning: boolean
  totalTimeSpentSeconds: number
}

// â”€â”€â”€ Status config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ALL_STATUSES = [
  { value: 'New',        label: 'New',         color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  { value: 'InProgress', label: 'In Progress',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'OnHold',     label: 'On Hold',      color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  { value: 'Testing',    label: 'Testing',      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  { value: 'Done',       label: 'Done',         color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  { value: 'Cancelled',  label: 'Cancelled',    color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  { value: 'Rejected',   label: 'Rejected',     color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
]

const STATUS_BADGE: Record<string, 'default' | 'info' | 'warning' | 'purple' | 'success' | 'danger'> = {
  New: 'default', InProgress: 'info', OnHold: 'warning',
  Testing: 'purple', Done: 'success', Cancelled: 'danger', Rejected: 'danger',
}

const formatTimer = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// â”€â”€â”€ Task Detail Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface TaskDetailModalProps {
  task: TaskDto | null
  onClose: () => void
  onUpdated: () => void
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose, onUpdated }) => {
  const navigate = useNavigate()
  const [selectedStatus, setSelectedStatus] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [togglingTimer, setTogglingTimer] = useState(false)
  const [liveSeconds, setLiveSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Sync state when task changes
  useEffect(() => {
    if (!task) return
    setSelectedStatus(task.status)
    setLiveSeconds(task.totalTimeSpentSeconds)
  }, [task])

  // Live tick when timer is running
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (task?.isTimerRunning) {
      timerRef.current = setInterval(() => setLiveSeconds(s => s + 1), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [task?.isTimerRunning, task?.id])

  if (!task) return null

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === selectedStatus) return
    setUpdatingStatus(true)
    try {
      await ticketsApi.updateTaskStatus(task.id, newStatus)
      setSelectedStatus(newStatus)
      toast.success(`Status -> ${ALL_STATUSES.find(s => s.value === newStatus)?.label ?? newStatus}`)
      onUpdated()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleToggleTimer = async () => {
    setTogglingTimer(true)
    try {
      await ticketsApi.toggleTaskTimer(task.id)
      toast.success(task.isTimerRunning ? 'Timer stopped' : 'Timer started')
      onUpdated()
      onClose() // reload resets live state; close so parent reloads
    } catch {
      toast.error('Failed to toggle timer')
    } finally {
      setTogglingTimer(false)
    }
  }

  const statusCfg = ALL_STATUSES.find(s => s.value === selectedStatus) ?? ALL_STATUSES[0]
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && selectedStatus !== 'Done'
  const isTerminal = ['Done', 'Cancelled', 'Rejected'].includes(selectedStatus)

  return (
    <Modal open={!!task} onClose={onClose} title="" size="md">
      <div className="space-y-5">

        {/* â”€â”€ Title + Priority â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">{task.title}</h2>
            <Badge variant={task.priority === 'Critical' ? 'danger' : task.priority === 'High' ? 'warning' : task.priority === 'Medium' ? 'info' : 'default'}>
              {task.priority}
            </Badge>
          </div>
          {task.description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{task.description}</p>
          )}
        </div>

        {/* â”€â”€ Status selector â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</p>
          <div className="flex flex-wrap gap-2">
            {ALL_STATUSES.map(s => (
              <button
                key={s.value}
                disabled={updatingStatus}
                onClick={() => handleStatusChange(s.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border-2',
                  selectedStatus === s.value
                    ? `${s.color} border-current scale-105 shadow-sm`
                    : 'border-transparent bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                {s.label}
                {selectedStatus === s.value && updatingStatus && (
                  <span className="ml-1 inline-block w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* â”€â”€ Timer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className={cn(
          'flex items-center justify-between p-4 rounded-xl border',
          task.isTimerRunning
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
            : 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              task.isTimerRunning ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
            )}>
              <Timer className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                {task.isTimerRunning ? 'Timer running...' : 'Time tracked'}
              </p>
              <p className={cn(
                'text-xl font-black tabular-nums',
                task.isTimerRunning ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'
              )}>
                {formatTimer(liveSeconds)}
              </p>
            </div>
          </div>
          <Button
            onClick={handleToggleTimer}
            loading={togglingTimer}
            disabled={isTerminal}
            className={cn(
              'gap-2 font-bold',
              task.isTimerRunning
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            )}
          >
            {task.isTimerRunning
              ? <><Square className="w-4 h-4 fill-current" /> Stop</>
              : <><Play className="w-4 h-4 fill-current" /> Start</>}
          </Button>
        </div>

        {/* â”€â”€ Meta â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <User className="w-4 h-4 shrink-0" />
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Assignee</p>
              <p className="font-medium text-gray-800 dark:text-gray-200">{task.assigneeName || '-'}</p>
            </div>
          </div>
          {task.deadline && (
            <div className={cn('flex items-center gap-2', isOverdue ? 'text-red-500' : 'text-gray-500')}>
              <Calendar className="w-4 h-4 shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider opacity-70">Deadline</p>
                <p className="font-medium">
                  {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  {isOverdue && <span className="ml-1 text-red-500 font-bold">Overdue!</span>}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {task.tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                <Tag className="w-3 h-3" />{tag}
              </span>
            ))}
          </div>
        )}

        {/* Linked ticket */}
        {task.ticketId && (
          <button
            onClick={() => { navigate(`/tickets/${task.ticketId}`); onClose() }}
            className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              View linked ticket {task.ticketCode ? `#${task.ticketCode}` : ''}
            </span>
            <ExternalLink className="w-4 h-4 opacity-60" />
          </button>
        )}

      </div>
    </Modal>
  )
}

export const TasksPage: React.FC = () => {
  const tenant = useAppSelector((s) => s.tenant.tenant)
  const currentStoreId = useAppSelector((s) => s.tenant.currentStoreId)
  const currentEmployeeId = useAppSelector((s) => s.auth.user?.employeeId)

  const [tasks, setTasks] = useState<TaskDto[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'assigned' | 'delegated' | 'all'>('assigned')

  // Detail modal
  const [selectedTask, setSelectedTask] = useState<TaskDto | null>(null)

  // Create Modal state
  const [createOpen, setCreateOpen] = useState(false)
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([])
  const [tickets, setTickets] = useState<{ id: string; code: string; clientName?: string }[]>([])
  const [loadingModalData, setLoadingModalData] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    assigneeEmployeeId: '',
    priority: 'Medium',
    deadline: '',
    ticketId: '',
    tagsRaw: '',
  })

  // Load Tasks - builds the correct server-side filter for each tab
  const loadTasks = () => {
    if (!tenant?.id) return
    setLoading(true)

    const params: Parameters<typeof ticketsApi.getTasks>[0] = { companyId: tenant.id }

    if (activeTab === 'assigned' && currentEmployeeId) {
      // "Assigned to Me" - server filters by assigneeEmployeeId
      params.assigneeEmployeeId = currentEmployeeId
    } else if (activeTab === 'delegated' && currentEmployeeId) {
      // "I Assigned" - server filters by authorEmployeeId
      params.authorEmployeeId = currentEmployeeId
    }
    // 'all' tab sends no employee filter

    ticketsApi.getTasks(params)
      .then((res) => {
        const raw = res.data?.data ?? res.data ?? []
        const mapped = (Array.isArray(raw) ? raw : []).map((t: any) => ({
          ...t,
          id:                    String(t.id),
          assigneeEmployeeId:    String(t.assigneeEmployeeId ?? ''),
          authorEmployeeId:      String(t.authorEmployeeId ?? ''),
          assigneeName:          String(t.assigneeName ?? ''),
          authorName:            String(t.authorName ?? ''),
          isTimerRunning:        Boolean(t.isTimerRunning ?? false),
          totalTimeSpentSeconds: Number(t.totalTimeSpentSeconds ?? 0),
          tags:                  Array.isArray(t.tags) ? t.tags : [],
        }))
        setTasks(mapped)
        // Refresh selected task if the modal is open
        if (selectedTask) {
          const refreshed = mapped.find((t: TaskDto) => t.id === selectedTask.id)
          if (refreshed) setSelectedTask(refreshed)
        }
      })
      .catch(() => {
        toast.error('Failed to load tasks')
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    loadTasks()
  }, [tenant?.id, activeTab, currentEmployeeId])

  // Load form helpers (employees, tickets) when modal opens
  const loadModalData = async () => {
    if (!tenant?.id) return
    setLoadingModalData(true)
    try {
      // Load active employees
      const { employeesApi } = await import('@flowtap/api-core')
      const empRes = await employeesApi.getEmployees({ companyId: tenant.id, isActive: true, pageSize: 150 })
      const rawEmp = empRes.data?.data?.items ?? empRes.data?.data ?? []
      setEmployees((Array.isArray(rawEmp) ? rawEmp : []).map((e: any) => ({
        id: String(e.id),
        name: String(e.name ?? ''),
      })))

      // Load tickets list
      const tickRes = await ticketsApi.getTickets({ companyId: tenant.id })
      const rawTick = tickRes.data?.data?.items ?? tickRes.data?.data ?? []
      setTickets((Array.isArray(rawTick) ? rawTick : []).map((t: any) => ({
        id: String(t.id),
        code: String(t.ticketCode ?? t.code ?? t.id.slice(0, 8)),
        clientName: t.clientName,
      })))
    } catch {
      toast.error('Failed to load employee/ticket directory')
    } finally {
      setLoadingModalData(false)
    }
  }

  useEffect(() => {
    if (createOpen) {
      loadModalData()
      setForm({
        title: '',
        description: '',
        assigneeEmployeeId: currentEmployeeId || '',
        priority: 'Medium',
        deadline: '',
        ticketId: '',
        tagsRaw: '',
      })
    }
  }, [createOpen])

  // Toggle status
  const handleToggleStatus = async (task: TaskDto) => {
    const nextStatus = task.status === 'Done' ? 'New' : 'Done'
    try {
      await ticketsApi.updateTaskStatus(task.id, nextStatus)
      toast.success(nextStatus === 'Done' ? 'Task marked complete!' : 'Task status reset')
      loadTasks()
    } catch {
      toast.error('Failed to update task status')
    }
  }

  // Handle Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!form.assigneeEmployeeId) {
      toast.error('Please assign a technician')
      return
    }

    try {
      await ticketsApi.createTask({
        locationId: currentStoreId || undefined,
        authorEmployeeId: currentEmployeeId || undefined,
        assigneeEmployeeId: form.assigneeEmployeeId,
        title: form.title,
        description: form.description,
        priority: form.priority,
        deadline: form.deadline || undefined,
        ticketId: form.ticketId || undefined,
        tags: form.tagsRaw ? form.tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [],
      })
      toast.success('Task created successfully!')
      setCreateOpen(false)
      loadTasks()
    } catch {
      toast.error('Failed to create task')
    }
  }

  // Client-side search filter only (tab filtering is now server-side)
  const displayedTasks = tasks.filter((task) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      task.title.toLowerCase().includes(q) ||
      task.description.toLowerCase().includes(q) ||
      task.assigneeName.toLowerCase().includes(q) ||
      task.authorName.toLowerCase().includes(q)
    )
  })

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'danger'
      case 'High': return 'warning'
      case 'Medium': return 'info'
      default: return 'success'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Tasks Directory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Monitor and update checklist items, tech workloads, and device repair queues.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Task
        </Button>
      </div>

      {/* Tabs & Search Controls */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('assigned')}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              activeTab === 'assigned'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            )}
          >
            Assigned to Me
          </button>
          <button
            onClick={() => setActiveTab('delegated')}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              activeTab === 'delegated'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            )}
          >
            I Assigned
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              activeTab === 'all'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            )}
          >
            All Tasks
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks title, description, or technician..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Tasks Content */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : displayedTasks.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
          <ClipboardList className="w-12 h-12 mx-auto text-gray-400 mb-3 opacity-60" />
          <p className="font-semibold text-gray-900 dark:text-white">No tasks found</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {search ? 'Try adjusting your search criteria.' : 'Create a new task to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedTasks.map((task) => {
            const isDone = task.status === 'Done'
            const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !isDone

            return (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className={cn(
                  "p-4 bg-white dark:bg-gray-900 rounded-xl border transition-all flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700",
                  isDone ? "border-gray-100 dark:border-gray-800 opacity-75" : "border-gray-200 dark:border-gray-800",
                  task.isTimerRunning && "border-green-300 dark:border-green-700 shadow-green-100 dark:shadow-green-900/20 shadow-md"
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox stops propagation so it doesn't open modal */}
                      <input
                        type="checkbox"
                        checked={isDone}
                        onClick={e => e.stopPropagation()}
                        onChange={() => handleToggleStatus(task)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                      />
                      <h3 className={cn(
                        "font-semibold text-gray-900 dark:text-white text-base leading-snug truncate",
                        isDone && "line-through text-gray-400 dark:text-gray-500"
                      )}>
                        {task.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.isTimerRunning && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full animate-pulse">
                          <Timer className="w-3 h-3" /> Running
                        </span>
                      )}
                      <Badge variant={getPriorityBadgeColor(task.priority)} size="sm">
                        {task.priority}
                      </Badge>
                    </div>
                  </div>

                  <p className={cn(
                    "text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 pl-8",
                    isDone && "text-gray-400 dark:text-gray-600"
                  )}>
                    {task.description || <span className="italic text-gray-400">No description provided</span>}
                  </p>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex flex-wrap gap-2 justify-between items-center text-xs">
                  <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">{task.assigneeName || 'Unassigned'}</span>
                    </span>
                    {activeTab === 'all' && task.authorName && task.authorName !== task.assigneeName && (
                      <span className="flex items-center gap-1 text-gray-400 text-[10px]">
                        by {task.authorName}
                      </span>
                    )}
                    {task.totalTimeSpentSeconds > 0 && (
                      <span className="flex items-center gap-1 text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTimer(task.totalTimeSpentSeconds)}
                      </span>
                    )}
                    {task.deadline && (
                      <span className={cn(
                        "flex items-center gap-1",
                        isOverdue ? "text-red-500 font-semibold" : "text-gray-500"
                      )}>
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        {isOverdue && <AlertCircle className="w-3.5 h-3.5 animate-pulse" />}
                      </span>
                    )}
                  </div>

                  {/* Status pill */}
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold',
                    ALL_STATUSES.find(s => s.value === task.status)?.color ?? 'bg-gray-100 text-gray-500'
                  )}>
                    {ALL_STATUSES.find(s => s.value === task.status)?.label ?? task.status}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdated={loadTasks}
      />

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Task"
        size="md"
      >
        {loadingModalData ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <form onSubmit={handleCreateTask} className="space-y-4">
            <Input
              label="Task Title *"
              placeholder="e.g. Replace logic board capacitor"
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detail repair steps, diagnostic observations, or notes..."
                className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Assignee Technician *"
                value={form.assigneeEmployeeId}
                onChange={(e) => setForm(prev => ({ ...prev, assigneeEmployeeId: e.target.value }))}
                options={employees.map(e => ({ value: e.id, label: e.name }))}
                placeholder="Select technician"
              />
              <Select
                label="Priority"
                value={form.priority}
                onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}
                options={[
                  { value: 'Low', label: 'Low' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'High', label: 'High' },
                  { value: 'Critical', label: 'Critical' },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Due Date"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm(prev => ({ ...prev, deadline: e.target.value }))}
              />
              <Select
                label="Linked Ticket (Optional)"
                value={form.ticketId}
                onChange={(e) => setForm(prev => ({ ...prev, ticketId: e.target.value }))}
                options={tickets.map(t => ({
                  value: t.id,
                  label: `${t.code} (${t.clientName || 'Walk-in'})`,
                }))}
                placeholder="Select ticket"
              />
            </div>

            <Input
              label="Tags (Comma separated)"
              placeholder="e.g. glass, screen, urgent"
              value={form.tagsRaw}
              onChange={(e) => setForm(prev => ({ ...prev, tagsRaw: e.target.value }))}
            />

            <div className="flex justify-end gap-2 border-t border-gray-100 dark:border-gray-800 pt-3 mt-4">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Create Task
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
