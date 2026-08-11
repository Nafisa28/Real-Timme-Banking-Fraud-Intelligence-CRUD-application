const knex = require('knex');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const isPostgres = process.env.DB_CLIENT === 'pg' || Boolean(process.env.DATABASE_URL);

const config = isPostgres
  ? {
      client: 'pg',
      connection: process.env.DATABASE_URL || {
        host: process.env.PGHOST || '127.0.0.1',
        port: process.env.PGPORT || 5432,
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'banking_fraud'
      },
      pool: { min: 2, max: 10 }
    }
  : {
      client: 'better-sqlite3',
      connection: {
        filename: process.env.DB_FILENAME || path.join(dataDir, 'banking_fraud.sqlite3')
      },
      useNullAsDefault: true
    };

const db = knex(config);

module.exports = db;
