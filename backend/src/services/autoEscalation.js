const db = require('../db/dbManager');
const { broadcastAlert } = require('./websocket');

async function checkAndEscalateAlerts(slaMinutes = 60) {
  try {
    const cutoffTime = new Date(Date.now() - (slaMinutes * 60 * 1000)).toISOString();
    
    const staleAlerts = await db.query(
      `SELECT * FROM fraud_alerts WHERE status = 'OPEN' AND created_at <= $1`,
      [cutoffTime]
    );

    if (staleAlerts.length > 0) {
      console.log(`Auto-escalating ${staleAlerts.length} stale open alerts (older than ${slaMinutes} mins)...`);
      const now = new Date().toISOString();

      for (const alert of staleAlerts) {
        await db.query(
          `UPDATE fraud_alerts SET status = 'ESCALATED', updated_at = $1 WHERE id = $2`,
          [now, alert.id]
        );

        db.query(
          `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
          [null, 'AUTO_ESCALATE_ALERT', 'FRAUD_ALERT', String(alert.id), JSON.stringify({ reason: `SLA window expired (${slaMinutes}m)` }), now]
        );

        broadcastAlert('ALERT_ESCALATED', { ...alert, status: 'ESCALATED', updated_at: now });
      }
    }
  } catch (err) {
    console.error('Error during auto-escalation check:', err);
  }
}

function startAutoEscalationCron(intervalSeconds = 60, slaMinutes = 60) {
  console.log(`Auto-escalation worker scheduled every ${intervalSeconds} seconds (SLA threshold: ${slaMinutes} mins).`);
  setInterval(() => {
    checkAndEscalateAlerts(slaMinutes);
  }, intervalSeconds * 1000);
}

module.exports = {
  checkAndEscalateAlerts,
  startAutoEscalationCron
};
