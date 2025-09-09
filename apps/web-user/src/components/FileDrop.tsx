import { useRef } from 'react'
export default function FileDrop({ onFile, accept = '.csv' }:{ onFile: (file: File) => void; accept?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer bg-white hover:bg-slate-50" onClick={() => ref.current?.click()}>
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = '' }} />
      <div className="text-slate-600">
        <div className="font-medium">Upload CSV</div>
        <div className="text-xs text-slate-400">Klik untuk pilih file (kolom: <code>number</code>)</div>
      </div>
    </div>
  )
}
