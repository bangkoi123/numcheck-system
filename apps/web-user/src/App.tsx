import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import QuickCheck from './pages/QuickCheck'
import BulkCheck from './pages/BulkCheck'
import Jobs from './pages/Jobs'
import { useAuthStore } from './stores/auth'

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = useAuthStore(s => s.token)
  const loc = useLocation()
  if (!token) return <Navigate to="/login" state={{ from: loc }} replace />
  return children
}

export default function App() {
  const token = useAuthStore(s => s.token)
  return (
    <div className="min-h-screen">
      <Toaster position="top-right" />
      {token && <Navbar />}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/quick" replace />} />
          <Route path="/quick" element={<RequireAuth><QuickCheck /></RequireAuth>} />
          <Route path="/bulk" element={<RequireAuth><BulkCheck /></RequireAuth>} />
          <Route path="/jobs" element={<RequireAuth><Jobs /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="text-center text-xs text-slate-400 py-6">
        © {new Date().getFullYear()} NumCheck — User Interface
      </footer>
    </div>
  )
}
