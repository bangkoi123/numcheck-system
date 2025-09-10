exports.start = (req, res) => {
  const jobId = 'DEMO_' + Date.now();
  res.json({ jobId });
};

exports.status = (req, res) => {
  const jobId = req.query.jobId || 'UNKNOWN';
  res.json({
    jobId,
    status: 'queued',
    items: 0,
    summary: {
      wa: { registered: 0, not_registered: 0, unknown: 0 },
      tg: { registered: 0, not_registered: 0, unknown: 0 },
    },
  });
};

exports.stream = (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.end('e164,wa_status,tg_status\n');
};
