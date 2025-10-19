const express = require('express');
const router = express.Router();
const { aggregateWeek } = require('../weeklyAggregate');

// Simple secret-based protection: set ADMIN_TOKEN env var
router.post('/aggregate-weekly', async (req, res) => {
  const token = req.get('x-admin-token') || req.body?.adminToken || req.query?.adminToken;
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: 'forbidden' });
  }

  try {
    const baseDate = req.body?.baseDate ? new Date(req.body.baseDate) : undefined;
    const topN = req.body?.topN || 10;
    const result = await aggregateWeek({ baseDate, topN });
    return res.json({ ok: true, result });
  } catch (err) {
    console.error('Aggregation error', err);
    return res.status(500).json({ error: 'aggregation_failed', detail: err.message });
  }
});

module.exports = router;
