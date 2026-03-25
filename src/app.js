const express = require('express');
const cors    = require('cors');
const { clientUrl } = require('./config/env');

const authRoutes = require('./modules/auth/auth.routes');
const servicesRoutes = require('./modules/services/services.routes');
const barbersRoutes = require('./modules/barbers/barbers.routes');
const appointmentsRoutes = require('./modules/appointments/appointments.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const usersRoutes = require('./modules/users/users.routes')
const ratingsRoutes = require('./modules/ratings/ratings.routes')
const shopRoutes = require('./modules/shop/shop.routes')
const app = express();

// ── Middlewares globales ──────────────────────
app.use(cors({
  origin:      clientUrl,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Rutas ─────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/barbers', barbersRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/shop', shopRoutes)

// ── Ruta no encontrada ────────────────────────
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: `Ruta ${req.method} ${req.path} no existe` 
  });
});

// ── Errores globales ──────────────────────────
app.use((err, req, res, next) => {
  console.error('💥 Error no manejado:', err);
  res.status(500).json({ success: false, error: 'Error interno del servidor' });
});

module.exports = app;