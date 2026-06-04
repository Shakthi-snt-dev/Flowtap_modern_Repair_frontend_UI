import { api } from '@flowtap/api-core'

export const repairApi = {
  // ── Device Check-Ins ──────────────────────────────────────────────────────
  getCheckIns(params: {
    companyId: string
    locationId?: string
    status?: string
    search?: string
    page?: number
    pageSize?: number
  }) {
    return api.get('/repair/check-ins', { params })
  },
  getCheckIn(id: string) {
    return api.get(`/repair/check-ins/${id}`)
  },
  createCheckIn(data: {
    companyId: string
    locationId?: string
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
    accessoryHandedIn?: string
    estimatedCost?: number
    advanceCollected?: number
    assignedTechnicianId?: string
    priority?: 'Low' | 'Normal' | 'High' | 'Urgent'
    notes?: string
  }) {
    return api.post('/repair/check-ins', data)
  },
  updateCheckIn(id: string, data: Record<string, unknown>) {
    return api.put(`/repair/check-ins/${id}`, data)
  },
  updateCheckInStatus(id: string, status: string, notes?: string) {
    return api.patch(`/repair/check-ins/${id}/status`, { status, notes })
  },
  deleteCheckIn(id: string) {
    return api.delete(`/repair/check-ins/${id}`)
  },
  printJobCard(id: string) {
    return api.get(`/repair/check-ins/${id}/job-card`, { responseType: 'blob' })
  },

  // ── Warranty Claims ───────────────────────────────────────────────────────
  getWarrantyClaims(params: {
    companyId: string
    locationId?: string
    status?: string
    search?: string
    page?: number
    pageSize?: number
  }) {
    return api.get('/repair/warranty-claims', { params })
  },
  getWarrantyClaim(id: string) {
    return api.get(`/repair/warranty-claims/${id}`)
  },
  createWarrantyClaim(data: {
    companyId: string
    locationId?: string
    clientName: string
    clientPhone: string
    deviceType: string
    brand: string
    model: string
    serialNumber?: string
    purchaseDate?: string
    warrantyExpiry?: string
    issueDescription: string
    claimType: 'Repair' | 'Replacement' | 'Refund'
    vendorName?: string
    notes?: string
  }) {
    return api.post('/repair/warranty-claims', data)
  },
  updateWarrantyClaim(id: string, data: Record<string, unknown>) {
    return api.put(`/repair/warranty-claims/${id}`, data)
  },
  updateWarrantyClaimStatus(id: string, status: string, resolution?: string) {
    return api.patch(`/repair/warranty-claims/${id}/status`, { status, resolution })
  },

  // ── Repair Board (status counts for the kanban board) ────────────────────
  getBoardSummary(params: { companyId: string; locationId?: string }) {
    return api.get('/repair/board/summary', { params })
  },
}
