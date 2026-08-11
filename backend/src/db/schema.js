const alasql = require('alasql');
const db = require('./dbManager');

async function initSchema() {
  if (db.isPostgres) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        kyc_status VARCHAR(50) DEFAULT 'VERIFIED',
        risk_rating VARCHAR(50) DEFAULT 'LOW',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL REFERENCES customers(id),
        account_number VARCHAR(100) UNIQUE NOT NULL,
        account_type VARCHAR(50) NOT NULL,
        balance DECIMAL(15,2) DEFAULT 0.00,
        currency VARCHAR(10) DEFAULT 'INR',
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        account_id INT NOT NULL REFERENCES accounts(id),
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        transaction_type VARCHAR(50) NOT NULL,
        merchant_name VARCHAR(255),
        location VARCHAR(255),
        device_id VARCHAR(255),
        ip_address VARCHAR(100),
        rule_score FLOAT DEFAULT 0.0,
        ml_probability FLOAT DEFAULT 0.0,
        risk_score FLOAT DEFAULT 0.0,
        risk_level VARCHAR(20) DEFAULT 'Low',
        triggered_rules TEXT,
        status VARCHAR(50) DEFAULT 'APPROVED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS fraud_alerts (
        id SERIAL PRIMARY KEY,
        transaction_id INT UNIQUE NOT NULL REFERENCES transactions(id),
        risk_score FLOAT NOT NULL,
        risk_level VARCHAR(20) NOT NULL,
        status VARCHAR(50) DEFAULT 'OPEN',
        assigned_to INT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS investigations (
        id SERIAL PRIMARY KEY,
        alert_id INT NOT NULL REFERENCES fraud_alerts(id),
        analyst_id INT NOT NULL REFERENCES users(id),
        notes TEXT NOT NULL,
        outcome VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS fraud_rules (
        id SERIAL PRIMARY KEY,
        rule_code VARCHAR(100) UNIQUE NOT NULL,
        rule_name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        weight FLOAT DEFAULT 1.0,
        threshold FLOAT DEFAULT 50.0,
        is_active INT DEFAULT 1,
        parameters TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id VARCHAR(100),
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } else {
    alasql(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name STRING,
        email STRING,
        password_hash STRING,
        role STRING,
        created_at STRING,
        updated_at STRING
      );

      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name STRING,
        last_name STRING,
        email STRING,
        phone STRING,
        kyc_status STRING,
        risk_rating STRING,
        created_at STRING
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT,
        account_number STRING,
        account_type STRING,
        balance NUMBER,
        currency STRING,
        status STRING,
        created_at STRING
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        account_id INT,
        amount NUMBER,
        currency STRING,
        transaction_type STRING,
        merchant_name STRING,
        location STRING,
        device_id STRING,
        ip_address STRING,
        rule_score NUMBER,
        ml_probability NUMBER,
        risk_score NUMBER,
        risk_level STRING,
        triggered_rules STRING,
        status STRING,
        created_at STRING
      );

      CREATE TABLE IF NOT EXISTS fraud_alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_id INT,
        risk_score NUMBER,
        risk_level STRING,
        status STRING,
        assigned_to INT,
        created_at STRING,
        updated_at STRING
      );

      CREATE TABLE IF NOT EXISTS investigations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        alert_id INT,
        analyst_id INT,
        notes STRING,
        outcome STRING,
        created_at STRING
      );

      CREATE TABLE IF NOT EXISTS fraud_rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rule_code STRING,
        rule_name STRING,
        category STRING,
        description STRING,
        weight NUMBER,
        threshold NUMBER,
        is_active INT,
        parameters STRING,
        updated_at STRING
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action STRING,
        entity_type STRING,
        entity_id STRING,
        details STRING,
        created_at STRING
      );
    `);
    db.loadPersistedData();
  }

  // Purge old non-RBI rules to guarantee clean RBI rule table
  if (db.isPostgres) {
    await db.query(`DELETE FROM fraud_rules WHERE rule_code NOT LIKE 'R%RBI%'`);
  } else {
    alasql(`DELETE FROM fraud_rules WHERE rule_code NOT LIKE 'R%RBI%'`);
  }

  // Real-Time Reserve Bank of India (RBI) Cyber & Digital Banking Fraud Guidelines
  const rbiRules = [
    {
      rule_code: 'R001_RBI_HIGH_VALUE_THRESHOLD',
      rule_name: 'RBI High-Value Transaction Monitoring',
      category: 'RBI_MANDATE',
      description: 'Flags single online transaction exceeding RBI threshold (₹1,00,000 / ₹5,00,000) requiring real-time fraud screening',
      weight: 1.3,
      threshold: 100000.0,
      is_active: 1,
      parameters: JSON.stringify({ max_amount: 100000, penalty: 35 })
    },
    {
      rule_code: 'R002_RBI_VELOCITY_COOLING_OFF',
      rule_name: 'RBI Velocity & Cooling Period Limit',
      category: 'VELOCITY',
      description: 'Detects >3 rapid transactions within 1 hour or high velocity transfers during beneficiary cooling window',
      weight: 1.5,
      threshold: 3.0,
      is_active: 1,
      parameters: JSON.stringify({ max_txns_per_hour: 3, penalty: 30 })
    },
    {
      rule_code: 'R003_RBI_UNREGISTERED_DEVICE_SIM',
      rule_name: 'RBI Device Binding & SIM Swap Alert',
      category: 'DEVICE_SECURITY',
      description: 'Identifies transactions originating from unverified device IMEI / new Device ID or recent SIM swap indicator',
      weight: 1.2,
      threshold: 1.0,
      is_active: 1,
      parameters: JSON.stringify({ penalty: 25 })
    },
    {
      rule_code: 'R004_RBI_GEO_IMPOSSIBLE_TRAVEL',
      rule_name: 'RBI Geographic & Foreign Mismatch',
      category: 'LOCATION_SECURITY',
      description: 'Flags foreign IP / cross-border offshore transfer inconsistent with domestic Indian banking profile',
      weight: 1.4,
      threshold: 1.0,
      is_active: 1,
      parameters: JSON.stringify({ penalty: 30 })
    },
    {
      rule_code: 'R005_RBI_UNUSUAL_NIGHT_WINDOW',
      rule_name: 'RBI Off-Hours Behavioral Anomaly',
      category: 'TIMING_ANOMALY',
      description: 'Flags high-value transaction initiated between 11:00 PM and 5:00 AM out of registered baseline',
      weight: 1.1,
      threshold: 1.0,
      is_active: 1,
      parameters: JSON.stringify({ start_hour: 23, end_hour: 5, penalty: 20 })
    },
    {
      rule_code: 'R006_RBI_STRUCTURING_SPLIT_TXN',
      rule_name: 'RBI Mandatory PAN Quoting Structuring Evader',
      category: 'AML_COMPLIANCE',
      description: 'Detects sub-threshold split transfers (₹49,000–₹49,999) designed to bypass statutory ₹50,000 RBI PAN threshold',
      weight: 1.6,
      threshold: 49000.0,
      is_active: 1,
      parameters: JSON.stringify({ pan_threshold: 50000, penalty: 40 })
    }
  ];

  // Upsert RBI rules in database
  for (const r of rbiRules) {
    const existing = await db.query('SELECT * FROM fraud_rules WHERE rule_code = ?', [r.rule_code]);
    if (!existing || existing.length === 0 || !existing[0].id) {
      if (db.isPostgres) {
        await db.query(
          `INSERT INTO fraud_rules (rule_code, rule_name, category, description, weight, threshold, is_active, parameters, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [r.rule_code, r.rule_name, r.category, r.description, r.weight, r.threshold, r.is_active, r.parameters, new Date().toISOString()]
        );
      } else {
        alasql(`INSERT INTO fraud_rules (rule_code, rule_name, category, description, weight, threshold, is_active, parameters, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
          r.rule_code, r.rule_name, r.category, r.description, r.weight, r.threshold, r.is_active, r.parameters, new Date().toISOString()
        ]);
      }
    } else {
      if (db.isPostgres) {
        await db.query(
          `UPDATE fraud_rules SET rule_name = $1, category = $2, description = $3, updated_at = $4 WHERE rule_code = $5`,
          [r.rule_name, r.category, r.description, new Date().toISOString(), r.rule_code]
        );
      } else {
        alasql(`UPDATE fraud_rules SET rule_name = ?, category = ?, description = ?, updated_at = ? WHERE rule_code = ?`, [
          r.rule_name, r.category, r.description, new Date().toISOString(), r.rule_code
        ]);
      }
    }
  }
  db.persistData();
}

module.exports = { initSchema };
