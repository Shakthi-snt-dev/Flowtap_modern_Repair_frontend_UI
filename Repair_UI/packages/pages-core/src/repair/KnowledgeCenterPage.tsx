import React, { useState, useEffect, useCallback } from 'react'
import { BookOpen, Plus, Edit2, Trash2, Search, CheckSquare, Zap, X, ChevronDown, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppSelector } from '@flowtap/store'
import { knowledgeApi, type TechnicalFault, type ChecklistTemplate } from '@flowtap/api-core'
import { Button, Modal, Input, Spinner, Badge } from '@flowtap/ui-core'

// ─── Component ────────────────────────────────────────────────────────────────

export const KnowledgeCenterPage: React.FC = () => {
  const tenant = useAppSelector((s) => s.tenant.tenant)
  const [tab, setTab] = useState<'faults' | 'checklists'>('faults')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-indigo-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Center</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Repair guides, fault database and checklist templates
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setTab('faults')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
            tab === 'faults'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Zap className="w-4 h-4" /> Fault Database
        </button>
        <button
          onClick={() => setTab('checklists')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
            tab === 'checklists'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <CheckSquare className="w-4 h-4" /> Checklist Templates
        </button>
      </div>

      {tab === 'faults'     && <FaultsTab     companyId={tenant?.id ?? ''} />}
      {tab === 'checklists' && <ChecklistsTab companyId={tenant?.id ?? ''} />}
    </div>
  )
}

// ─── Faults Tab ───────────────────────────────────────────────────────────────

const FaultsTab: React.FC<{ companyId: string }> = ({ companyId }) => {
  const [faults, setFaults]           = useState<TechnicalFault[]>([])
  const [loading, setLoading]         = useState(false)
  const [search, setSearch]           = useState('')
  const [modalOpen, setModalOpen]     = useState(false)
  const [editing, setEditing]         = useState<TechnicalFault | null>(null)
  const [expanded, setExpanded]       = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [form, setForm]               = useState({ symptom: '', possibleCause: '', standardSolution: '' })

  const load = useCallback(() => {
    if (!companyId) return
    setLoading(true)
    knowledgeApi.getFaults({ search: search || undefined })
      .then(res => setFaults(res.data?.data ?? res.data ?? []))
      .catch(() => toast.error('Failed to load fault database'))
      .finally(() => setLoading(false))
  }, [companyId, search])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); setForm({ symptom: '', possibleCause: '', standardSolution: '' }); setModalOpen(true) }
  const openEdit = (f: TechnicalFault) => {
    setEditing(f)
    setForm({ symptom: f.symptom, possibleCause: f.possibleCause ?? '', standardSolution: f.standardSolution ?? '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.symptom.trim()) { toast.error('Symptom is required'); return }
    setSaving(true)
    try {
      if (editing) {
        await knowledgeApi.updateFault(editing.id, form)
        toast.success('Fault updated')
      } else {
        await knowledgeApi.createFault(form)
        toast.success('Fault added to database')
      }
      setModalOpen(false)
      load()
    } catch { toast.error('Failed to save') } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this fault from the database?')) return
    setDeletingId(id)
    try { await knowledgeApi.deleteFault(id); toast.success('Removed'); load() }
    catch { toast.error('Failed to delete') } finally { setDeletingId(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search symptoms, causes, solutions..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>Add Fault</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : faults.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No faults in database yet</p>
          <p className="text-sm mt-1">Add common symptoms and their solutions to help technicians</p>
        </div>
      ) : (
        <div className="space-y-2">
          {faults.map(f => (
            <div key={f.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                onClick={() => setExpanded(expanded === f.id ? null : f.id)}
              >
                {expanded === f.id
                  ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="font-medium text-gray-800 dark:text-gray-200 flex-1">{f.symptom}</span>
                <div className="flex gap-1 shrink-0">
                  <button onClick={e => { e.stopPropagation(); openEdit(f) }} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(f.id) }} disabled={!!deletingId}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg disabled:opacity-40">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </button>

              {expanded === f.id && (
                <div className="px-4 pb-4 pt-0 space-y-3 border-t border-gray-100 dark:border-gray-700">
                  {f.possibleCause && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Possible Cause</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{f.possibleCause}</p>
                    </div>
                  )}
                  {f.standardSolution && (
                    <div>
                      <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Standard Solution</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{f.standardSolution}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Fault' : 'Add Fault'}>
        <div className="space-y-4">
          <Input label="Symptom / Problem *" value={form.symptom}
            onChange={e => setForm(f => ({ ...f, symptom: e.target.value }))}
            placeholder="e.g. Phone won't charge" />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Possible Cause</label>
            <textarea value={form.possibleCause} onChange={e => setForm(f => ({ ...f, possibleCause: e.target.value }))}
              rows={2} placeholder="e.g. Damaged charging port, bent pins..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Standard Solution</label>
            <textarea value={form.standardSolution} onChange={e => setForm(f => ({ ...f, standardSolution: e.target.value }))}
              rows={4} placeholder="Step-by-step solution..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Spinner size="sm" /> : editing ? 'Update' : 'Add Fault'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Checklists Tab ───────────────────────────────────────────────────────────

const ChecklistsTab: React.FC<{ companyId: string }> = ({ companyId }) => {
  const [templates, setTemplates]   = useState<ChecklistTemplate[]>([])
  const [loading, setLoading]       = useState(false)
  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState<ChecklistTemplate | null>(null)
  const [saving, setSaving]         = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expanded, setExpanded]     = useState<string | null>(null)

  // Form: name + list of step strings
  const [name, setName]   = useState('')
  const [steps, setSteps] = useState<string[]>([''])

  const load = useCallback(() => {
    if (!companyId) return
    setLoading(true)
    knowledgeApi.getChecklists()
      .then(res => setTemplates(res.data?.data ?? res.data ?? []))
      .catch(() => toast.error('Failed to load checklists'))
      .finally(() => setLoading(false))
  }, [companyId])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); setName(''); setSteps(['']); setModalOpen(true) }
  const openEdit = (t: ChecklistTemplate) => {
    setEditing(t)
    setName(t.name)
    try { setSteps(JSON.parse(t.jsonItems) as string[]) } catch { setSteps([]) }
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Template name is required'); return }
    const validSteps = steps.filter(s => s.trim())
    if (validSteps.length === 0) { toast.error('Add at least one step'); return }
    setSaving(true)
    try {
      const payload = { name: name.trim(), jsonItems: JSON.stringify(validSteps) }
      if (editing) { await knowledgeApi.updateChecklist(editing.id, payload); toast.success('Checklist updated') }
      else { await knowledgeApi.createChecklist(payload); toast.success('Checklist created') }
      setModalOpen(false); load()
    } catch { toast.error('Failed to save') } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this checklist template?')) return
    setDeletingId(id)
    try { await knowledgeApi.deleteChecklist(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed to delete') } finally { setDeletingId(null) }
  }

  const parseSteps = (t: ChecklistTemplate): string[] => {
    try { return JSON.parse(t.jsonItems) as string[] } catch { return [] }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>Add Checklist</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No checklist templates yet</p>
          <p className="text-sm mt-1">Create templates for pre-repair checks, post-repair QA etc.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(t => {
            const steps = parseSteps(t)
            return (
              <div key={t.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                  {expanded === t.id ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                  <CheckSquare className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="font-medium text-gray-800 dark:text-gray-200 flex-1">{t.name}</span>
                  <Badge variant="default" className="text-xs">{steps.length} steps</Badge>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button onClick={e => { e.stopPropagation(); openEdit(t) }} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(t.id) }} disabled={!!deletingId} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg disabled:opacity-40"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </button>
                {expanded === t.id && (
                  <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                    <ol className="mt-3 space-y-1.5">
                      {steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 text-xs flex items-center justify-center font-semibold mt-0.5">{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Checklist' : 'New Checklist'}>
        <div className="space-y-4">
          <Input label="Template Name *" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Pre-Repair Phone Check" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Steps *</label>
              <button onClick={() => setSteps(s => [...s, ''])}
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Step
              </button>
            </div>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400 font-mono w-5 text-right shrink-0">{i + 1}.</span>
                  <input value={step} onChange={e => setSteps(s => s.map((v, j) => j === i ? e.target.value : v))}
                    placeholder={`Step ${i + 1}`}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                  {steps.length > 1 && (
                    <button onClick={() => setSteps(s => s.filter((_, j) => j !== i))}
                      className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Spinner size="sm" /> : editing ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
