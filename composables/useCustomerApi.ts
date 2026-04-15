type ApiEnvelope<T> = {
  data?: T
}

type ProductRow = {
  id: string
  category_id: string
  category_name: string
  category_slug: string
  name: string
  slug: string
  sku: string
  image_url: string | null
  description: string | null
  price: number
  stock_qty: number
  is_active: boolean
}

type ProductListResponse = {
  items?: ProductRow[]
  total?: number
  page?: number
  limit?: number
}

type PackageItemRow = {
  id: string
  product_id: string
  product: string
  qty: number
  sort_order: number
}

type PackageRow = {
  id: string
  name: string
  workType: string
  slug: string
  description: string | null
  price: number
  sort_order: number
  is_active: boolean
  items?: PackageItemRow[]
}

type PackageListResponse = {
  items?: PackageRow[]
  total?: number
  page?: number
  limit?: number
}

type PromotionRow = {
  id: string
  code: string
  name: string
  description: string | null
  discount_type: string
  discount_value: number
  max_discount_amount: number | null
  min_purchase_amount: number | null
  max_usage_count: number | null
  current_usage_count: number
  start_date: string
  end_date: string
  is_active: boolean
}

type PromotionListResponse = {
  items?: PromotionRow[]
  total?: number
  page?: number
  limit?: number
}

const asRecord = (v: unknown) => (v && typeof v === 'object' ? v as Record<string, unknown> : {})

const pickString = (src: unknown, snake: string, camel: string, fallback = '') => {
  const d = asRecord(src)
  const v1 = d[snake]
  if (typeof v1 === 'string') return v1
  const v2 = d[camel]
  if (typeof v2 === 'string') return v2
  return fallback
}

const pickNumber = (src: unknown, snake: string, camel: string, fallback = 0) => {
  const d = asRecord(src)
  const v = Number(d[snake] ?? d[camel])
  return Number.isFinite(v) ? v : fallback
}

const pickBoolean = (src: unknown, snake: string, camel: string, fallback = false) => {
  const d = asRecord(src)
  const v = d[snake] ?? d[camel]
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return v.toLowerCase() === 'true'
  return fallback
}

const pickNullableString = (src: unknown, snake: string, camel: string): string | null => {
  const d = asRecord(src)
  const v1 = d[snake]
  if (typeof v1 === 'string' && v1.trim()) return v1
  const v2 = d[camel]
  if (typeof v2 === 'string' && v2.trim()) return v2
  return null
}

const pickStorageId = (src: unknown): string => {
  const d = asRecord(src)
  const v = d.storage_id ?? d.storageId
  return typeof v === 'string' ? v.trim() : ''
}

export const useCustomerApi = () => {
  const config = useRuntimeConfig()

  const apiFetch = <T>(url: string, options?: Parameters<typeof $fetch<T>>[1]) => {
    return $fetch<T>(url, {
      baseURL: config.public.apiBase,
      ...options,
    })
  }

  const normalizeProduct = (src: unknown): ProductRow => {
    const storageId = pickStorageId(src)
    const stableImageUrl = storageId ? `${String(config.public.apiBase || '').replace(/\/$/, '')}/api/v1/uploads/${storageId}/proxy` : null
    return {
      id: pickString(src, 'id', 'id'),
      category_id: pickString(src, 'category_id', 'categoryId'),
      category_name: pickString(src, 'category_name', 'categoryName'),
      category_slug: pickString(src, 'category_slug', 'categorySlug'),
      name: pickString(src, 'name', 'name'),
      slug: pickString(src, 'slug', 'slug'),
      sku: pickString(src, 'sku', 'sku'),
      image_url: stableImageUrl || pickNullableString(src, 'image_url', 'imageUrl'),
      description: pickNullableString(src, 'description', 'description'),
      price: pickNumber(src, 'price', 'price'),
      stock_qty: pickNumber(src, 'stock_qty', 'stockQty'),
      is_active: pickBoolean(src, 'is_active', 'isActive', true),
    }
  }

  const normalizePackageItem = (src: unknown): PackageItemRow => ({
    id: pickString(src, 'id', 'id'),
    product_id: pickString(src, 'product_id', 'productId'),
    product: pickString(src, 'product', 'product'),
    qty: pickNumber(src, 'qty', 'qty'),
    sort_order: pickNumber(src, 'sort_order', 'sortOrder'),
  })

  const normalizePackage = (src: unknown): PackageRow => {
    const items = asRecord(src).items
    return {
      id: pickString(src, 'id', 'id'),
      name: pickString(src, 'name', 'name'),
      workType: pickString(src, 'work_type', 'workType', 'mongkol'),
      slug: pickString(src, 'slug', 'slug'),
      description: pickNullableString(src, 'description', 'description'),
      price: pickNumber(src, 'price', 'price'),
      sort_order: pickNumber(src, 'sort_order', 'sortOrder'),
      is_active: pickBoolean(src, 'is_active', 'isActive', true),
      items: Array.isArray(items) ? items.map(normalizePackageItem) : [],
    }
  }

  const normalizePromotion = (src: unknown): PromotionRow => ({
    id: pickString(src, 'id', 'id'),
    code: pickString(src, 'code', 'code'),
    name: pickString(src, 'name', 'name'),
    description: pickNullableString(src, 'description', 'description'),
    discount_type: pickString(src, 'discount_type', 'discountType'),
    discount_value: pickNumber(src, 'discount_value', 'discountValue'),
    max_discount_amount: pickNumber(src, 'max_discount_amount', 'maxDiscountAmount') || null,
    min_purchase_amount: pickNumber(src, 'min_purchase_amount', 'minPurchaseAmount') || null,
    max_usage_count: pickNumber(src, 'max_usage_count', 'maxUsageCount') || null,
    current_usage_count: pickNumber(src, 'current_usage_count', 'currentUsageCount'),
    start_date: pickString(src, 'start_date', 'startDate'),
    end_date: pickString(src, 'end_date', 'endDate'),
    is_active: pickBoolean(src, 'is_active', 'isActive', true),
  })

  const listProducts = async (page = 1, limit = 12, q = '', categoryId?: string): Promise<ProductListResponse> => {
    const query: Record<string, any> = { page, limit, q }
    if (categoryId) query.categoryId = categoryId
    const res = await apiFetch<ApiEnvelope<ProductListResponse>>('/api/v1/products', { query })
    const data = res?.data || {}
    return {
      items: Array.isArray(data.items) ? data.items.map(normalizeProduct) : [],
      total: data.total || 0,
      page: data.page || page,
      limit: data.limit || limit,
    }
  }

  const getProduct = async (id: string): Promise<ProductRow | null> => {
    const res = await apiFetch<ApiEnvelope<unknown>>(`/api/v1/products/${id}`)
    return res?.data ? normalizeProduct(res.data) : null
  }

  const listPackages = async (page = 1, limit = 12): Promise<PackageListResponse> => {
    const res = await apiFetch<ApiEnvelope<PackageListResponse>>('/api/v1/packages', { query: { page, limit } })
    const data = res?.data || {}
    return {
      items: Array.isArray(data.items) ? data.items.map(normalizePackage) : [],
      total: data.total || 0,
      page: data.page || page,
      limit: data.limit || limit,
    }
  }

  const getPackage = async (id: string): Promise<PackageRow | null> => {
    const res = await apiFetch<ApiEnvelope<unknown>>(`/api/v1/packages/${id}`)
    return res?.data ? normalizePackage(res.data) : null
  }

  const listPromotions = async (page = 1, limit = 20): Promise<PromotionListResponse> => {
    const res = await apiFetch<ApiEnvelope<PromotionListResponse>>('/api/v1/promotions', { query: { page, limit } })
    const data = res?.data || {}
    return {
      items: Array.isArray(data.items) ? data.items.map(normalizePromotion) : [],
      total: data.total || 0,
      page: data.page || page,
      limit: data.limit || limit,
    }
  }

  const validatePromotionCode = async (code: string): Promise<{ valid: boolean; promotion?: PromotionRow }> => {
    try {
      const res = await apiFetch<ApiEnvelope<unknown>>('/api/v1/promotions/validate-code', {
        method: 'POST',
        body: { code },
      })
      return {
        valid: !!res?.data,
        promotion: res?.data ? normalizePromotion(res.data) : undefined,
      }
    } catch {
      return { valid: false }
    }
  }

  return {
    listProducts,
    getProduct,
    listPackages,
    getPackage,
    listPromotions,
    validatePromotionCode,
  }
}
