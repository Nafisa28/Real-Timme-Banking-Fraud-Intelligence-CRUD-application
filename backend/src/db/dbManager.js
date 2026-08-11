const alasql = require('alasql');
const fs = require('fs');
const path = require('path');
const { upsertRow, deleteRow } = require('./supabaseSync');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbFilePath = path.join(dataDir, 'banking_fraud.json');

// ─── Local AlaSQL persistence ────────────────────────────────────────
function persistData() {
  try {
    const tables = ['users', 'customers', 'accounts', 'transactions', 'fraud_alerts', 'investigations', 'fraud_rules', 'audit_logs'];
    const dump = {};
    for (const tbl of tables) {
      try { dump[tbl] = alasql(`SELECT * FROM ${tbl}`) || []; }
      catch { dump[tbl] = []; }
    }
    fs.writeFileSync(dbFilePath, JSON.stringify(dump, null, 2));
  } catch (err) {
    console.error('Error persisting db data:', err);
  }
}

function loadPersistedData() {
  if (fs.existsSync(dbFilePath)) {
    try {
      const raw = fs.readFileSync(dbFilePath, 'utf8');
      const dump = JSON.parse(raw);
      for (const [tbl, rows] of Object.entries(dump)) {
        if (Array.isArray(rows) && rows.length > 0) {
          alasql(`DELETE FROM ${tbl}`);
          for (const row of rows) {
            alasql(`INSERT INTO ${tbl} VALUES ?`, [row]);
          }
        }
      }
    } catch (err) {
      console.error('Error loading db file:', err);
    }
  }
}

// ─── Detect which table and what kind of operation was done ──────────
// Tables that should trigger Supabase sync on INSERT/UPDATE/DELETE
const SYNC_TABLES = new Set([
  'users', 'customers', 'accounts', 'transactions',
  'fraud_alerts', 'investigations', 'fraud_rules', 'audit_logs'
]);

function detectSyncOperation(sql, params, result) {
  const upper = sql.trim().toUpperCase();

  // INSERT → upsert the freshly-inserted row(s) into Supabase
  if (upper.startsWith('INSERT INTO')) {
    const match = sql.match(/INSERT\s+INTO\s+(\w+)/i);
    if (match) {
      const table = match[1].toLowerCase();
      if (SYNC_TABLES.has(table) && params && params[0] && typeof params[0] === 'object') {
        setImmediate(() => upsertRow(table, params[0]));
      }
    }
  }

  // UPDATE → try to re-read & upsert the updated row
  if (upper.startsWith('UPDATE')) {
    const match = sql.match(/UPDATE\s+(\w+)/i);
    if (match) {
      const table = match[1].toLowerCase();
      if (SYNC_TABLES.has(table)) {
        // After updating, fetch by id from params if available
        const numericParam = (params || []).find(p => typeof p === 'number' || (typeof p === 'string' && !isNaN(p) && p.trim() !== ''));
        if (numericParam) {
          try {
            const rows = alasql(`SELECT * FROM ${table} WHERE id = ?`, [Number(numericParam)]);
            if (rows && rows[0]) {
              setImmediate(() => upsertRow(table, rows[0]));
            }
          } catch { /* ignore */ }
        }
      }
    }
  }

  // DELETE → remove from Supabase too
  if (upper.startsWith('DELETE FROM')) {
    const match = sql.match(/DELETE\s+FROM\s+(\w+)/i);
    if (match) {
      const table = match[1].toLowerCase();
      if (SYNC_TABLES.has(table)) {
        const numericParam = (params || []).find(p => typeof p === 'number' || (typeof p === 'string' && !isNaN(p) && p.trim() !== ''));
        if (numericParam) {
          setImmediate(() => deleteRow(table, Number(numericParam)));
        }
      }
    }
  }
}

// ─── Main query function ─────────────────────────────────────────────
async function query(sql, params = []) {
  // Convert numeric string parameters to Number for integer PK matching in AlaSQL
  let alasqlQuery = sql;
  const boundParams = params.map(p => {
    alasqlQuery = alasqlQuery.replace(/\$\d+/, '?');
    if (
      typeof p === 'string' &&
      !isNaN(p) &&
      p.trim() !== '' &&
      !p.includes('-') &&
      !p.includes(':') &&
      !p.includes('@') &&
      !p.includes(' ')
    ) {
      return Number(p);
    }
    return p;
  });

  const res = alasql(alasqlQuery, boundParams);
  persistData();

  // Async Supabase sync (non-blocking)
  detectSyncOperation(sql, boundParams, res);

  return Array.isArray(res) ? res : [res];
}

module.exports = { query, persistData, loadPersistedData };
