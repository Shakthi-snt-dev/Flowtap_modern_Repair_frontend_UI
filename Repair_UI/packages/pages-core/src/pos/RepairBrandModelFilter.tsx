import React, { useState, useEffect } from 'react'
import { inventoryApi } from '@flowtap/api-core'
import { useAppSelector } from '@flowtap/store'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Brand       { id: string; name: string }
interface DeviceModel { id: string; name: string }

interface Props {
  categoryId?: string | null
  /** When true, also fetches brands from child categories.
   *  Set to true when a parent category is selected and no sub-category pill is active. */
  includeSubCategories?: boolean
  onBrandChange: (brandId: string | null) => void
  onModelChange: (modelId: string | null) => void
}

// ─── Shared dropdown style ────────────────────────────────────────────────────

const SELECT_CLS = [
  'h-8 pl-2 pr-7 text-sm rounded-lg border appearance-none cursor-pointer',
  'border-gray-300 bg-white text-gray-800',
  'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200',
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ')

// ─── Component ────────────────────────────────────────────────────────────────

export const RepairBrandModelFilter: React.FC<Props> = ({
  categoryId,
  includeSubCategories = false,
  onBrandChange,
  onModelChange,
}) => {
  const tenant = useAppSelector((s) => s.tenant.tenant)

  const [brands, setBrands]             = useState<Brand[]>([])
  const [models, setModels]             = useState<DeviceModel[]>([])
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [loadingBrands, setLoadingBrands] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)

  // Load brands whenever category or includeSubCategories changes
  useEffect(() => {
    if (!tenant?.id) return
    setLoadingBrands(true)
    inventoryApi
      .getDeviceBrands(categoryId
        ? { productCategoryId: categoryId, includeSubCategories: includeSubCategories || undefined }
        : undefined)
      .then((res) => {
        const data: Brand[] = res.data?.data ?? res.data ?? []
        setBrands(Array.isArray(data) ? data : [])
      })
      .catch(() => setBrands([]))
      .finally(() => setLoadingBrands(false))

    // Reset both dropdowns on category change
    setSelectedBrand('')
    setSelectedModel('')
    setModels([])
    onBrandChange(null)
    onModelChange(null)
  }, [categoryId, includeSubCategories, tenant?.id])

  // Load models whenever brand changes
  useEffect(() => {
    if (!selectedBrand) { setModels([]); return }
    setLoadingModels(true)
    inventoryApi
      .getDeviceModels({ brandId: selectedBrand, productCategoryId: categoryId ?? undefined })
      .then((res) => {
        const data: DeviceModel[] = res.data?.data ?? res.data ?? []
        setModels(Array.isArray(data) ? data : [])
      })
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false))
  }, [selectedBrand, categoryId])

  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedBrand(val)
    setSelectedModel('')
    onBrandChange(val || null)
    onModelChange(null)
  }

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedModel(val)
    onModelChange(val || null)
  }

  // Hide entirely when no brands exist
  if (!loadingBrands && brands.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">

      {/* Brand dropdown */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Brand
        </span>
        <div className="relative">
          <select
            value={selectedBrand}
            onChange={handleBrandChange}
            disabled={loadingBrands}
            className={SELECT_CLS}
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {/* Custom chevron */}
          <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
            ▾
          </span>
        </div>
      </div>

      {/* Model dropdown — only once a brand is chosen */}
      {selectedBrand && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Model
          </span>
          <div className="relative">
            <select
              value={selectedModel}
              onChange={handleModelChange}
              disabled={loadingModels}
              className={SELECT_CLS}
            >
              <option value="">All Models</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
              ▾
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
