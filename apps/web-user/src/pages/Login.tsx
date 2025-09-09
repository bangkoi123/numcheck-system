import { FormEvent, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const setToken = useAuthStore(s => s.setToken)
  const nav = useNavigate()
  const loc = useLocation() as any

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      setLoading(true)
      const res = await api.login(email, password)
      setToken(res.token, res.role ?? null)
      toast.success('Login sukses')
      const to = loc.state?.from?.pathname || '/quick'
      nav(to, { replace: true })
    } catch {} finally { setLoading(false) }
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800 mb-1">Masuk</h1>
        <p className="text-sm text-slate-500 mb-6">Gunakan akun yang sudah terdaftar.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-500">Email</label>
            <input className="mt-1 w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-brand-400" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Password</label>
            <input className="mt-1 w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-brand-400" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 text-white py-2.5">
            {loading ? 'Memproses…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
