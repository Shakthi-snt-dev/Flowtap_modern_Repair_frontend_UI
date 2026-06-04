import api from './axiosInstance'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TechnicalFault {
  id: string
  symptom: string
  possibleCause?: string
  standardSolution?: string
  isActive: boolean
}

export interface ChecklistTemplate {
  id: string
  name: string
  jsonItems: string   // JSON array of step strings
  isActive: boolean
}

export interface AuditLogEntry {
  id: string
  entityName: string
  entityId: string
  action: string           // Create | Update | Delete
  oldValues?: string       // JSON
  newValues?: string       // JSON
  changedColumns?: string
  userId?: string
  performedByName?: string
  ipAddress?: string
  locationId?: string
  createdAt: string
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const knowledgeApi = {
  // ── Technical Faults ──────────────────────────────────────────────────────
  getFaults(params: { search?: string }) {
    return api.get<{ data: TechnicalFault[] }>('/knowledge/faults', { params })
  },
  createFault(data: { symptom: string; possibleCause?: string; standardSolution?: string }) {
    return api.post('/knowledge/faults', data)
  },
  updateFault(id: string, data: { symptom: string; possibleCause?: string; standardSolution?: string }) {
    return api.put(`/knowledge/faults/${id}`, data)
  },
  deleteFault(id: string) {
    return api.delete(`/knowledge/faults/${id}`)
  },

  // ── Checklist Templates ───────────────────────────────────────────────────
  getChecklists() {
    return api.get<{ data: ChecklistTemplate[] }>('/knowledge/checklists')
  },
  createChecklist(data: { name: string; jsonItems: string }) {
    return api.post('/knowledge/checklists', data)
  },
  updateChecklist(id: string, data: { name: string; jsonItems: string }) {
    return api.put(`/knowledge/checklists/${id}`, data)
  },
  deleteChecklist(id: string) {
    return api.delete(`/knowledge/checklists/${id}`)
  },
}

export const auditApi = {
  getLogs(params: {
    entityType?: string
    action?: string
    search?: string
    page?: number
    pageSize?: number
  }) {
    return api.get('/audit-logs', { params })
  },
}
