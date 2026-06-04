import React, { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  LayoutGrid,
  Tag,
  ShoppingBag,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppSelector } from '@flowtap/store'
import { inventoryApi } from '@flowtap/api-core'
import { Button, Modal, Input, Select, Badge, Spinner } from '@flowtap/ui-core'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ProductCategory {
  id: string
  name: string
  parentCategoryId?: string | null
  isSubCategoryExist: boolean
  isDirectProductExist: boolean
  isBrandExist: boolean
  sortOrder: number
  isActive: boolean
  iconUrl?: string | null
  color?: string | null
}

interface CategoryForm {
  name: string
  parentCategoryId: string
  sortOrder: string
  isSubCategoryExist: boolean
  isDirectProductExist: boolean
  isBrandExist: boolean
}

const EMPTY_FORM: CategoryForm = {
  name: '',
  parentCategoryId: '',
  sortOrder: '1',
  isSubCategoryExist: false,
  isDirectProductExist: true,
  isBrandExist: false,
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const ProductCategoryPage: React.FC = () => {
  const companyId = useAppSelector((s) => s.tenant.tenant?.id ?? '')

  // ── Data state ──
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  // ── Modal state ──
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null)
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // ── Delete confirm ──
  const [deleteTarget, setDeleteTarget] = useState<ProductCategory | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // ─── Fetch ────────────────────────────────────────────────────────────────────

  const fetchCategories = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const res = await inventoryApi.getCategories({ companyId, isActive: undefined })
      const data: ProductCategory[] = (res.data?.data ?? res.data ?? []).map((c: Record<string, unknown>) => ({
        id: String(c.id ?? ''),
        name: String(c.name ?? ''),
        parentCategoryId: c.parentCategoryId ? String(c.parentCategoryId) : null,
        isSubCategoryExist: Boolean(c.isSubCategoryExist),
        isDirectProductExist: Boolean(c.isDirectProductExist),
        isBrandExist: Boolean(c.isBrandExist),
        sortOrder: Number(c.sortOrder ?? 0),
        isActive: Boolean(c.isActive ?? true),
        iconUrl: c.iconUrl ? String(c.iconUrl) : null,
        color: c.color ? String(c.color) : null,
      }))
      setCategories(data)
    } catch {
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // ─── Tree helpers ─────────────────────────────────────────────────────────────

  const rootCategories = categories
    .filter((c) => !c.parentCategoryId)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const childrenOf = (parentId: string) =>
    categories
      .filter((c) => c.parentCategoryId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ─── Modal helpers ────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingCategory(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (cat: ProductCategory) => {
    setEditingCategory(cat)
    setForm({
      name: cat.name,
      parentCategoryId: cat.parentCategoryId ?? '',
      sortOrder: String(cat.sortOrder),
      isSubCategoryExist: cat.isSubCategoryExist,
      isDirectProductExist: cat.isDirectProductExist,
      isBrandExist: cat.isBrandExist,
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingCategory(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Category name is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        companyId,
        name: form.name.trim(),
        parentCategoryId: form.parentCategoryId || null,
        sortOrder: parseInt(form.sortOrder, 10) || 1,
        isSubCategoryExist: form.isSubCategoryExist,
        isDirectProductExist: form.isDirectProductExist,
        isBrandExist: form.isBrandExist,
      }
      if (editingCategory) {
        await inventoryApi.updateCategory(editingCategory.id, payload)
        toast.success('Category updated')
      } else {
        await inventoryApi.createCategory(payload)
        toast.success('Category created')
      }
      closeModal()
      fetchCategories()
    } catch {
      toast.error('Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete helpers ───────────────────────────────────────────────────────────

  const confirmDelete = (cat: ProductCategory) => {
    setDeleteTarget(cat)
    setDeleteConfirmOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await inventoryApi.deleteCategory(deleteTarget.id)
      toast.success('Category deactivated')
      setDeleteConfirmOpen(false)
      setDeleteTarget(null)
      fetchCategories()
    } catch {
      toast.error('Failed to deactivate category')
    } finally {
      setDeleting(false)
    }
  }

  // ─── Category row renderer ────────────────────────────────────────────────────

  const renderCategoryRow = (cat: ProductCategory, depth = 0) => {
    const children = childrenOf(cat.id)
    const hasChildren = children.length > 0
    const isExpanded = expandedIds.has(cat.id)
    const isSelected = selectedCategoryId === cat.id

    return (
      <React.Fragment key={cat.id}>
        <tr
          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
            isSelected ? 'bg-blue-50' : ''
          } ${!cat.isActive ? 'opacity-50' : ''}`}
          onClick={() => setSelectedCategoryId(isSelected ? null : cat.id)}
        >
          {/* Name + expand/collapse */}
          <td className="py-3 pr-4">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
              {hasChildren ? (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleExpand(cat.id) }}
                  className="p-0.5 rounded hover:bg-gray-200 text-gray-400"
                >
                  {isExpanded
                    ? <ChevronDown className="w-4 h-4" />
                    : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <span className="w-5" />
              )}
              <span className={`text-sm font-medium ${depth === 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                {cat.name}
              </span>
            </div>
          </td>

          {/* Badges */}
          <td className="py-3 pr-4">
            <div className="flex flex-wrap gap-1">
              {cat.isSubCategoryExist && (
                <Badge variant="outline" className="text-xs">
                  <LayoutGrid className="w-3 h-3 mr-1" />
                  Sub-cats
                </Badge>
              )}
              {cat.isBrandExist && (
                <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                  <Tag className="w-3 h-3 mr-1" />
                  Brands
                </Badge>
              )}
              {cat.isDirectProductExist && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                  <ShoppingBag className="w-3 h-3 mr-1" />
                  Products
                </Badge>
              )}
            </div>
          </td>

          {/* Sort order */}
          <td className="py-3 pr-4 text-sm text-gray-500 text-center">
            {cat.sortOrder}
          </td>

          {/* Active status */}
          <td className="py-3 pr-4 text-sm">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              cat.isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {cat.isActive ? 'Active' : 'Inactive'}
            </span>
          </td>

          {/* Actions */}
          <td className="py-3 text-right">
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); openEdit(cat) }}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                title="Edit category"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); confirmDelete(cat) }}
                className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                title="Deactivate category"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </td>
        </tr>

        {/* Render children if expanded */}
        {isExpanded && children.map((child) => renderCategoryRow(child, depth + 1))}
      </React.Fragment>
    )
  }

  // ─── Parent category options for the form dropdown ────────────────────────────

  const parentOptions = [
    { value: '', label: 'None (top-level)' },
    ...categories
      .filter((c) => !c.parentCategoryId && (!editingCategory || c.id !== editingCategory.id))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({ value: c.id, label: c.name })),
  ]

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Categories</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your product hierarchy and device brand assignments
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      {/* ── Categories ───────────────────────────────────────────────────────── */}
      {(
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner />
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <LayoutGrid className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No categories yet</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
                Add your first category
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="py-3 pr-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="py-3 pr-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="py-3 pr-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="py-3 pr-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rootCategories.map((cat) => renderCategoryRow(cat, 0))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}


      {/* ── Create / Edit Modal ─────────────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
      >
        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. Spare Parts"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parent Category
            </label>
            <Select
              value={form.parentCategoryId}
              onChange={(e) => setForm((f) => ({ ...f, parentCategoryId: e.target.value }))}
              options={parentOptions}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort Order
            </label>
            <Input
              type="number"
              min="1"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Options</label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isSubCategoryExist}
                onChange={(e) => setForm((f) => ({ ...f, isSubCategoryExist: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              Has Sub-categories
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDirectProductExist}
                onChange={(e) => setForm((f) => ({ ...f, isDirectProductExist: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              Has Direct Products
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isBrandExist}
                onChange={(e) => setForm((f) => ({ ...f, isBrandExist: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              Has Brands (device brand filtering)
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={closeModal} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size="sm" /> : editingCategory ? 'Save Changes' : 'Create'}
          </Button>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ────────────────────────────────────────────────── */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setDeleteTarget(null) }}
        title="Deactivate Category"
      >
        <p className="text-sm text-gray-600 mt-2">
          Are you sure you want to deactivate{' '}
          <span className="font-semibold text-gray-900">{deleteTarget?.name}</span>?
          It will be hidden from the interface but not permanently deleted.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => { setDeleteConfirmOpen(false); setDeleteTarget(null) }}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Spinner size="sm" /> : 'Deactivate'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
