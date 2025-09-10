const express = require('express');
const app = express();
app.use(express.json());

app.get('/api/healthz', (_req, res) => {
  res.json({ ok: true, service: 'gateway' });
});

// === BULK (stub) ===
// Mulai job -> balas jobId dummy
app.post('/api/v1/bulk/start', (req, res) => {
  // request body disimpan bila perlu, tapi untuk stub cukup kembalikan jobId
  res.json({ jobId: 'DEMO_JOB_123' });
});

// Status job -> balas status dummy
app.get('/api/v1/bulk/status', (req, res) => {
  const jobId = String(req.query.jobId || 'DEMO_JOB_123');
  res.json({ jobId, state: 'queued' });
});

// Stream hasil (CSV) -> contoh 2 baris
app.get('/api/v1/bulk/stream', (req, res) => {
  res.set('Content-Type', 'text/csv');
  res.write('e164,wa_status,tg_status\n');
  res.write('+6281234567890,not_registered,unknown\n');
  res.write('+6285550001111,not_registered,unknown\n');
  res.end();
});

// === AUDIT (stub) ===
app.get('/api/v1/audit/list', (req, res) => {
  const limit = Number(req.query.limit || 100);
  const rows = [];
  for (let i = 0; i < Math.min(limit, 3); i++) {
    rows.push({
      time: new Date(Date.now() - i * 60000).toISOString(),
      action: 'bulk.start',
      user: 'admin',
      meta: { note: 'stub' }
    });
  }
  res.json(rows);
});

// fallback
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

const PORT = 3000;
app.listen(PORT, () => console.log(`Gateway listening on ${PORT}`));
