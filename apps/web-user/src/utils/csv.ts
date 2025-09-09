export async function parseCsvNumbers(file: File): Promise<string[]> {
  const text = await file.text()
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (!lines.length) return []
  const first = lines[0].toLowerCase()
  const hasHeader = /number|phone/.test(first) && !/^\+?\d/.test(lines[0])
  const rows = hasHeader ? lines.slice(1) : lines
  const numbers: string[] = []
  for (const row of rows) {
    const parts = row.split(/[;,]/).map(s => s.trim()).filter(Boolean)
    for (const p of parts) numbers.push(p)
  }
  return numbers
}
