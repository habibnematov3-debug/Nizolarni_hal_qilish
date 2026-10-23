const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://nizolarni-hal-qilish-pibcwe8sf-habibnematov3-gmailcoms-projects.vercel.app').replace(/\/$/, '')

const ACCESS_TOKEN_KEY = 'adm.accessToken'
const REFRESH_TOKEN_KEY = 'adm.refreshToken'

type ApiEnvelope<T> = { success: boolean; data: T; message?: string | string[] }

export type AdminUser = { id: string; username: string; fullName: string; roles: string[] }
export type OrganizationRecord = {
  id: string
  name: string
  type: 'MINISTRY' | 'REGIONAL_DEPARTMENT' | 'TRAINING_CENTER'
  parentId: string | null
  parent?: { id: string; name: string } | null
  region: string | null
  status: 'ACTIVE' | 'INACTIVE'
  code: string | null
}

async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as ApiEnvelope<T> | null
  if (!response.ok || body?.success === false) {
    const message = body?.message
    throw new Error(Array.isArray(message) ? message.join(', ') : message || `So‘rov bajarilmadi (${response.status})`)
  }
  return body && 'data' in body ? body.data : body as T
}

function saveSession(accessToken: string, refreshToken: string) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function clearSession() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function hasSession() {
  return Boolean(sessionStorage.getItem(ACCESS_TOKEN_KEY))
}

export async function login(username: string, password: string): Promise<AdminUser> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const result = await readResponse<{ accessToken: string; refreshToken: string; roles: string[]; user: { id: string; username: string; fullName: string } }>(response)
  if (!result.roles?.includes('ADMIN')) throw new Error('Ushbu panelga faqat ADMIN roli bilan kirish mumkin.')
  saveSession(result.accessToken, result.refreshToken)
  return { ...result.user, roles: result.roles }
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refreshToken) throw new Error('Seans tugagan. Qayta kiring.')
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  const result = await readResponse<{ accessToken: string; refreshToken: string }>(response)
  saveSession(result.accessToken, result.refreshToken)
  return result.accessToken
}

export async function getCurrentAdmin(): Promise<AdminUser> {
  const result = await apiRequest<{ id: string; username: string; fullName: string; roles: string[] }>('/auth/me')
  if (!result.roles?.includes('ADMIN')) {
    clearSession()
    throw new Error('Ushbu panelga faqat ADMIN roli bilan kirish mumkin.')
  }
  return result
}

async function apiRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = sessionStorage.getItem(ACCESS_TOKEN_KEY)
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  if (response.status === 401 && retry) {
    try {
      await refreshAccessToken()
      return apiRequest<T>(path, init, false)
    } catch {
      clearSession()
      throw new Error('Seans tugagan. Qayta kiring.')
    }
  }
  return readResponse<T>(response)
}

export async function getOrganizations(): Promise<OrganizationRecord[]> {
  const result = await apiRequest<{ items: OrganizationRecord[] }>('/admin/organizations?limit=100')
  return result.items
}

export function createOrganization(payload: Record<string, unknown>) {
  return apiRequest<OrganizationRecord>('/admin/organizations', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateOrganization(id: string, payload: Record<string, unknown>) {
  return apiRequest<OrganizationRecord>(`/admin/organizations/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function logout() {
  try { await apiRequest('/auth/logout', { method: 'POST' }) } finally { clearSession() }
}
