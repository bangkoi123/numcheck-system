import { useEffect, useState } from 'react'
import { api } from '../lib/api'
export default function Dashboard(){
  const [health,setHealth]=useState<any>({})
  const [err,setErr]=useState<string|undefined>()
  const ping=async()=>{
    try{setHealth(await api.healthz());setErr(undefined)}catch(e:any){setErr(e.message||'error')}
  }
  useEffect(()=>{ ping() },[])
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card"><div className="text-slate-500 text-sm">Gateway</div>
          <div className="mt-1 text-lg">{health?.service||'-'}</div>
          <div className="mt-2"><span className={`badge ${health?.ok?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{String(!!health?.ok)}</span></div>
        </div>
        <div className="card"><div className="text-slate-500 text-sm">Actions</div>
          <div className="mt-2 flex gap-2">
            <a className="btn" href="/bulk">Bulk</a><a className="btn" href="/jobs">Jobs</a><a className="btn" href="/audit">Audit</a>
          </div>
        </div>
        <div className="card"><div className="text-slate-500 text-sm">System</div>
          <div className="mt-1 text-slate-400 text-sm">Admin UI scaffold</div>
          <button className="btn mt-3" onClick={ping}>Recheck Health</button>
        </div>
      </div>
      {err && <div className="card border border-red-200 text-red-700">Health check error: {err}</div>}
    </div>
  )
}
