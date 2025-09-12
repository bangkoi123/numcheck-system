import { create } from 'zustand'
type S = { token: string|null, setToken: (t:string|null)=>void, logout: ()=>void }
const useAuth = create<S>((set)=>({
  token: null,
  setToken: (t)=>{ set({ token: t }); try{ localStorage.setItem('nc_admin_token', t||'') }catch{} },
  logout: ()=>{ try{ localStorage.removeItem('nc_admin_token') }catch{}; set({ token: null }) }
}))
try{ const t=localStorage.getItem('nc_admin_token')||''; if(t) useAuth.setState({ token: t }) }catch{}
export default useAuth
