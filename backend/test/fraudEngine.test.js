const assert = require('assert');
const test = require('node:test');
const { initSchema } = require('../src/db/schema');
const { evaluateTransaction } = require('../src/engine/fraudEngine');

test('Hybrid RBI Fraud Engine Unit & Latency Test Suite', async (t) => {

  await t.test('1. Initialize DB Schema', async () => {
    await initSchema();
    assert.ok(true, 'Schema initialized');
  });

  await t.test('2. Evaluate Low Risk Transaction (Amount ₹500, Local, Recognized Device)', async () => {
    const txn = {
      amount: 500.00,
      transaction_type: 'DEBIT_CARD',
      merchant_name: 'Local Kirana Store',
      location: 'Mumbai, IN',
      device_id: 'DEV-IN-SAMSUNG-S23',
      is_new_device: false
    };

    const startTime = Date.now();
    const result = await evaluateTransaction(txn);
    const latency = Date.now() - startTime;

    assert.strictEqual(result.risk_level, 'Low', 'Risk level should be Low');
    assert.ok(result.risk_score < 40.0, 'Risk score should be < 40');
    assert.ok(latency < 2000, `Fraud Engine response time (${latency}ms) should be < 2000ms SLA`);
  });

  await t.test('3. Evaluate High Risk Fraud Transaction (₹6,50,000, Offshore, New Device)', async () => {
    const txn = {
      amount: 650000.00,
      transaction_type: 'WIRE_TRANSFER',
      merchant_name: 'Offshore FX Crypto Exchange',
      location: 'Foreign / Cayman Islands',
      device_id: 'DEV-UNKNOWN-999',
      is_new_device: true
    };

    const startTime = Date.now();
    const result = await evaluateTransaction(txn);
    const latency = Date.now() - startTime;

    assert.strictEqual(result.risk_level, 'High', 'Risk level should be High');
    assert.ok(result.risk_score >= 70.0, 'Risk score should be >= 70');
    assert.ok(result.triggered_rules.length >= 2, 'Should trigger multiple high risk rules');
    assert.ok(latency < 2000, `Fraud Engine response time (${latency}ms) should be < 2000ms SLA`);
  });

});
