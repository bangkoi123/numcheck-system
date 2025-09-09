import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import FileDrop from '../components/FileDrop'
import ProgressBar from '../components/ProgressBar'
import { api } from '../lib/api'
import { listenJobEvents } from '../lib/sse'
import { parseCsvNumbers } from '../utils/csv'
import { useJobsStore } from '../stores/jobs'

type Status = { jobId: string; status: 'PENDING'|'RUNNING'|'COMPLETED'|'FAILED'|'CANCELED'; processed: number; total: number; progress: number; summary?: Record<string, number>; error?: string | null }

export default function BulkCheck() {
  const [numbers, setNumbers] = useState<string[]>([])
  const [numbersText, setNumbersText] = useState('')
  const [wa, setWa] = useState(true)
  const [tg, setTg] = useState(false)
  const [country, setCountry] = useState<string>('')
  const [note, setNote] = useState('')
  const [job, setJob] = useState<Status | null>(null)
  const [running, setRunning] = useState(false)
  const stopRef = useRef<() => void>()
  const addRecent = useJobsStore(s => s.add)

  function applyTextToNumbers() {
    const list = numbersText.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    setNumbers(list); toast.success(`${list.length} nomor dimuat`)
  }

  async function onFile(file: File) {
    const nums = await parseCsvNumbers(file)
    setNumbers(nums); setNumbersText(nums.join('\n'))
    toast.success(`CSV dimuat: ${nums.length} nomor`)
  }

  async function start() {
    if (!numbers.length) return toast.error('Belum ada nomor')
    const platforms: ('whatsapp' | 'telegram')[] = []; if (wa) platforms.push('whatsapp'); if (tg) platforms.push('telegram')
    if (!platforms.length) return toast.error('Pilih minimal satu platform')
    setRunning(true)
    try {
      const res = await api.bulkStart({ numbers, platforms, countryDefault: country || undefined, note: note || undefined })
      toast.success(`Job dimulai: ${res.jobId}`)
      addRecent({ jobId: res.jobId, createdAt: new Date().toISOString(), note })
      setJob({ jobId: res.jobId, status: 'PENDING', processed: 0, total: numbers.length, progress: 0 })
      stopRef.current = listenJobEvents(res.jobId, (ev) => {
        if (!('data' in ev)) return
        setJob(ev.data as any)
        if (ev.type === 'completed' || ev.type === 'failed') { setRunning(false); stopRef.current?.() }
      })
      const int = setInterval(async () => {
        try {
          const st = await api.bulkStatus(res.jobId)
          setJob(st as any)
          if (['COMPLETED','FAILED','CANCELED'].includes(st.status)) { clearInterval(int); setRunning(false) }
        } catch {}
      }, 3000)
    } catch { setRunning(false) }
  }

  useEffect(() => () => { stopRef.current?.() }, [])

  async function download() {
    if (!job?.jobId) return
    try {
      const blob = await api.bulkDownload(job.jobId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `bulk-result-${job.jobId}.csv`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch (e: any) { toast.error(e.message || 'Gagal download') }
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-800">Bulk Check</h1>
        <p className="text-sm text-slate-500">Jalankan pengecekan massal dan pantau progres.</p>
      </header>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-slate-700">Input Numbers</div>
              <div className="text-xs text-slate-400">Textarea atau upload CSV</div>
            </div>
            <textarea className="w-full h-40 border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-brand-400"
              placeholder="+62812..., satu per baris" value={numbersText} onChange={(e) => setNumbersText(e.target.value)} onBlur={applyTextToNumbers}/>
            <div className="my-3"><FileDrop onFile={onFile} /></div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={wa} onChange={e => setWa(e.target.checked)} /> WhatsApp</label>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={tg} onChange={e => setTg(e.target.checked)} /> Telegram</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Default Country</span>
                <input className="border rounded px-2 py-1 text-sm w-24" placeholder="ID / US" maxLength={2}
                  value={country} onChange={e => setCountry(e.target.value.toUpperCase())}/>
              </div>
              <input className="border rounded px-2 py-1 text-sm flex-1" placeholder="Catatan (opsional)" value={note} onChange={e => setNote(e.target.value)} />
              <button onClick={start} disabled={running} className="ml-auto rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 text-sm">
                {running ? 'Running…' : 'Start'}
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-sm font-medium text-slate-700 mb-3">Progress</div>
            {job ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-slate-600"><span className="mr-2">Status:</span><span className="font-medium">{job.status}</span></div>
                  <div className="text-slate-600">{job.processed} / {job.total} ({Math.round(job.progress)}%)</div>
                </div>
                <ProgressBar value={job.progress} />
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  <SummaryList summary={job.summary} />
                </div>
                <div className="flex gap-2">
                  <button onClick={download} disabled={job.status !== 'COMPLETED'} className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm disabled:opacity-50">Download CSV</button>
                  {job.error && (<div className="text-sm text-rose-600">Error: {job.error}</div>)}
                </div>
              </div>
            ) : (<div className="text-slate-400 text-sm">Belum ada job aktif.</div>)}
          </div>
        </div>

        <aside className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-sm font-medium text-slate-700 mb-2">Info</div>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>Gunakan CSV kolom <code>number</code> (tanpa header juga bisa).</li>
            <li>Default country opsional jika nomor tanpa kode negara.</li>
            <li>SSE otomatis; fallback polling tiap 3 detik.</li>
          </ul>
        </aside>
      </div>
    </section>
  )
}

function SummaryList({ summary }: { summary?: Record<string, number> }) {
  if (!summary) return <div className="text-slate-400">-</div>
  const items = Object.entries(summary)
  if (!items.length) return <div className="text-slate-400">-</div>
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(([k, v]) => (
        <div key={k} className="flex justify-between bg-slate-50 rounded px-2 py-1">
          <span className="capitalize">{k.replace(/_/g, ' ')}</span>
          <span className="font-medium">{v}</span>
        </div>
      ))}
    </div>
  )
}
