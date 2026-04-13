export type MemberRole = 'customer' | 'admin'

export type MemberRow = {
  id: string
  genderId: string
  prefixId: string
  firstName: string
  lastName: string
  role: MemberRole
  lastLogin: string | null
}

export type MemberAccountRow = {
  id: string
  memberId: string
  phone: string
}

export type GenderOption = {
  id: string
  name: string
}

export type PrefixOption = {
  id: string
  genderId: string
  name: string
}

type ApiEnvelope<T> = { data?: T }

const asRecord = (v: unknown) => (v && typeof v === 'object' ? v as Record<string, unknown> : {})

const pickString = (src: unknown, key: string, fallback = '') => {
  const d = asRecord(src)
  const v = d[key]
  return typeof v === 'string' ? v : fallback
}

const pickNullableString = (src: unknown, key: string): string | null => {
  const d = asRecord(src)
  const v = d[key]
  if (typeof v === 'string' && v.trim()) return v
  return null
}

const normalizeMember = (src: unknown): MemberRow => ({
  id: pickString(src, 'id'),
  genderId: pickString(src, 'gender_id') || pickString(src, 'genderId'),
  prefixId: pickString(src, 'prefix_id') || pickString(src, 'prefixId'),
  firstName: pickString(src, 'first_name') || pickString(src, 'firstName'),
  lastName: pickString(src, 'last_name') || pickString(src, 'lastName'),
  role: pickString(src, 'role', 'customer') as MemberRole,
  lastLogin: pickNullableString(src, 'last_login') ?? pickNullableString(src, 'lastLogin'),
})

const normalizeAccount = (src: unknown): MemberAccountRow => ({
  id: pickString(src, 'id'),
  memberId: pickString(src, 'member_id') || pickString(src, 'memberId'),
  phone: pickString(src, 'phone'),
})

export const useAdminMemberApi = () => {
  const { authFetch } = useAdminSession()

  // ─── Members ──────────────────────────────────────────────────────────────

  const listMembers = async (): Promise<MemberRow[]> => {
    const res = await authFetch<ApiEnvelope<unknown[]>>('/api/v1/members')
    return (Array.isArray(res?.data) ? res.data : []).map(normalizeMember)
  }

  const createMember = async (payload: {
    genderId: string
    prefixId: string
    firstName: string
    lastName: string
    role: MemberRole
  }): Promise<MemberRow> => {
    const res = await authFetch<ApiEnvelope<unknown>>('/api/v1/members', { method: 'POST', body: payload })
    return normalizeMember(res?.data)
  }

  const updateMember = async (id: string, payload: {
    genderId: string
    prefixId: string
    firstName: string
    lastName: string
    role: MemberRole
  }): Promise<MemberRow> => {
    const res = await authFetch<ApiEnvelope<unknown>>(`/api/v1/members/${id}`, { method: 'PATCH', body: payload })
    return normalizeMember(res?.data)
  }

  const deleteMember = async (id: string): Promise<void> => {
    await authFetch(`/api/v1/members/${id}`, { method: 'DELETE' })
  }

  // ─── Member Accounts ──────────────────────────────────────────────────────

  const listMemberAccounts = async (): Promise<MemberAccountRow[]> => {
    const res = await authFetch<ApiEnvelope<unknown[]>>('/api/v1/member-accounts')
    return (Array.isArray(res?.data) ? res.data : []).map(normalizeAccount)
  }

  const createMemberAccount = async (payload: {
    memberId: string
    phone: string
    password: string
  }): Promise<MemberAccountRow> => {
    const res = await authFetch<ApiEnvelope<unknown>>('/api/v1/member-accounts', { method: 'POST', body: payload })
    return normalizeAccount(res?.data)
  }

  const updateMemberAccount = async (id: string, payload: {
    memberId: string
    phone: string
    password: string
  }): Promise<MemberAccountRow> => {
    const res = await authFetch<ApiEnvelope<unknown>>(`/api/v1/member-accounts/${id}`, { method: 'PATCH', body: payload })
    return normalizeAccount(res?.data)
  }

  const deleteMemberAccount = async (id: string): Promise<void> => {
    await authFetch(`/api/v1/member-accounts/${id}`, { method: 'DELETE' })
  }

  // ─── Lookup: Genders & Prefixes ───────────────────────────────────────────

  const listGenders = async (): Promise<GenderOption[]> => {
    const res = await authFetch<ApiEnvelope<unknown[]>>('/api/v1/systems/genders')
    return (Array.isArray(res?.data) ? res.data : []).map(src => ({
      id: pickString(src, 'id'),
      name: pickString(src, 'name'),
    }))
  }

  const listPrefixes = async (): Promise<PrefixOption[]> => {
    const res = await authFetch<ApiEnvelope<unknown[]>>('/api/v1/systems/prefixes')
    return (Array.isArray(res?.data) ? res.data : []).map(src => ({
      id: pickString(src, 'id'),
      genderId: pickString(src, 'gender_id') || pickString(src, 'genderId'),
      name: pickString(src, 'name'),
    }))
  }

  // ─── Register Admin (member + account in one shot) ───────────────────────

  const registerAdmin = async (payload: {
    genderId: string
    prefixId: string
    firstName: string
    lastName: string
    phone: string
    password: string
  }): Promise<void> => {
    await authFetch('/api/v1/auth/register-admin', { method: 'POST', body: payload })
  }

  return {
    listMembers, createMember, updateMember, deleteMember,
    listMemberAccounts, createMemberAccount, updateMemberAccount, deleteMemberAccount,
    listGenders, listPrefixes,
    registerAdmin,
  }
}
