import { Router } from "express";
import { randomUUID } from "crypto";

const r = Router();

// Simpan job dummy di memori
const jobs = new Map<string, {
  status: "running" | "done";
  items: Array<{ e164: string; wa_status: string; tg_status: string }>;
  note?: string;
  startedAt: number;
}>();

r.post("/api/v1/bulk/start", (req, res) => {
  const { numbers, platforms = ["whatsapp"], countryDefault = "ID", note = "" } = req.body || {};
  if (!Array.isArray(numbers) || numbers.length === 0) {
    return res.status(400).json({ error: "numbers required" });
  }
  // bikin job dummy
  const jobId = randomUUID();
  const items = numbers.map((n: string) => ({
    e164: n,
    wa_status: "unknown",
    tg_status: "unknown",
  }));
  jobs.set(jobId, { status: "running", items, note, startedAt: Date.now() });
  // anggap langsung selesai (stub)
  const j = jobs.get(jobId)!;
  j.status = "done";
  return res.json({ jobId });
});

r.get("/api/v1/bulk/status", (req, res) => {
  const jobId = String(req.query.jobId || "");
  const job = jobs.get(jobId);
  if (!job) return res.status(404).json({ error: "job not found" });
  return res.json({ ok: true, job });
});

r.get("/api/v1/bulk/stream", (req, res) => {
  const jobId = String(req.query.jobId || "");
  const job = jobs.get(jobId);
  if (!job) return res.status(404).json({ error: "job not found" });
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="bulk-${jobId}.csv"`);
  res.write("e164,wa_status,tg_status\n");
  for (const it of job.items) res.write(`${it.e164},${it.wa_status},${it.tg_status}\n`);
  res.end();
});

export default r;
