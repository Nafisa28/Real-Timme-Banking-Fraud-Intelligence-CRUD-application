const http = require('http');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');

// __dirname = backend/src — so ../.env = backend/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const { initSchema } = require('./db/schema');
const { seedCleanData } = require('./db/seed');
const { initWebSocket } = require('./services/websocket');
const { startAutoEscalationCron } = require('./services/autoEscalation');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const customerRoutes = require('./routes/customerRoutes');
const accountRoutes = require('./routes/accountRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const alertRoutes = require('./routes/alertRoutes');
const investigationRoutes = require('./routes/investigationRoutes');
const ruleRoutes = require('./routes/ruleRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// API Rate Limiter (Phase 3 Enterprise requirement)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' }
});

app.use('/api', apiLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Real-Time Banking Fraud Intelligence API',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/investigations', investigationRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit-logs', auditRoutes);

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

const alasql = require('alasql');
const { fullSync, isSchemaReady } = require('./db/supabaseSync');

async function bootstrap() {
  try {
    await initSchema();
    await seedCleanData();
    initWebSocket(server);
    startAutoEscalationCron(30, 60); // Check every 30 sec for 60 min SLA

    server.listen(PORT, HOST, () => {
      console.log(`Backend Express Server running on http://${HOST}:${PORT}`);
      console.log(`WebSocket Server listening on ws://${HOST}:${PORT}/ws`);
    });

    // ── Supabase full sync on startup (async, non-blocking) ──────────
    const schemaReady = await isSchemaReady();
    if (schemaReady) {
      const tables = ['users', 'customers', 'accounts', 'transactions', 'fraud_alerts', 'investigations', 'fraud_rules', 'audit_logs'];
      const allData = {};
      for (const tbl of tables) {
        try { allData[tbl] = alasql(`SELECT * FROM ${tbl}`) || []; }
        catch { allData[tbl] = []; }
      }
      await fullSync(allData);
    } else {
      console.warn('[Supabase] Tables not yet created. Run supabase_schema.sql in Supabase SQL Editor first, then restart the server.');
    }
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

bootstrap();
