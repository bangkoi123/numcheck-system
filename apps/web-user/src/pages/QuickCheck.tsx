import { useState } from 'react'
import toast from 'react-hot-toast'
import DataTable from '../components/DataTable'
import { api } from '../lib/api'
import type { QuickCheckItem } from '../types'

function normalizeItems(input: any): QuickCheckItem[] {
  const rows = Array.isArray(input?.items) ? input.items : (Array.isArray(input) ? input : [])
  return rows.map((x: any) => ({
    e164: x.e164 ?? x.number ?? x.msisdn ?? '',
    waStatus: x.waStatus ?? x.wa_status ?? x.wa ?? x.whatsapp_status ?? x.whatsappStatus ?? null,
    tgStatus: x.tgStatus ?? x.tg_status ?? x.telegram_status ?? x.telegramStatus ?? null,
    error: x.error ?? null
  }))
}

function flattenSummary(summary?: any): Record<string, number> | undefined {
  if (!summary) return undefined
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(summary)) {
    if (v && typeof v === 'object') {
      for (const [kk, vv] of Object.entries(v as any)) out[`${k}.${kk}`] = Number(vv)
    } else {
      out[k] = Number(v as any)
    }
  }
  return out
}

export default function QuickCheck() {
  const [numbersText, setNumbersText] = useState('')
  const [wa, setWa] = useState(true)
  const [tg, setTg] = useState(false)
  const [country, setCountry] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<QuickCheckItem[]>([])
  const [summary, setSummary] = useState<Record<string, number> | undefined>()

  async function run() {
    const numbers = numbersText.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    if (!numbers.length) return toast.error('Isi minimal 1 nomor')
    const platforms: ('whatsapp' | 'telegram')[] = []
    if (wa) platforms.push('whatsapp'); if (tg) platforms.push('telegram')
    if (!platforms.length) return toast.error('Pilih minimal satu platform')
    setLoading(true)
    try {
      const res: any = await api.quickCheck({ numbers, platforms, countryDefault: country || undefined })
      const items = normalizeItems(res)
      setRows(items)
      setSummary(flattenSummary(res?.summary))
      toast.success(`Selesai (${items.length})`)
    } catch (e: any) {
      toast.error(e?.message || 'Gagal')
    } finally { setLoading(false) }
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-800">Quick Check</h1>
        <p className="text-sm text-slate-500">Cek cepat beberapa nomor sekaligus.</p>
      </header>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-4">
          <label className="text-xs text-slate-500">Numbers (one per line)</label>
          <textarea className="mt-1 w-full h-48 border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-brand-400"
            placeholder="+62812..., 62813..., atau tanpa kode negara + default country"
            value={numbersText} onChange={(e) => setNumbersText(e.target.value)} />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={wa} onChange={e => setWa(e.target.checked)} /> WhatsApp</label>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={tg} onChange={e => setTg(e.target.checked)} /> Telegram</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Default Country</span>
              <input className="border rounded px-2 py-1 text-sm w-24" placeholder="ID / US" maxLength={2}
                value={country} onChange={e => setCountry(e.target.value.toUpperCase())} />
            </div>
            <button onClick={run} disabled={loading} className="ml-auto rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 text-sm">
              {loading ? 'Memproses…' : 'Run'}
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-sm font-medium text-slate-700 mb-2">Summary</div>
          <ul className="text-sm text-slate-600 space-y-1">
            {summary ? Object.entries(summary).map(([k, v]) => (
              <li key={k} className="flex justify-between"><span className="capitalize">{k.replace(/_/g, ' ')}</span><span className="font-medium">{v}</span></li>
            )) : <li className="text-slate-400">-</li>}
          </ul>
        </div>
      </div>

      <DataTable
        data={rows}
        cols={[
          { header: 'E164', key: 'e164', className: 'w-[220px]' },
          { header: 'WA', key: 'waStatus', render: (r) => <Badge val={(r as any).waStatus} /> },
          { header: 'TG', key: 'tgStatus', render: (r) => <Badge val={(r as any).tgStatus} /> },
          { header: 'Error', key: 'error', className: 'text-red-500' }
        ]}
        empty="Belum ada hasil"
      />
    </section>
  )
}

function Badge({ val }: { val: any }) {
  if (!val) return <span className="text-slate-400">-</span>
  const color = val === 'registered' || val === 'business' ? 'bg-emerald-100 text-emerald-700'
    : val === 'not_registered' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
  return <span className={`px-2 py-0.5 rounded text-xs ${color}`}>{String(val)}</span>
}
