import { useEffect, useState } from 'react'
import { api } from '../lib/api'
export default function Bulk(){
  const [numbers,setNumbers]=useState(''),[wa,setWa]=useState(true),[tg,setTg]=useState(false),[country,setCountry]=useState('ID'),[note,setNote]=useState('')
  const [jobId,setJobId]=useState<string|undefined>(),[status,setStatus]=useState<any|null>(null),[polling,setPolling]=useState(false)
  const parsed=()=>numbers.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
  const start=async()=>{
    const payload={numbers:parsed(),platforms:[...(wa?['whatsapp']:[]),...(tg?['telegram']:[])],countryDefault:country||undefined,note:note||undefined}
    const res=await api.bulkStart(payload); setJobId(res.jobId); setPolling(true)
  }
  useEffect(()=>{
    if(!polling||!jobId) return
    const t=setInterval(async()=>{ try{const st=await api.bulkStatus(jobId); setStatus(st); if(st?.done||st?.status==='done'||st?.state==='done'){setPolling(false);clearInterval(t)}}catch{} },1500)
    return ()=>clearInterval(t)
  },[polling,jobId])
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Bulk Check</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 card space-y-3">
          <div><div className="label">Numbers (one per line)</div>
            <textarea className="input min-h-[220px]" value={numbers} onChange={e=>setNumbers(e.target.value)} placeholder="62812..., 08123..." />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={wa} onChange={e=>setWa(e.target.checked)} /> WhatsApp</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={tg} onChange={e=>setTg(e.target.checked)} /> Telegram</label>
            <div className="flex items-center gap-2"><span className="label">Default Country</span>
              <input className="input w-24" value={country} onChange={e=>setCountry(e.target.value.toUpperCase())}/>
            </div>
          </div>
          <div><div className="label">Note</div>
            <input className="input" value={note} onChange={e=>setNote(e.target.value)} placeholder="batch name / info optional"/>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn" onClick={start} disabled={!numbers.trim()||(!wa&&!tg)}>Start</button>
            {jobId && <span className="badge">job: {jobId}</span>}
            {jobId && <button className="btn" onClick={()=>api.stream(jobId!)}>Download</button>}
          </div>
        </div>
        <div className="card"><div className="label mb-2">Status</div>
          {!status && <div className="text-slate-400">No status yet</div>}
          {status && <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(status,null,2)}</pre>}
        </div>
      </div>
    </div>
  )
}
