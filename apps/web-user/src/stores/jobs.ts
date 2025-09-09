import { create } from 'zustand'

type JobEntry = { jobId: string; createdAt: string; note?: string }
type JobsState = {
  recent: JobEntry[]
  add: (j: JobEntry) => void
  remove: (jobId: string) => void
  clear: () => void
}

const KEY = 'recentJobs'
function load(): JobEntry[] { try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : [] } catch { return [] } }
function save(list: JobEntry[]) { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50))) }

export const useJobsStore = create<JobsState>((set, get) => ({
  recent: load(),
  add: (j) => { const cur = get().recent.filter(x => x.jobId !== j.jobId); const next = [j, ...cur].slice(0, 50); save(next); set({ recent: next }) },
  remove: (jobId) => { const next = get().recent.filter(x => x.jobId !== jobId); save(next); set({ recent: next }) },
  clear: () => { save([]); set({ recent: [] }) }
}))
