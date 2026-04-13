type AddressItem = {
  id: string
  name: string
}

type ApiEnvelope<T> = { data?: T }

const asRecord = (v: unknown) => (v && typeof v === 'object' ? v as Record<string, unknown> : {})
const pickString = (src: unknown, key: string) => {
  const v = asRecord(src)[key]
  return typeof v === 'string' ? v : ''
}

const normalizeItem = (src: unknown): AddressItem => ({
  id: pickString(src, 'id'),
  name: pickString(src, 'name'),
})

export const useAddressApi = () => {
  const { authFetch } = useAdminSession()

  const listProvinces = async (): Promise<AddressItem[]> => {
    const res = await authFetch<ApiEnvelope<unknown[]>>('/api/v1/systems/provinces')
    return (Array.isArray(res?.data) ? res.data : []).map(normalizeItem)
  }

  const listDistricts = async (provinceId: string): Promise<AddressItem[]> => {
    const res = await authFetch<ApiEnvelope<unknown[]>>(`/api/v1/systems/districts/province/${provinceId}`)
    return (Array.isArray(res?.data) ? res.data : []).map(normalizeItem)
  }

  const listSubDistricts = async (districtId: string): Promise<AddressItem[]> => {
    const res = await authFetch<ApiEnvelope<unknown[]>>(`/api/v1/systems/subdistricts/district/${districtId}`)
    return (Array.isArray(res?.data) ? res.data : []).map(normalizeItem)
  }

  const listZipcodes = async (subDistrictId: string): Promise<AddressItem[]> => {
    const res = await authFetch<ApiEnvelope<unknown[]>>(`/api/v1/systems/zipcodes/subdistrict/${subDistrictId}`)
    return (Array.isArray(res?.data) ? res.data : []).map(normalizeItem)
  }

  const getProvince = async (id: string): Promise<AddressItem | null> => {
    try {
      const res = await authFetch<ApiEnvelope<unknown>>(`/api/v1/systems/provinces/${id}`)
      return res?.data ? normalizeItem(res.data) : null
    } catch { return null }
  }

  const getDistrict = async (id: string): Promise<AddressItem | null> => {
    try {
      const res = await authFetch<ApiEnvelope<unknown>>(`/api/v1/systems/districts/${id}`)
      return res?.data ? normalizeItem(res.data) : null
    } catch { return null }
  }

  const getSubDistrict = async (id: string): Promise<AddressItem | null> => {
    try {
      const res = await authFetch<ApiEnvelope<unknown>>(`/api/v1/systems/subdistricts/${id}`)
      return res?.data ? normalizeItem(res.data) : null
    } catch { return null }
  }

  const getZipcode = async (id: string): Promise<AddressItem | null> => {
    try {
      const res = await authFetch<ApiEnvelope<unknown>>(`/api/v1/systems/zipcodes/${id}`)
      return res?.data ? normalizeItem(res.data) : null
    } catch { return null }
  }

  return { listProvinces, listDistricts, listSubDistricts, listZipcodes, getProvince, getDistrict, getSubDistrict, getZipcode }
}

export type { AddressItem }
