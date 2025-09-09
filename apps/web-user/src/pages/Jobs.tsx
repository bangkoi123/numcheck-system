import { useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../lib/api'
import { useJobsStore } from '../stores/jobs'
import ProgressBar from '../components/ProgressBar'

export default function Jobs() {
  const { recent, remove, clear } = useJobsStore()
  const [statusMap, setStatusMap] = useState<Record<string, any>>({})

  async function load(jobId: string) {
    try {
      const st = await api.bulkStatus(jobId)
      setStatusMap((m) => ({ ...m, [jobId]: st }))
    } catch (e: any) {
      toast.error(e.message || 'Gagal ambil status')
    }
  }

  async function download(jobId: string) {
    try {
      const blob = await api.bulkDownload(jobId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `bulk-result-${jobId}.csv`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch (e: any) { toast.error(e.message || 'Gagal download') }
  }

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Jobs</h1>
          <p className="text-sm text-slate-500">Riwayat job yang kamu mulai dari perangkat ini.</p>
        </div>
        <button onClick={() => clear()} className="text-sm text-rose-600">Clear Local</button>
      </header>

      <div className="space-y-3">
        {recent.length === 0 && (<div className="text-slate-400 text-sm">Belum ada data.</div>)}
        {recent.map((j) => {
          const st = statusMap[j.jobId]
          return (
            <div key={j.jobId} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium text-slate-800">Job: {j.jobId}</div>
                  <div className="text-slate-500">{new Date(j.createdAt).toLocaleString()} {j.note ? `• ${j.note}` : ''}</div>
                </div>
                <button onClick={() => remove(j.jobId)} className="text-xs text-rose-600">Remove</button>
              </div>
              <div className="mt-3">
                {st ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div>Status: <span className="font-medium">{st.status}</span></div>
                      <div>{st.processed} / {st.total} ({Math.round(st.progress)}%)</div>
                    </div>
                    <ProgressBar value={st.progress} />
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => download(j.jobId)} disabled={st.status !== 'COMPLETED'} className="rounded bg-slate-800 text-white px-3 py-1.5 text-xs disabled:opacity-50">Download CSV</button>
                      {st.error && <span className="text-xs text-rose-600">Error: {st.error}</span>}
                    </div>
                  </div>
                ) : (
                  <button onClick={() => load(j.jobId)} className="rounded bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 text-xs">Load Status</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
