import { NavLink, Routes, Route, Navigate, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Bulk from './pages/Bulk'
import Jobs from './pages/Jobs'
import Audit from './pages/Audit'
import Login from './pages/Login'
import useAuth from './stores/auth'

function Nav() {
  const { token, logout } = useAuth()
  const A = ({ to, children }: any) =>
    <NavLink to={to} className={({isActive}) => `px-3 py-2 rounded-lg ${isActive?'bg-blue-600 text-white':'hover:bg-slate-100'}`}>{children}</NavLink>
  return (
    <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold">NumCheck <span className="text-slate-400">Admin</span></Link>
        <div className="flex items-center gap-2">
          <A to="/">Dashboard</A><A to="/bulk">Bulk</A><A to="/jobs">Jobs</A><A to="/audit">Audit</A>
        </div>
        <div className="flex items-center gap-2">
          {token ? <button className="btn !bg-slate-700 hover:!bg-slate-800" onClick={logout}>Logout</button> : <A to="/login">Login</A>}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard/>} />
          <Route path="/bulk" element={<Bulk/>} />
          <Route path="/jobs" element={<Jobs/>} />
          <Route path="/audit" element={<Audit/>} />
          <Route path="/login" element={<Login/>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}
