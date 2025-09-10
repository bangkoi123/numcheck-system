import { useEffect, useState } from 'react'
import { api } from '../lib/api'
export default function Audit(){
  const [rows,setRows]=useState<any[]>([]),[err,setErr]=useState<string|undefined>(),[loading,setLoading]=useState(false),[limit,setLimit]=useState(100)
  const load=async()=>{ setLoading(true); setErr(undefined)
    try{ const data=await api.auditList(limit); const items=(data?.items||data||[]); setRows(items) }catch(e:any){ setErr(e.message||'error'); setRows([]) }
    finally{ setLoading(false) }
  }
  useEffect(()=>{ load() },[])
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Audit Log</h1>
        <div className="flex items-center gap-2">
          <input className="input w-28" value={limit} onChange={e=>setLimit(+e.target.value||100)} />
          <button className="btn" onClick={load} disabled={loading}>Refresh</button>
        </div>
      </div>
      {err && <div className="card border border-red-200 text-red-700">Audit endpoint not available: {err}</div>}
      <div className="card overflow-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left"><th className="p-2">time</th><th className="p-2">action</th><th className="p-2">user</th><th className="p-2">meta</th></tr></thead>
          <tbody>
            {rows.length===0 && <tr><td className="p-2 text-slate-400" colSpan={4}>No data</td></tr>}
            {rows.map((r,i)=>(
              <tr key={i} className="border-t">
                <td className="p-2">{r.time||r.ts||'-'}</td>
                <td className="p-2">{r.action||r.event||'-'}</td>
                <td className="p-2">{r.user||r.actor||'-'}</td>
                <td className="p-2"><pre className="whitespace-pre-wrap">{JSON.stringify(r.meta||r,null,2)}</pre></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
