import React, { useState, useEffect, useCallback } from 'react'
import { Smartphone, Plus, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppSelector } from '@flowtap/store'
import { inventoryApi } from '@flowtap/api-core'
import { Button, Modal, Badge, Spinner, Input, Select } from '@flowtap/ui-core'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeviceBrand {
  id: string
  name: string
  iconUrl: string | null
  productCategoryId: string | null
  isActive: boolean
}

interface DeviceModel {
  id: string
  name: string
  brandId: string
  brandName: string
  productCategoryId: string | null
  imageUrl: string | null
  isActive: boolean
}

// ─── Forms ───────────────────────────────────────────────────────────────────

interface BrandForm {
  name: string
  iconUrl: string
  productCategoryId: string
}

interface ModelForm {
  name: string
  brandId: string
  imageUrl: string
  productCategoryId: string
}

const EMPTY_BRAND: BrandForm = { name: '', iconUrl: '', productCategoryId: '' }
const EMPTY_MODEL: ModelForm = { name: '', brandId: '', imageUrl: '', productCategoryId: '' }

interface Category {
  id: string
  name: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DeviceCatalogPage: React.FC = () => {
  const tenant = useAppSelector((s) => s.tenant.tenant)

  // Categories (for brand + model mapping & forms)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  // Search filter
  const [searchTerm, setSearchTerm] = useState('')

  // Expandable Brand row state
  const [expandedBrandIds, setExpandedBrandIds] = useState<Set<string>>(new Set())

  // Brands
  const [brands, setBrands]                   = useState<DeviceBrand[]>([])
  const [loadingBrands, setLoadingBrands]     = useState(false)
  const [brandModalOpen, setBrandModalOpen]   = useState(false)
  const [editingBrand, setEditingBrand]       = useState<DeviceBrand | null>(null)
  const [brandForm, setBrandForm]             = useState<BrandForm>(EMPTY_BRAND)
  const [savingBrand, setSavingBrand]         = useState(false)
  const [deletingBrandId, setDeletingBrandId] = useState<string | null>(null)

  // Models
  const [models, setModels]                   = useState<DeviceModel[]>([])
  const [loadingModels, setLoadingModels]     = useState(false)
  const [modelModalOpen, setModelModalOpen]   = useState(false)
  const [editingModel, setEditingModel]       = useState<DeviceModel | null>(null)
  const [modelForm, setModelForm]             = useState<ModelForm>(EMPTY_MODEL)
  const [savingModel, setSavingModel]         = useState(false)
  const [deletingModelId, setDeletingModelId] = useState<string | null>(null)

  const loadBrands = useCallback(() => {
    setLoadingBrands(true)
    inventoryApi
      .getDeviceBrands()
      .then((res) => {
        const data = res.data?.data ?? res.data
        setBrands(Array.isArray(data) ? data : [])
      })
      .catch(() => toast.error('Failed to load brands'))
      .finally(() => setLoadingBrands(false))
  }, [])

  const loadModels = useCallback(() => {
    setLoadingModels(true)
    inventoryApi
      .getDeviceModels()
      .then((res) => {
        const data = res.data?.data ?? res.data
        setModels(Array.isArray(data) ? data : [])
      })
      .catch(() => toast.error('Failed to load models'))
      .finally(() => setLoadingModels(false))
  }, [])

  useEffect(() => {
    if (!tenant?.id) return
    setLoadingCategories(true)
    inventoryApi.getCategories({ companyId: tenant.id })
      .then(res => {
        const data = res.data?.data ?? res.data ?? []
        setCategories(Array.isArray(data) ? data.map((c: Record<string, unknown>) => ({ id: String(c.id), name: String(c.name ?? '') })) : [])
      })
      .catch(() => {})
      .finally(() => setLoadingCategories(false))
  }, [tenant?.id])

  useEffect(() => {
    loadBrands()
    loadModels()
  }, [loadBrands, loadModels])

  // ── Brand handlers ────────────────────────────────────────────────────────

  const openCreateBrand = () => { setEditingBrand(null); setBrandForm(EMPTY_BRAND); setBrandModalOpen(true) }
  const openEditBrand   = (b: DeviceBrand) => {
    setEditingBrand(b)
    setBrandForm({ name: b.name, iconUrl: b.iconUrl ?? '', productCategoryId: b.productCategoryId ?? '' })
    setBrandModalOpen(true)
  }

  const handleSaveBrand = async () => {
    if (!brandForm.name) { toast.error('Name is required'); return }
    setSavingBrand(true)
    try {
      const payload = {
        companyId: tenant!.id,
        name: brandForm.name,
        iconUrl: brandForm.iconUrl || null,
        productCategoryId: brandForm.productCategoryId || null,
      }
      if (editingBrand) {
        await inventoryApi.updateDeviceBrand(editingBrand.id, payload)
        toast.success('Brand updated')
      } else {
        await inventoryApi.createDeviceBrand(payload)
        toast.success('Brand created')
      }
      setBrandModalOpen(false)
      loadBrands()
    } catch {
      toast.error('Failed to save brand')
    } finally {
      setSavingBrand(false)
    }
  }

  const handleDeleteBrand = async (id: string) => {
    if (!confirm('Delete this brand?')) return
    setDeletingBrandId(id)
    try {
      await inventoryApi.deleteDeviceBrand(id)
      toast.success('Brand deleted')
      setBrands((prev) => prev.filter((b) => b.id !== id))
    } catch {
      toast.error('Failed to delete brand')
    } finally {
      setDeletingBrandId(null)
    }
  }

  // ── Model handlers ────────────────────────────────────────────────────────

  const openCreateModel = () => { setEditingModel(null); setModelForm(EMPTY_MODEL); setModelModalOpen(true) }

  const openCreateModelForBrand = (brandId: string) => {
    setEditingModel(null)
    setModelForm({ name: '', brandId, imageUrl: '', productCategoryId: '' })
    setModelModalOpen(true)
  }

  const openEditModel   = (m: DeviceModel) => {
    setEditingModel(m)
    setModelForm({
      name: m.name,
      brandId: m.brandId,
      imageUrl: m.imageUrl ?? '',
      productCategoryId: m.productCategoryId ?? ''
    })
    setModelModalOpen(true)
  }

  const handleSaveModel = async () => {
    if (!modelForm.name) { toast.error('Name is required'); return }
    if (!modelForm.brandId) { toast.error('Brand is required'); return }
    setSavingModel(true)
    try {
      const payload = {
        companyId: tenant!.id,
        name: modelForm.name,
        imageUrl: modelForm.imageUrl || null,
        productCategoryId: modelForm.productCategoryId || null,
      }
      if (editingModel) {
        await inventoryApi.updateDeviceModel(editingModel.id, {
          ...payload,
          brandId: modelForm.brandId,
        })
        toast.success('Model updated')
      } else {
        await inventoryApi.createDeviceModel({
          ...payload,
          brandId: modelForm.brandId,
        })
        toast.success('Model created')
      }
      setModelModalOpen(false)
      loadModels()
    } catch {
      toast.error('Failed to save model')
    } finally {
      setSavingModel(false)
    }
  }

  const handleDeleteModel = async (id: string) => {
    if (!confirm('Delete this model?')) return
    setDeletingModelId(id)
    try {
      await inventoryApi.deleteDeviceModel(id)
      toast.success('Model deleted')
      setModels((prev) => prev.filter((m) => m.id !== id))
    } catch {
      toast.error('Failed to delete model')
    } finally {
      setDeletingModelId(null)
    }
  }

  const toggleExpandBrand = (brandId: string) => {
    setExpandedBrandIds((prev) => {
      const next = new Set(prev)
      if (next.has(brandId)) {
        next.delete(brandId)
      } else {
        next.add(brandId)
      }
      return next
    })
  }

  const brandOptions = brands.map((b) => ({ value: b.id, label: b.name }))

  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl border border-blue-100/50 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Device Catalog</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Manage your supported device brands and models. Expand a brand to manage its models.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button icon={<Plus className="w-4 h-4" />} onClick={openCreateBrand}>
            Add Brand
          </Button>
          <Button variant="outline" icon={<Plus className="w-4 h-4" />} onClick={openCreateModel}>
            Add Model
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search brands by name..."
            className="w-full pl-10"
          />
        </div>
      </div>

      {/* Table Container */}
      {loadingBrands || loadingModels || loadingCategories ? (
        <div className="flex justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <span className="text-sm text-gray-400">Loading catalog data...</span>
          </div>
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
          <p className="text-gray-400 italic">No device brands found.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={openCreateBrand}>
            Add a Brand
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3.5 w-12"></th>
                <th className="px-4 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Brand Name</th>
                <th className="px-4 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Category</th>
                <th className="px-4 py-3.5 font-semibold text-gray-600 dark:text-gray-300">Status</th>
                <th className="px-4 py-3.5 font-semibold text-gray-600 dark:text-gray-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredBrands.map((brand) => {
                const isExpanded = expandedBrandIds.has(brand.id)
                const brandModels = models.filter((m) => m.brandId === brand.id || m.brandName === brand.name)
                const cat = categories.find((c) => c.id === brand.productCategoryId)

                return (
                  <React.Fragment key={brand.id}>
                    {/* Brand Row */}
                    <tr
                      onClick={() => toggleExpandBrand(brand.id)}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer transition-colors ${
                        isExpanded ? 'bg-blue-50/20 dark:bg-blue-900/5' : ''
                      }`}
                    >
                      <td className="px-4 py-4 text-center">
                        <div className="flex justify-center">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-blue-500 transition-transform" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-transform" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {brand.iconUrl ? (
                            <img src={brand.iconUrl} alt={brand.name} className="w-8 h-8 object-contain rounded-lg border border-gray-100 dark:border-gray-800 bg-white" />
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                              {brand.name.substring(0, 2)}
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-gray-900 dark:text-white">{brand.name}</span>
                            <span className="ml-2">
                              <Badge variant="info">
                                {brandModels.length} {brandModels.length === 1 ? 'model' : 'models'}
                              </Badge>
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {cat ? (
                          <span className="text-gray-800 dark:text-gray-200 font-medium">{cat.name}</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 italic text-xs">All Categories</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={brand.isActive ? 'success' : 'danger'}>
                          {brand.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" icon={<Edit2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />} onClick={() => openEditBrand(brand)} />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={
                              deletingBrandId === brand.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              )
                            }
                            disabled={!!deletingBrandId}
                            onClick={() => handleDeleteBrand(brand.id)}
                          />
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Model Sub-Section */}
                    {isExpanded && (
                      <tr className="bg-gray-50/40 dark:bg-gray-900/30">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="pl-6 border-l-2 border-blue-500/80 space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                  Models for {brand.name}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  Manage models registered under the {brand.name} brand catalog.
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                icon={<Plus className="w-3.5 h-3.5" />}
                                onClick={() => openCreateModelForBrand(brand.id)}
                              >
                                Add Model
                              </Button>
                            </div>

                            {brandModels.length === 0 ? (
                              <div className="py-8 text-center bg-white dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                                <p className="text-xs text-gray-400 italic">No models registered for this brand yet.</p>
                                <button
                                  className="text-xs text-blue-500 hover:text-blue-600 font-semibold mt-2 underline focus:outline-none"
                                  onClick={() => openCreateModelForBrand(brand.id)}
                                >
                                  Create first model
                                </button>
                              </div>
                            ) : (
                              <div className="overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-800 bg-white dark:bg-gray-900">
                                <table className="w-full text-xs text-left border-collapse">
                                  <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                                    <tr>
                                      <th className="px-4 py-2.5">Model Name</th>
                                      <th className="px-4 py-2.5">Category</th>
                                      <th className="px-4 py-2.5">Status</th>
                                      <th className="px-4 py-2.5 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {brandModels.map((model) => {
                                      const modelCat = categories.find((c) => c.id === model.productCategoryId)
                                      return (
                                        <tr key={model.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                            {model.imageUrl ? (
                                              <img src={model.imageUrl} alt={model.name} className="w-6 h-6 object-contain rounded" />
                                            ) : (
                                              <div className="w-6 h-6 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded flex items-center justify-center font-bold text-[10px] uppercase">
                                                DM
                                              </div>
                                            )}
                                            {model.name}
                                          </td>
                                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">
                                            {modelCat ? modelCat.name : <span className="text-gray-400 font-normal italic">-</span>}
                                          </td>
                                          <td className="px-4 py-3">
                                            <Badge variant={model.isActive ? 'success' : 'danger'} size="sm">
                                              {model.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                              <Button variant="ghost" size="sm" icon={<Edit2 className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />} onClick={() => openEditModel(model)} />
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                icon={
                                                  deletingModelId === model.id ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                  ) : (
                                                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                                  )
                                                }
                                                disabled={!!deletingModelId}
                                                onClick={() => handleDeleteModel(model.id)}
                                              />
                                            </div>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Brand Modal */}
      <Modal open={brandModalOpen} onClose={() => setBrandModalOpen(false)} title={editingBrand ? 'Edit Brand' : 'Add Brand'}>
        <div className="space-y-4">
          <Input
            label="Brand Name *"
            value={brandForm.name}
            onChange={(e) => setBrandForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Apple, Samsung, Dell"
          />
          <Select
            label="Product Category"
            value={brandForm.productCategoryId}
            onChange={(e) => setBrandForm((f) => ({ ...f, productCategoryId: e.target.value }))}
            options={[
              { value: '', label: 'All categories (e.g. Apple — Mobile & Laptop)' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">
            Leave blank if this brand spans multiple categories (e.g. Apple makes both phones and laptops). Set a
            category only if the brand is exclusive to one type (e.g. a mobile-only brand).
          </p>
          <Input
            label="Icon URL (optional)"
            value={brandForm.iconUrl}
            onChange={(e) => setBrandForm((f) => ({ ...f, iconUrl: e.target.value }))}
            placeholder="https://…"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setBrandModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={savingBrand} onClick={handleSaveBrand}>
              {editingBrand ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Model Modal */}
      <Modal open={modelModalOpen} onClose={() => setModelModalOpen(false)} title={editingModel ? 'Edit Model' : 'Add Model'}>
        <div className="space-y-4">
          <Input
            label="Model Name *"
            value={modelForm.name}
            onChange={(e) => setModelForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. iPhone 15, Galaxy S23"
          />
          <Select
            label="Brand *"
            value={modelForm.brandId}
            onChange={(e) => setModelForm((f) => ({ ...f, brandId: e.target.value }))}
            options={[{ value: '', label: 'Select brand…' }, ...brandOptions]}
            disabled={!!editingModel}
          />
          <Select
            label="Product Category *"
            value={modelForm.productCategoryId}
            onChange={(e) => setModelForm((f) => ({ ...f, productCategoryId: e.target.value }))}
            options={[{ value: '', label: 'Select category…' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">
            This determines which products can be linked to this model. e.g. iPhone 15 → Mobile & Smartphones.
          </p>
          <Input
            label="Image URL (optional)"
            value={modelForm.imageUrl}
            onChange={(e) => setModelForm((f) => ({ ...f, imageUrl: e.target.value }))}
            placeholder="https://…"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModelModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={savingModel} onClick={handleSaveModel}>
              {editingModel ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
