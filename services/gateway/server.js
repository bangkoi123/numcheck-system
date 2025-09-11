const express = require('express');
const app = express();
app.use(express.json());

// health
app.get('/healthz', (_, res) => res.json({ ok: true, service: 'gateway' }));

// dukung dua prefix sekaligus (nginx strip '/api/' saat proxy_pass pakai trailing slash)
const startPaths  = ['/api/v1/bulk/start',  '/v1/bulk/start'];
const statusPaths = ['/api/v1/bulk/status', '/v1/bulk/status'];
const streamPaths = ['/api/v1/bulk/stream', '/v1/bulk/stream'];
const auditPaths  = ['/api/v1/audit/list',  '/v1/audit/list'];

// stubs
app.post(startPaths,  (req,res)=> res.json({ jobId: 'DEMO_JOB_123' }));
app.get(statusPaths,  (req,res)=> res.json({ jobId: String(req.query.jobId||'DEMO_JOB_123'), state: 'queued' }));
app.get(streamPaths,  (req,res)=> { res.set('Content-Type','text/csv'); res.end('e164,wa_status,tg_status\n+6281234567890,not_registered,unknown\n+6285550001111,not_registered,unknown\n'); });
app.get(auditPaths,   (req,res)=> { const n=Math.min(+req.query.limit||100,3); const rows=[]; for(let i=0;i<n;i++){ rows.push({time:new Date(Date.now()-i*60000).toISOString(),action:'bulk.start',user:'admin',meta:{note:'stub'}});} res.json(rows); });
app.use((_,res)=>res.status(404).json({ error:'Not Found' }));

app.listen(3000, ()=>console.log('Gateway listening on 3000'));
