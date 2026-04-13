require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const csrf = require('csurf');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const authRoutes = require('./src/routes/auth');
const workoutRoutes = require('./src/routes/workouts');
const dietRoutes = require('./src/routes/diet');
const shoppingRoutes = require('./src/routes/shopping');
const authMiddleware = require('./src/middleware/authMiddleware');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// ========================
// MIDDLEWARE
// ========================

// Logger
app.use(morgan('combined'));

// Body parsing
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'src', 'public')));

// Session configuration
app.use(
  session({
    store: new pgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// CSRF protection (except for certain endpoints)
const csrfProtection = csrf({ cookie: false });
app.use(csrfProtection);

// EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Global response data middleware
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.csrfToken = req.csrfToken();
  next();
});

// ========================
// ROUTES
// ========================

// Public routes
app.use('/auth', authRoutes);

// Redirect root to workouts (or login if not authenticated)
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/workouts');
  } else {
    res.redirect('/auth/login');
  }
});

// Protected routes (require authentication)
app.use('/workouts', authMiddleware, workoutRoutes);
app.use('/diet', authMiddleware, dietRoutes);
app.use('/shopping', authMiddleware, shoppingRoutes);

// ========================
// ERROR HANDLING
// ========================

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    message: 'Página não encontrada',
    error: { status: 404 },
  });
});

// Global error handler
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  console.error(`[${new Date().toISOString()}] Error:`, err);

  // For API requests, return JSON
  if (req.accepts('json') && !req.accepts('html')) {
    return res.status(status).json({
      success: false,
      message,
    });
  }

  // For HTML requests, render error page
  res.status(status).render('error', {
    message,
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});

// ========================
// START SERVER
// ========================

const server = app.listen(PORT, () => {
  console.log(`🚀 GymDiet app running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⛔ Shutting down gracefully...');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;
