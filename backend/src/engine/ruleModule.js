const db = require('../db/dbManager');

/**
 * Calculates a customer's historical behavioral baseline from previous transactions
 * and generates behavioral deviation warnings in INR (₹).
 */
async function getCustomerBehavioralBaseline(accountId, currentTxn) {
  let avgAmount = 25000; // Default ₹25,000 INR
  let knownDevices = ['DEV-IN-SAMSUNG-S23', 'DEV-IN-MACBOOK-AIR'];
  let knownLocations = ['Mumbai, IN', 'Bengaluru, IN', 'Delhi NCR, IN'];
  let normalHours = '09:00 AM - 09:00 PM';
  let totalTxnCount = 0;

  try {
    if (accountId) {
      const accs = await db.query('SELECT customer_id FROM accounts WHERE id = $1', [accountId]);
      if (accs && accs.length > 0) {
        const customerId = accs[0].customer_id;
        const allCustAccs = await db.query('SELECT id FROM accounts WHERE customer_id = $1', [customerId]);
        const accIds = allCustAccs.map(a => a.id);

        if (accIds.length > 0) {
          const pastTxns = await db.query('SELECT * FROM transactions ORDER BY id DESC LIMIT 50');
          const custTxns = pastTxns.filter(t => accIds.includes(Number(t.account_id)));

          if (custTxns.length > 0) {
            totalTxnCount = custTxns.length;
            const sum = custTxns.reduce((acc, t) => acc + Number(t.amount || 0), 0);
            avgAmount = Math.round(sum / custTxns.length);

            const devSet = new Set(custTxns.map(t => t.device_id).filter(Boolean));
            if (devSet.size > 0) knownDevices = Array.from(devSet);

            const locSet = new Set(custTxns.map(t => t.location).filter(Boolean));
            if (locSet.size > 0) knownLocations = Array.from(locSet);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error fetching customer baseline:', err);
  }

  // Calculate explicit behavioral deviations
  const deviations = [];
  const currentAmount = Number(currentTxn.amount || 0);
  const currentDev = String(currentTxn.device_id || '');
  const currentLoc = String(currentTxn.location || '');
  const currentHour = new Date().getHours();

  // 1. Amount Deviation
  if (currentAmount > avgAmount * 2.5) {
    const ratio = (currentAmount / Math.max(avgAmount, 1)).toFixed(1);
    deviations.push(`⚠️ Transaction amount (₹${currentAmount.toLocaleString('en-IN')}) is ${ratio}x higher than customer's baseline average (₹${avgAmount.toLocaleString('en-IN')})`);
  }

  // 2. RBI PAN Structuring Evader Check (₹49,000 - ₹49,999)
  if (currentAmount >= 49000 && currentAmount < 50000) {
    deviations.push(`⚠️ RBI Structuring Warning: Transaction amount (₹${currentAmount.toLocaleString('en-IN')}) is just below the statutory ₹50,000 PAN quoting requirement`);
  }

  // 3. Device Mismatch
  const isKnownDev = knownDevices.some(d => d.toLowerCase() === currentDev.toLowerCase());
  if (!isKnownDev || currentTxn.is_new_device) {
    deviations.push(`⚠️ Unregistered Device / IMEI: ${currentDev || 'NEW_DEVICE'} (Registered devices: ${knownDevices.slice(0, 2).join(', ')})`);
  }

  // 4. Location Mismatch (Out of country / foreign IP)
  const isKnownLoc = knownLocations.some(l => currentLoc.toLowerCase().includes(l.toLowerCase()));
  if (!isKnownLoc || currentLoc.toLowerCase().includes('foreign') || currentLoc.toLowerCase().includes('offshore') || currentLoc.toLowerCase().includes('cayman') || currentLoc.toLowerCase().includes('us')) {
    deviations.push(`⚠️ RBI Cross-Border Mismatch: Location '${currentLoc}' is inconsistent with customer's domestic Indian profile (${knownLocations[0] || 'India'})`);
  }

  // 5. Off-Hours Night Window
  if (currentHour >= 23 || currentHour <= 5) {
    deviations.push(`⚠️ RBI Off-Hours Anomaly: Late night transaction initiated at ${currentHour}:00 (Normal hours: ${normalHours})`);
  }

  return {
    baseline: {
      average_amount: avgAmount,
      normal_amount_range: `₹5,000 - ₹${Math.max(100000, avgAmount * 2).toLocaleString('en-IN')}`,
      known_devices: knownDevices,
      known_locations: knownLocations,
      normal_hours: normalHours,
      past_transaction_count: totalTxnCount
    },
    deviations
  };
}

/**
 * Executes transparent RBI-compliant rule checks on transaction parameters.
 */
async function evaluateRules(txnData) {
  const rules = await db.query('SELECT * FROM fraud_rules WHERE is_active = 1');
  const baselineInfo = await getCustomerBehavioralBaseline(txnData.account_id, txnData);
  
  const amount = Number(txnData.amount || 0);
  const hour = new Date().getHours();
  const isNewDevice = Boolean(txnData.is_new_device || txnData.device_id?.includes('UNKNOWN') || txnData.device_id?.includes('NEW') || txnData.device_id?.includes('DEV999'));
  const location = String(txnData.location || '').toLowerCase();
  const isHighRiskLoc = location.includes('foreign') || location.includes('offshore') || location.includes('cayman') || location.includes('unknown') || location.includes('us');
  
  // Calculate recent velocity in 1 hour
  let velocity1h = 1;
  if (txnData.account_id) {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const velRes = await db.query(
      `SELECT COUNT(*) as cnt FROM transactions WHERE account_id = $1 AND created_at >= $2`,
      [txnData.account_id, oneHourAgo]
    );
    velocity1h = (velRes[0] && (velRes[0].cnt || velRes[0]['COUNT(*)'])) || 1;
  }

  let totalScore = 0;
  let maxPossibleScore = 0;
  const triggeredRules = [];

  for (const rule of rules) {
    const weight = Number(rule.weight || 1.0);
    const threshold = Number(rule.threshold || 50000.0);
    let params = {};
    try {
      params = typeof rule.parameters === 'string' ? JSON.parse(rule.parameters) : (rule.parameters || {});
    } catch (e) {
      params = {};
    }

    let isTriggered = false;
    let penalty = Number(params.penalty || 25);

    switch (rule.rule_code) {
      case 'R001_RBI_HIGH_VALUE_THRESHOLD':
      case 'R001_HIGH_AMOUNT':
        if (amount >= threshold) {
          isTriggered = true;
          if (amount >= threshold * 2) penalty = Math.min(penalty * 1.5, 45);
        }
        break;

      case 'R002_RBI_VELOCITY_COOLING_OFF':
      case 'R002_HIGH_VELOCITY':
        if (velocity1h >= threshold) {
          isTriggered = true;
        }
        break;

      case 'R003_RBI_UNREGISTERED_DEVICE_SIM':
      case 'R003_UNRECOGNIZED_DEVICE':
        if (isNewDevice || baselineInfo.deviations.some(d => d.toLowerCase().includes('device'))) {
          isTriggered = true;
        }
        break;

      case 'R004_RBI_GEO_IMPOSSIBLE_TRAVEL':
      case 'R004_LOCATION_ANOMALY':
        if (isHighRiskLoc || baselineInfo.deviations.some(d => d.toLowerCase().includes('mismatch') || d.toLowerCase().includes('cross-border'))) {
          isTriggered = true;
        }
        break;

      case 'R005_RBI_UNUSUAL_NIGHT_WINDOW':
      case 'R005_UNUSUAL_TIME':
        const startH = Number(params.start_hour || 23);
        const endH = Number(params.end_hour || 5);
        if (hour >= startH || hour <= endH) {
          isTriggered = true;
        }
        break;

      case 'R006_RBI_STRUCTURING_SPLIT_TXN':
        if (amount >= 49000 && amount < 50000) {
          isTriggered = true;
          penalty = 40;
        }
        break;

      default:
        break;
    }

    const contribution = penalty * weight;
    maxPossibleScore += 35 * weight;

    if (isTriggered) {
      totalScore += contribution;
      triggeredRules.push({
        rule_code: rule.rule_code,
        rule_name: rule.rule_name,
        category: rule.category,
        contribution: Math.round(contribution * 10) / 10,
        description: rule.description
      });
    }
  }

  // Normalize final rule score between 0 and 100
  const normalizedRuleScore = Math.min(100, Math.round((totalScore / (maxPossibleScore || 100)) * 100));

  return {
    rule_score: normalizedRuleScore,
    triggered_rules: triggeredRules,
    velocity_1h_count: velocity1h,
    customer_baseline: baselineInfo.baseline,
    behavioral_deviations: baselineInfo.deviations
  };
}

module.exports = { evaluateRules, getCustomerBehavioralBaseline };
