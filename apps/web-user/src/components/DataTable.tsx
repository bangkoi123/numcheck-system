import clsx from 'clsx'
type Col<T> = { key: keyof T | string; header: string; className?: string; render?: (row: T, idx: number) => React.ReactNode }
export default function DataTable<T>({ data, cols, empty = 'No data' }:{ data: T[]; cols: Col<T>[]; empty?: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-600">
            {cols.map((c, i) => (<th key={i} className={clsx('text-left px-3 py-2 font-medium', c.className)}>{c.header}</th>))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (<tr><td colSpan={cols.length} className="text-center text-slate-400 py-6">{empty}</td></tr>)}
          {data.map((row, i) => (
            <tr key={i} className={clsx(i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40')}>
              {cols.map((c, j) => (<td key={j} className={clsx('px-3 py-2', c.className)}>{c.render ? c.render(row, i) : String((row as any)[c.key])}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
