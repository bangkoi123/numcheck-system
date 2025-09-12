import useAuth from '../stores/auth'
const API = '/api'
async function req<T>(method:'GET'|'POST', path:string, body?:any, token?:string): Promise<T> {
  const headers:Record<string,string> = { 'Content-Type':'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API}${path}`, { method, headers, body: body?JSON.stringify(body):undefined })
  const txt = await res.text()
  let data:any; try { data = txt?JSON.parse(txt):null } catch { data = { raw: txt } }
  if (!res.ok) throw new Error((data && (data.error||data.message)) || `HTTP ${res.status}`)
  return data as T
}
export const api = {
  login: (email:string,password:string)=>req<{token?:string,role?:string}>('POST','/v1/auth/login',{email,password}),
  healthz: ()=>req<{ok:boolean,service:string}>('GET','/healthz'),
  bulkStart: (payload:{numbers:string[],platforms:('whatsapp'|'telegram')[],countryDefault?:string,note?:string})=>{
    const { token } = useAuth.getState(); return req<{jobId:string}>('POST','/v1/bulk/start',payload,token||undefined)
  },
  bulkStatus: (jobId:string)=>{ const { token } = useAuth.getState(); return req<any>('GET',`/v1/bulk/status?jobId=${encodeURIComponent(jobId)}`,undefined,token||undefined) },
  stream: (jobId:string)=>window.open(`/api/v1/bulk/stream?jobId=${encodeURIComponent(jobId)}`,'_blank'),
  auditList: (limit=100)=>{ const { token } = useAuth.getState(); return req<any>('GET',`/v1/audit?limit=${limit}`,undefined,token||undefined) }
}
