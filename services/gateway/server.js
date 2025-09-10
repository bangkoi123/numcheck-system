const express = require('express');
const app = express();
app.use(express.json());

// helper mount dua path: /api/<p> dan <p>
const routes = (p) => [`/api${p}`, p];

app.get(routes('/healthz'), (_req, res) => res.json({ ok: true, service: 'gateway' }));

// BULK (stub)
app.post(routes('/v1/bulk/start'), (req, res) => {
  res.json({ jobId: 'DEMO_JOB_123' });
});
app.get(routes('/v1/bulk/status'), (req, res) => {
  const jobId = String(req.query.jobId || 'DEMO_JOB_123');
  res.json({ jobId, state: 'queued' });
});
app.get(routes('/v1/bulk/stream'), (req, res) => {
  res.type('text/csv');
  res.write('e164,wa_status,tg_status\n');
  res.write('+6281234567890,not_registered,unknown\n');
  res.write('+6285550001111,not_registered,unknown\n');
  res.end();
});

// AUDIT (stub)
app.get(routes('/v1/audit/list'), (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 3);
  const now = Date.now();
  const rows = Array.from({ length: limit }, (_, i) => ({
    time: new Date(now - i * 60000).toISOString(),
    action: 'bulk.start',
    user: 'admin',
    meta: { note: 'stub' },
  }));
  res.json(rows);
});

// fallback
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Gateway listening on', PORT));
