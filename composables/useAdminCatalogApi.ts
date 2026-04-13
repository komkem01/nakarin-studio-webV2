type ApiEnvelope<T> = {
  data?: T
}

type ProductItem = {
  id: string
  categoryId: string
  categoryName: string
  categorySlug: string
  name: string
  slug: string
  sku: string
  description?: string | null
  price: number
  stockQty: number
  isActive: boolean
}

type ProductListResponse = {
  items: ProductItem[]
  total: number
  page: number
  limit: number
}

type CategoryItem = {
  id: string
  parentId?: string | null
  name: string
  slug: string
  description?: string | null
  sortOrder: number
  isActive: boolean
}

type PackageItem = {
  id: string
  productId: string
  product: string
  qty: number
  sortOrder: number
}

type PackageRow = {
  id: string
  name: string
  slug: string
  description?: string | null
  price: number
  sortOrder: number
  isActive: boolean
  items: PackageItem[]
}

type PackageListResponse = {
  items: PackageRow[]
  total: number
  page: number
  limit: number
}

const asRecord = (value: unknown) => (value && typeof value === 'object' ? value as Record<string, unknown> : {})

const pickString = (source: unknown, camel: string, snake: string, fallback = '') => {
  const data = asRecord(source)
  const a = data[camel]
  if (typeof a === 'string') return a
  const b = data[snake]
  if (typeof b === 'string') return b
  return fallback
}

const pickNumber = (source: unknown, camel: string, snake: string, fallback = 0) => {
  const data = asRecord(source)
  const value = Number(data[camel] ?? data[snake])
  return Number.isFinite(value) ? value : fallback
}

const pickBoolean = (source: unknown, camel: string, snake: string, fallback = false) => {
  const data = asRecord(source)
  const raw = data[camel] ?? data[snake]
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'string') {
    if (raw.toLowerCase() === 'true') return true
    if (raw.toLowerCase() === 'false') return false
  }
  return fallback
}

const normalizeProduct = (source: unknown): ProductItem => {
  return {
    id: pickString(source, 'id', 'id'),
    categoryId: pickString(source, 'categoryId', 'category_id'),
    categoryName: pickString(source, 'categoryName', 'category_name'),
    categorySlug: pickString(source, 'categorySlug', 'category_slug'),
    name: pickString(source, 'name', 'name'),
    slug: pickString(source, 'slug', 'slug'),
    sku: pickString(source, 'sku', 'sku'),
    description: pickString(source, 'description', 'description', ''),
    price: pickNumber(source, 'price', 'price', 0),
    stockQty: pickNumber(source, 'stockQty', 'stock_qty', 0),
    isActive: pickBoolean(source, 'isActive', 'is_active', false),
  }
}

const normalizeCategory = (source: unknown): CategoryItem => {
  const data = asRecord(source)
  const parentRaw = data.parentId ?? data.parent_id
  return {
    id: pickString(source, 'id', 'id'),
    parentId: typeof parentRaw === 'string' ? parentRaw : null,
    name: pickString(source, 'name', 'name'),
    slug: pickString(source, 'slug', 'slug'),
    description: pickString(source, 'description', 'description', ''),
    sortOrder: pickNumber(source, 'sortOrder', 'sort_order', 0),
    isActive: pickBoolean(source, 'isActive', 'is_active', false),
  }
}

const normalizePackageItem = (source: unknown): PackageItem => {
  return {
    id: pickString(source, 'id', 'id'),
    productId: pickString(source, 'productId', 'product_id'),
    product: pickString(source, 'product', 'product', ''),
    qty: pickNumber(source, 'qty', 'qty', 0),
    sortOrder: pickNumber(source, 'sortOrder', 'sort_order', 0),
  }
}

const normalizePackage = (source: unknown): PackageRow => {
  const data = asRecord(source)
  const itemsRaw = Array.isArray(data.items) ? data.items : []

  return {
    id: pickString(source, 'id', 'id'),
    name: pickString(source, 'name', 'name'),
    slug: pickString(source, 'slug', 'slug'),
    description: pickString(source, 'description', 'description', ''),
    price: pickNumber(source, 'price', 'price', 0),
    sortOrder: pickNumber(source, 'sortOrder', 'sort_order', 0),
    isActive: pickBoolean(source, 'isActive', 'is_active', false),
    items: itemsRaw.map(normalizePackageItem),
  }
}

export const useAdminCatalogApi = () => {
  const { authFetch } = useAdminSession()

  const listProducts = async (query?: { page?: number, limit?: number, q?: string, categoryId?: string, isActive?: string }) => {
    const res = await authFetch<ApiEnvelope<ProductListResponse>>('/api/v1/products', {
      query: {
        page: query?.page || 1,
        limit: query?.limit || 10,
        q: query?.q || undefined,
        category_id: query?.categoryId || undefined,
        is_active: query?.isActive || undefined,
      },
    })

    const data = asRecord(res?.data)
    const itemsRaw = Array.isArray(data.items) ? data.items : []

    return {
      items: itemsRaw.map(normalizeProduct),
      total: pickNumber(data, 'total', 'total', 0),
      page: pickNumber(data, 'page', 'page', 1),
      limit: pickNumber(data, 'limit', 'limit', 10),
    }
  }

  const createProduct = async (payload: {
    categoryId: string
    name: string
    slug: string
    sku: string
    description?: string
    price: number
    stockQty: number
    isActive: boolean
  }) => {
    const res = await authFetch<ApiEnvelope<ProductItem>>('/api/v1/products', {
      method: 'POST',
      body: payload,
    })
    return normalizeProduct(res?.data)
  }

  const updateProduct = async (id: string, payload: {
    categoryId: string
    name: string
    slug: string
    sku: string
    description?: string
    price: number
    stockQty: number
    isActive: boolean
  }) => {
    const body = {
      categoryId: payload.categoryId,
      name: payload.name,
      slug: payload.slug,
      sku: payload.sku,
      description: payload.description || '',
      price: payload.price,
      stockQty: payload.stockQty,
      isActive: payload.isActive,
    }
    const res = await authFetch<ApiEnvelope<ProductItem>>(`/api/v1/products/${id}`, {
      method: 'PATCH',
      body,
    })
    return normalizeProduct(res?.data)
  }

  const deleteProduct = async (id: string) => {
    await authFetch<ApiEnvelope<null>>(`/api/v1/products/${id}`, {
      method: 'DELETE',
    })
  }

  const checkProductSkuDuplicate = async (sku: string, excludeId?: string) => {
    const res = await authFetch<ApiEnvelope<{ sku?: string, isDuplicate?: boolean, is_duplicate?: boolean }>>('/api/v1/products/check-sku', {
      query: {
        sku,
        exclude_id: excludeId || undefined,
      },
    })
    return pickBoolean(res?.data, 'isDuplicate', 'is_duplicate', false)
  }

  const listCategories = async () => {
    const res = await authFetch<ApiEnvelope<CategoryItem[]>>('/api/v1/categories')
    const itemsRaw = Array.isArray(res?.data) ? res.data : []
    return itemsRaw.map(normalizeCategory)
  }

  const createCategory = async (payload: {
    parentId?: string | null
    name: string
    slug: string
    description?: string
    sortOrder: number
    isActive: boolean
  }) => {
    const body = {
      parentId: payload.parentId || null,
      name: payload.name,
      slug: payload.slug,
      description: payload.description || '',
      sortOrder: payload.sortOrder,
      isActive: payload.isActive,
    }
    const res = await authFetch<ApiEnvelope<CategoryItem>>('/api/v1/categories', {
      method: 'POST',
      body,
    })
    return normalizeCategory(res?.data)
  }

  const updateCategory = async (id: string, payload: {
    parentId?: string | null
    name: string
    slug: string
    description?: string
    sortOrder: number
    isActive: boolean
  }) => {
    const body = {
      parentId: payload.parentId || null,
      name: payload.name,
      slug: payload.slug,
      description: payload.description || '',
      sortOrder: payload.sortOrder,
      isActive: payload.isActive,
    }
    const res = await authFetch<ApiEnvelope<CategoryItem>>(`/api/v1/categories/${id}`, {
      method: 'PATCH',
      body,
    })
    return normalizeCategory(res?.data)
  }

  const deleteCategory = async (id: string) => {
    await authFetch<ApiEnvelope<null>>(`/api/v1/categories/${id}`, {
      method: 'DELETE',
    })
  }

  const listPackages = async (query?: { page?: number, limit?: number, q?: string, isActive?: string }) => {
    const res = await authFetch<ApiEnvelope<PackageListResponse>>('/api/v1/packages', {
      query: {
        page: query?.page || 1,
        limit: query?.limit || 10,
        q: query?.q || undefined,
        is_active: query?.isActive || undefined,
      },
    })

    const data = asRecord(res?.data)
    const itemsRaw = Array.isArray(data.items) ? data.items : []

    return {
      items: itemsRaw.map(normalizePackage),
      total: pickNumber(data, 'total', 'total', 0),
      page: pickNumber(data, 'page', 'page', 1),
      limit: pickNumber(data, 'limit', 'limit', 10),
    }
  }

  const createPackage = async (payload: {
    name: string
    slug: string
    description?: string
    price: number
    sortOrder: number
    isActive: boolean
    items: Array<{ productId: string, qty: number, sortOrder: number }>
  }) => {
    const res = await authFetch<ApiEnvelope<PackageRow>>('/api/v1/packages', {
      method: 'POST',
      body: {
        ...payload,
        description: payload.description || '',
      },
    })
    return normalizePackage(res?.data)
  }

  const updatePackage = async (id: string, payload: {
    name: string
    slug: string
    description?: string
    price: number
    sortOrder: number
    isActive: boolean
    items: Array<{ productId: string, qty: number, sortOrder: number }>
  }) => {
    const res = await authFetch<ApiEnvelope<PackageRow>>(`/api/v1/packages/${id}`, {
      method: 'PATCH',
      body: {
        ...payload,
        description: payload.description || '',
      },
    })
    return normalizePackage(res?.data)
  }

  const deletePackage = async (id: string) => {
    await authFetch<ApiEnvelope<null>>(`/api/v1/packages/${id}`, {
      method: 'DELETE',
    })
  }

  return {
    listProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    checkProductSkuDuplicate,
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    listPackages,
    createPackage,
    updatePackage,
    deletePackage,
  }
}
