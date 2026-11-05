const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '')
const API_BASE_URL = configuredApiBaseUrl || (import.meta.env.DEV ? 'http://localhost:3000' : '')
const ACCESS_TOKEN_KEY = 'nizolar.auth.accessToken'

function apiUrl(path: string) {
  if (!API_BASE_URL) throw new Error('Vercel muhitida VITE_API_BASE_URL sozlanmagan. Frontendni backend API manziliga ulang.')
  return `${API_BASE_URL}${path}`
}

export type ApiError = Error & { status?: number }

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function storeAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
}

export async function apiLogin(username: string, password: string) {
  let response: Response
  try {
    response = await fetch(apiUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  } catch {
    throw new Error('Platforma serveriga ulanib bo‘lmadi. Vercel API manzilini tekshiring.')
  }
  const payload = await response.json().catch(() => null) as { data?: { accessToken?: string }; accessToken?: string; message?: string | string[] } | null
  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload.message.join('. ') : payload?.message
    throw new Error(message || `Kirish amalga oshmadi (${response.status})`)
  }
  const token = payload?.data?.accessToken || payload?.accessToken
  if (!token) throw new Error('Server kirish tokenini qaytarmadi.')
  storeAccessToken(token)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken()
  if (!token) throw new Error('Tizimga OneID yoki ERI orqali kiring. Demo kabinet rasmiy ariza yubormaydi.')
  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  let response: Response
  try {
    response = await fetch(apiUrl(path), { ...options, headers })
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

export function apiPut<T>(path: string, body: unknown) {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(body) })
}

export function apiPatch<T>(path: string, body: unknown) {
  return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
}

export function apiDelete<T>(path: string) {
  return request<T>(path, { method: 'DELETE' })
}

export function apiGet<T>(path: string) {
  return request<T>(path)
}

export function apiUpload<T>(path: string, fieldName: string, file: File) {
  const form = new FormData()
  form.append(fieldName, file)
  return request<T>(path, { method: 'POST', body: form })
}

export async function apiDownload(path: string, filename: string) {
  const token = getAccessToken()
  if (!token) throw new Error('Faylni yuklab olish uchun tizimga kiring.')
  let response: Response
  try {
    response = await fetch(apiUrl(path), { headers: { Authorization: `Bearer ${token}` } })
  } catch {
    throw new Error('Platforma serveriga ulanib bo‘lmadi.')
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string | string[] } | null
    const message = Array.isArray(payload?.message) ? payload.message.join('. ') : payload?.message
    throw new Error(message || `Faylni yuklab bo‘lmadi (${response.status})`)
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function apiGetPublic<T>(path: string): Promise<T> {
  let response: Response
  try { response = await fetch(apiUrl(path)) }
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

