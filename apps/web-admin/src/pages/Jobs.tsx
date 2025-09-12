import { useEffect, useState } from 'react'
import { api } from '../lib/api'
export default function Jobs(){
  const [jobId,setJobId]=useState(''),[status,setStatus]=useState<any|null>(null),[err,setErr]=useState<string|undefined>(),[poll,setPoll]=useState(false)
  const fetchOne=async()=>{ setErr(undefined); try{ setStatus(await api.bulkStatus(jobId)) }catch(e:any){ setErr(e.message||'error'); setStatus(null) } }
  useEffect(()=>{ if(!poll||!jobId) return; const t=setInterval(fetchOne,1500); return ()=>clearInterval(t) },[poll,jobId])
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Jobs</h1>
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <input className="input" placeholder="job id..." value={jobId} onChange={e=>setJobId(e.target.value)} />
          <button className="btn" onClick={fetchOne} disabled={!jobId}>Check</button>
          <button className="btn" onClick={()=>setPoll(v=>!v)} disabled={!jobId}>{poll?'Stop':'Auto Poll'}</button>
          <button className="btn" onClick={()=>api.stream(jobId)} disabled={!jobId}>Download</button>
        </div>
        {err && <div className="text-red-600">{err}</div>}
        {status && <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(status,null,2)}</pre>}
        {!status && !err && <div className="text-slate-400">No status</div>}
      </div>
    </div>
  )
}
