const { evaluateRules } = require('./ruleModule');
const { evaluateML } = require('./mlModule');
const db = require('../db/dbManager');

/**
 * Main Hybrid Fraud Detection Engine Interface.
 * Concurrently evaluates a transaction against transparent rule engine and ML model,
 * combining into a single unified risk score and risk level under 2 seconds.
 */
async function evaluateTransaction(transactionData) {
  const startTime = Date.now();

  const ruleResult = await evaluateRules(transactionData);
  const mlProbability = await evaluateML(transactionData, ruleResult.velocity_1h_count);

  const ruleWeight = 0.5;
  const mlWeight = 0.5;
  
  const rawRiskScore = (ruleResult.rule_score * ruleWeight) + (mlProbability * mlWeight);
  const riskScore = Math.round(rawRiskScore * 10) / 10;

  // Configurable Risk Level Thresholds: Low (0-30), Medium (31-70), High (71-100)
  let riskLevel = 'Low';
  let statusAction = 'COMPLETED';

  if (riskScore >= 71.0) {
    riskLevel = 'High';
    statusAction = 'BLOCKED_SIMULATED';
  } else if (riskScore >= 31.0) {
    riskLevel = 'Medium';
    statusAction = 'UNDER_REVIEW';
  } else {
    riskLevel = 'Low';
    statusAction = 'COMPLETED';
  }

  const durationMs = Date.now() - startTime;

  return {
    rule_score: ruleResult.rule_score,
    ml_probability: mlProbability,
    risk_score: riskScore,
    risk_level: riskLevel,
    action_status: statusAction,
    triggered_rules: ruleResult.triggered_rules,
    customer_baseline: ruleResult.customer_baseline,
    behavioral_deviations: ruleResult.behavioral_deviations,
    execution_time_ms: durationMs
  };
}

module.exports = { evaluateTransaction };
