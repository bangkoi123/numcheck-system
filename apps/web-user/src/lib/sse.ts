import type { SSEEvent } from '../types'

export function listenJobEvents(jobId: string, onEvent: (ev: SSEEvent) => void) {
  const base = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'
  const url = `${base}/v1/bulk/stream?jobId=${encodeURIComponent(jobId)}`
  const es = new EventSource(url, { withCredentials: false })

  es.onmessage = (e) => {
    try {
      const parsed = JSON.parse(e.data)
      if (parsed?.type && parsed?.data) onEvent(parsed as SSEEvent)
      else onEvent({ type: 'progress', data: parsed })
    } catch {
      // ignore
    }
  }
  es.onerror = () => { es.close() }
  return () => es.close()
}
