exports.start  = (req, res) => res.json({ jobId: "DEMO_JOB_123" });
exports.status = (req, res) => res.json({ jobId: req.query.jobId||"", state:"queued" });
exports.stream = (req, res) => {
  res.setHeader('Content-Type','text/csv');
  res.end("e164,wa_status,tg_status\n+62812,not_registered,unknown\n");
};
