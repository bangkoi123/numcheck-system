import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import clsx from 'clsx'

export default function Navbar() {
  const logout = useAuthStore(s => s.logout)
  const nav = useNavigate()
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold text-slate-800">
          <span className="text-brand-600">Num</span>Check
          <span className="ml-2 text-xs text-slate-400">User</span>
        </Link>
        <nav className="flex gap-4 text-sm">
          <NavLink to="/quick" className={({ isActive }) => clsx('px-2 py-1 rounded hover:bg-slate-100', isActive && 'text-brand-700 font-medium')}>Quick</NavLink>
          <NavLink to="/bulk" className={({ isActive }) => clsx('px-2 py-1 rounded hover:bg-slate-100', isActive && 'text-brand-700 font-medium')}>Bulk</NavLink>
          <NavLink to="/jobs" className={({ isActive }) => clsx('px-2 py-1 rounded hover:bg-slate-100', isActive && 'text-brand-700 font-medium')}>Jobs</NavLink>
        </nav>
        <button onClick={() => { logout(); nav('/login') }} className="text-xs px-3 py-1.5 rounded bg-slate-800 text-white hover:bg-slate-700">
          Logout
        </button>
      </div>
    </header>
  )
}
