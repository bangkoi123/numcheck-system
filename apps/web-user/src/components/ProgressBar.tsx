export default function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
      <div className="h-full bg-brand-500 transition-all" style={{ width: `${v}%` }} />
    </div>
  )
}
