const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const ACCESS_TOKEN_KEY = 'nizolar.auth.accessToken'

export type ApiError = Error & { status?: number }

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken()
  if (!token) throw new Error('Tizimga OneID yoki ERI orqali kiring. Demo kabinet rasmiy ariza yubormaydi.')
  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  } catch {
    throw new Error('Platforma serveriga ulanib bo‘lmadi. Internet yoki server holatini tekshiring.')
  }
  const payload = await response.json().catch(() => null) as { data?: T; message?: string | string[] } | null
  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload.message.join('. ') : payload?.message
    const error = new Error(message || `Server so‘rovni rad etdi (${response.status})`) as ApiError
    error.status = response.status
    throw error
  }
  return (payload && 'data' in payload ? payload.data : payload) as T
}

export function apiPost<T>(path: string, body: unknown) {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

export function apiGet<T>(path: string) {
  return request<T>(path)
}

export async function apiGetPublic<T>(path: string): Promise<T> {
  let response: Response
  try { response = await fetch(`${API_BASE_URL}${path}`) }
  catch { throw new Error('Ochiq reyestrga ulanib bo‘lmadi.') }
  const payload = await response.json().catch(() => null) as { data?: T; message?: string | string[] } | null
  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload.message.join('. ') : payload?.message
    throw new Error(message || `Server so‘rovni rad etdi (${response.status})`)
  }
  return (payload && 'data' in payload ? payload.data : payload) as T
}

export type UploadedDocument = { id: string; originalName: string; sizeBytes: number }

export function uploadPrivateDocument(file: File, description: string) {
  const form = new FormData()
  form.append('file', file)
  form.append('accessLevel', 'PRIVATE')
  form.append('description', description)
  return request<UploadedDocument>('/platform/files/upload', { method: 'POST', body: form })
}

