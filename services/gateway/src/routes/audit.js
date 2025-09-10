exports.list = (req, res) => {
  const limit = Number(req.query.limit || 100);
  res.json({ items: [], limit, total: 0 });
};
