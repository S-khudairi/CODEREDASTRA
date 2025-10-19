const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');

router.post('/aggregate-monthly', async (req, res) => {
  const token = req.get('x-admin-token') || req.body?.adminToken || req.query?.adminToken;
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: 'forbidden' });
  }

  try {
    const month = req.body?.month; // optional YYYY-MM
    const scriptPath = path.join(__dirname, '..', 'scripts', 'createMonthlyLeaderboard.js');
    const cmd = `node "${scriptPath}" ${month ? month : ''}`;
    exec(cmd, { cwd: path.join(__dirname, '..') }, (err, stdout, stderr) => {
      if (err) {
        console.error('aggregate-monthly error', err, stderr);
        return res.status(500).json({ error: 'aggregation_failed', detail: stderr || err.message });
      }
      return res.json({ ok: true, output: stdout });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

module.exports = router;
