require('dotenv').config();
const express     = require('express');
const http        = require('http');
const { Server }  = require('socket.io');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET','POST'] }
});

// ─── MIDDLEWARE ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));

// Attach io to every request so controllers can emit events
app.use((req, _res, next) => { req.io = io; next(); });

// ─── ROUTES ────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/authRoutes'));
app.use('/api/orders',    require('./routes/orderRoutes'));
app.use('/api/menu',      require('./routes/menuRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/reports',   require('./routes/reportRoutes'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// ─── SOCKET.IO ─────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('join_kitchen', () => socket.join('kitchen'));
  socket.on('join_table',   (tableId) => socket.join(`table:${tableId}`));

  socket.on('disconnect', () => console.log(`🔌 Client disconnected: ${socket.id}`));
});

// ─── ERROR HANDLER ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// ─── START ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 POS API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = { app, server, io };
