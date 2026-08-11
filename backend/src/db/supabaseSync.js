/**
 * supabaseSync.js
 * ─────────────────────────────────────────────────────────────
 * Syncs all local AlaSQL data into Supabase (PostgreSQL cloud).
 * Called after every insert/update so that Supabase always
 * contains a live, up-to-date mirror of the application data.
 *
 * All operations are fire-and-forget (non-blocking) so they
 * never crash the local server even if Supabase is unreachable.
 * ─────────────────────────────────────────────────────────────
 */

const { supabase } = require('./supabaseClient');

const LOG = (msg) => console.log(`[Supabase Sync] ${msg}`);
const ERR = (msg, err) => console.error(`[Supabase Sync] ${msg}`, err?.message || err);

// ─── Table definitions with their valid column lists ───────────
const TABLE_COLUMNS = {
  users:          ['id', 'name', 'email', 'password_hash', 'role', 'created_at', 'updated_at'],
  customers:      ['id', 'first_name', 'last_name', 'email', 'phone', 'kyc_status', 'risk_rating', 'created_at'],
  accounts:       ['id', 'customer_id', 'account_number', 'account_type', 'balance', 'currency', 'status', 'created_at'],
  transactions:   ['id', 'account_id', 'amount', 'currency', 'transaction_type', 'merchant_name', 'location', 'device_id', 'ip_address', 'rule_score', 'ml_probability', 'risk_score', 'risk_level', 'triggered_rules', 'status', 'created_at'],
  fraud_alerts:   ['id', 'transaction_id', 'risk_score', 'risk_level', 'status', 'assigned_to', 'created_at', 'updated_at'],
  investigations: ['id', 'alert_id', 'analyst_id', 'notes', 'outcome', 'created_at'],
  fraud_rules:    ['id', 'rule_code', 'rule_name', 'category', 'description', 'weight', 'threshold', 'is_active', 'parameters', 'updated_at'],
  audit_logs:     ['id', 'user_id', 'action', 'entity_type', 'entity_id', 'details', 'created_at'],
};

/**
 * Strip a row down to only known Supabase columns for the given table.
 */
function sanitizeRow(table, row) {
  const cols = TABLE_COLUMNS[table];
  if (!cols) return row;
  const clean = {};
  for (const col of cols) {
    if (row[col] !== undefined) clean[col] = row[col];
  }
  return clean;
}

/**
 * Upsert a single row into a Supabase table.
 * Uses `id` as the conflict key so re-runs are idempotent.
 * @param {string} table  - Supabase table name
 * @param {object} row    - Row data object
 */
async function upsertRow(table, row) {
  if (!supabase) return;
  try {
    const clean = sanitizeRow(table, row);
    const { error } = await supabase
      .from(table)
      .upsert(clean, { onConflict: 'id' });

    if (error) {
      ERR(`upsert ${table} id=${row.id}`, error);
    } else {
      LOG(`✓ upserted ${table} id=${row.id}`);
    }
  } catch (err) {
    ERR(`upsert ${table} id=${row.id} (exception)`, err);
  }
}

/**
 * Upsert an array of rows into a Supabase table.
 * @param {string}  table - Supabase table name
 * @param {Array}   rows  - Array of row objects
 */
async function upsertMany(table, rows) {
  if (!supabase || !rows || rows.length === 0) return;
  try {
    const cleaned = rows.map(r => sanitizeRow(table, r));
    const { error } = await supabase
      .from(table)
      .upsert(cleaned, { onConflict: 'id' });

    if (error) {
      ERR(`upsertMany ${table} (${rows.length} rows)`, error);
    } else {
      LOG(`✓ upserted ${rows.length} rows into ${table}`);
    }
  } catch (err) {
    ERR(`upsertMany ${table} (exception)`, err);
  }
}

/**
 * Delete a single row from a Supabase table by ID.
 * @param {string} table - Supabase table name
 * @param {number} id    - Row primary key
 */
async function deleteRow(table, id) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      ERR(`delete ${table} id=${id}`, error);
    } else {
      LOG(`✓ deleted ${table} id=${id}`);
    }
  } catch (err) {
    ERR(`delete ${table} id=${id} (exception)`, err);
  }
}

/**
 * Full bulk sync — dumps all local AlaSQL tables into Supabase.
 * Called once on server startup so the remote DB is hydrated.
 * @param {object} allData  - Object keyed by table name with row arrays
 */
async function fullSync(allData) {
  if (!supabase) {
    LOG('Supabase not configured — skipping full sync');
    return;
  }
  LOG('Starting full sync to Supabase...');
  for (const [table, rows] of Object.entries(allData)) {
    if (TABLE_COLUMNS[table]) {
      await upsertMany(table, rows);
    }
  }
  LOG('Full sync complete ✓');
}

/**
 * Check if Supabase tables have been created yet.
 * Returns true if `users` table responds (even empty).
 */
async function isSchemaReady() {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    return !error || error.code !== 'PGRST205';
  } catch {
    return false;
  }
}

module.exports = { upsertRow, upsertMany, deleteRow, fullSync, isSchemaReady };
