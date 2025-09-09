import { create } from 'zustand'

type AuthState = {
  token: string | null
  role?: string | null
  setToken: (t: string | null, role?: string | null) => void
  logout: () => void
}

const KEY = 'token'
const ROLE = 'role'

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(KEY),
  role: localStorage.getItem(ROLE),
  setToken: (t, role) => {
    if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY)
    if (role) localStorage.setItem(ROLE, role); else localStorage.removeItem(ROLE)
    set({ token: t, role: role ?? null })
  },
  logout: () => {
    localStorage.removeItem(KEY); localStorage.removeItem(ROLE)
    set({ token: null, role: null })
  }
}))
