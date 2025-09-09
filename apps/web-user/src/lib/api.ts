import { toast } from 'react-hot-toast'
import { useAuthStore } from '../stores/auth'

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

async function request<T>(method: HttpMethod, path: string, body?: any, opts?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers || {})
    },
    body: body ? JSON.stringify(body) : undefined,
    ...opts
  })
  if (res.status === 204) return undefined as unknown as T
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json() : await res.text()
  if (!res.ok) {
    const msg = (isJson && (data as any)?.message) || (isJson && (data as any)?.error) || (typeof data === 'string' ? data : 'Request failed')
    throw new Error(String(msg))
  }
  return data as T
}

export const api = {
  // Fallback dev-mode: bila 404/5xx, kembalikan token lokal agar UI bisa dipakai
  login: async (email: string, password: string) => {
    try {
      return await request<{ token: string; role?: string }>('POST', '/v1/auth/login', { email, password })
    } catch (e: any) {
      toast('Dev mode: login skipped')
      return { token: 'dev', role: 'guest' }
    }
  },

  quickCheck: (payload: { numbers: string[]; platforms: ('whatsapp'|'telegram')[]; countryDefault?: string }) =>
    request<any>('POST', '/v1/quick-check', payload),

  bulkStart: (payload: { numbers: string[]; platforms: ('whatsapp'|'telegram')[]; countryDefault?: string; note?: string }) =>
    request<{ jobId: string }>('POST', '/v1/bulk/start', payload),

  bulkStatus: (jobId: string) =>
    request<any>('GET', `/v1/bulk/status?jobId=${encodeURIComponent(jobId)}`),

  bulkDownload: async (jobId: string) => {
    const token = useAuthStore.getState().token
    const res = await fetch(`${BASE}/v1/bulk/export.csv?jobId=${encodeURIComponent(jobId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (!res.ok) throw new Error('Failed to download CSV')
    return await res.blob()
  }
}
