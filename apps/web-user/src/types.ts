export type Platform = 'whatsapp' | 'telegram'

export type QuickCheckItem = {
  e164: string
  waStatus?: 'registered' | 'not_registered' | 'business' | 'unknown'
  tgStatus?: 'registered' | 'not_registered' | 'unknown'
  error?: string | null
}

export type QuickCheckResponse = {
  items: QuickCheckItem[]
  summary?: Record<string, number>
  invalid?: number
  duplicates?: number
}

export type SSEEvent =
  | { type: 'progress'; data: any }
  | { type: 'completed'; data: any }
  | { type: 'failed'; data: any }
