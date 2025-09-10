import { useState } from 'react'
import { api } from '../lib/api'
import useAuth from '../stores/auth'
export default function Login(){
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[err,setErr]=useState<string|undefined>()
  const { setToken } = useAuth()
  const submit=async(e:any)=>{ e.preventDefault(); setErr(undefined)
    try{ const res=await api.login(email,password); if(res?.token) setToken(res.token) }catch(e:any){ setErr(e.message||'error') }
  }
  return (
    <div className="max-w-md mx-auto">
      <div className="card space-y-3">
        <h1 className="text-xl font-semibold">Admin Login</h1>
        <form className="space-y-3" onSubmit={submit}>
          <div><div className="label">Email</div><input className="input" value={email} onChange={e=>setEmail(e.target.value)} /></div>
          <div><div className="label">Password</div><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
          <button className="btn" type="submit">Login</button>
        </form>
        {err && <div className="text-red-600">{err}</div>}
      </div>
    </div>
  )
}
