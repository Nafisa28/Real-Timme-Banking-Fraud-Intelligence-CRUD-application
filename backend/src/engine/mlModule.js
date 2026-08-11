const http = require('http');

/**
 * Calls the Python ML scoring microservice via HTTP (or in-process deterministic fallback)
 * to obtain normalized fraud probability (0 - 100).
 */
async function evaluateML(txnData, velocity1hCount = 0) {
  const payload = JSON.stringify({
    amount: txnData.amount,
    balance: txnData.balance || 5000,
    hour_of_day: new Date().getHours(),
    is_new_device: txnData.is_new_device || txnData.device_id?.includes('UNKNOWN') || false,
    location: txnData.location || '',
    velocity_1h_count: velocity1hCount,
    velocity_24h_sum: txnData.amount
  });

  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5001,
        path: '/score',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 1000 // 1 sec timeout
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (typeof data.ml_probability === 'number') {
              return resolve(data.ml_probability);
            }
          } catch (e) {}
          resolve(fallbackMLScore(txnData, velocity1hCount));
        });
      }
    );

    req.on('error', () => {
      resolve(fallbackMLScore(txnData, velocity1hCount));
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(fallbackMLScore(txnData, velocity1hCount));
    });

    req.write(payload);
    req.end();
  });
}

function fallbackMLScore(txn, vel1h) {
  const amount = Number(txn.amount || 0);
  const hour = new Date().getHours();
  const isNight = hour >= 1 && hour <= 5;
  const isNew = Boolean(txn.is_new_device || txn.device_id?.includes('UNKNOWN'));
  const isOffshore = String(txn.location || '').toLowerCase().includes('foreign') || String(txn.location || '').toLowerCase().includes('offshore');

  let prob = 5.0; // base probability
  if (amount > 10000) prob += 35.0;
  else if (amount > 5000) prob += 20.0;

  if (isNight) prob += 15.0;
  if (isNew) prob += 18.0;
  if (isOffshore) prob += 22.0;
  if (vel1h > 3) prob += 15.0;

  return Math.min(99.9, Math.max(0.1, Math.round(prob * 10) / 10));
}

module.exports = { evaluateML };
