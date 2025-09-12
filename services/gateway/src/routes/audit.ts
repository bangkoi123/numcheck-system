import { Router } from "express";
const r = Router();

// Stub audit: kosong agar halaman Audit tidak merah
r.get("/api/v1/audit/list", (req, res) => {
  const limit = Number(req.query.limit || 100);
  return res.json({ items: [], limit, total: 0 });
});

export default r;
