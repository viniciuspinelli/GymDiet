require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const csrf = require('csurf');
const morgan = require('morgan');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcrypt');

const authRoutes = require('./src/routes/auth');
const setupRoutes = require('./src/routes/setup');
const workoutRoutes = require('./src/routes/workouts');
const dietRoutes = require('./src/routes/diet');
const shoppingRoutes = require('./src/routes/shopping');
const authMiddleware = require('./src/middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Database Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Make pool globally available for routes
global.db = pool;

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

// CSRF protection setup
const csrfProtection = csrf({ cookie: false });

// EJS view engine with layouts support
const expressEjsLayouts = require('express-ejs-layouts');
app.use(expressEjsLayouts);
app.set('layout', 'layouts/main');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Apply CSRF protection globally
app.use(csrfProtection);

// Global response data middleware (after CSRF so token is available)
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.csrfToken = req.csrfToken();
  next();
});

// ========================
// ROUTES
// ========================

// Setup route (NO CSRF protection - skip via error handling)
app.use('/setup', setupRoutes);

// Serve setup page
app.get('/setup', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'public', 'setup.html'));
});

// Public routes (CSRF already applied)
app.use('/auth', authRoutes);

// Redirect root to workouts (or login if not authenticated)
app.get('/', async (req, res) => {
  try {
    // Check if any users exist
    const result = await global.db.query('SELECT COUNT(*) FROM "User"');
    const userCount = parseInt(result.rows[0].count);

    if (userCount === 0) {
      // No users yet, go to setup
      return res.redirect('/setup');
    }

    // Users exist, proceed normally
    if (req.session.user) {
      res.redirect('/workouts');
    } else {
      res.redirect('/auth/login');
    }
  } catch (err) {
    console.error('Erro ao verificar usuários:', err);
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
  // Allow CSRF errors for setup routes (they don't require CSRF token)
  if (err.code === 'EBADCSRFTOKEN' && req.path.startsWith('/setup')) {
    return next();
  }

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

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔄 Inicializando banco de dados...');
    
    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS "User" (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "WorkoutPlan" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        "dayOfWeek" VARCHAR(50),
        "order" INTEGER DEFAULT 0,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "Exercise" (
        id SERIAL PRIMARY KEY,
        "workoutPlanId" INTEGER NOT NULL REFERENCES "WorkoutPlan"(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        sets INTEGER NOT NULL,
        reps VARCHAR(50) NOT NULL,
        weight VARCHAR(50),
        "restSeconds" INTEGER,
        notes TEXT,
        "order" INTEGER DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "WorkoutSession" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "User"(id),
        "workoutPlanId" INTEGER NOT NULL REFERENCES "WorkoutPlan"(id),
        "startedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "completedAt" TIMESTAMP,
        "isCompleted" BOOLEAN DEFAULT false,
        "durationMin" INTEGER,
        notes TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "SessionExercise" (
        id SERIAL PRIMARY KEY,
        "workoutSessionId" INTEGER NOT NULL REFERENCES "WorkoutSession"(id) ON DELETE CASCADE,
        "exerciseId" INTEGER NOT NULL REFERENCES "Exercise"(id),
        "isCompleted" BOOLEAN DEFAULT false,
        "completedAt" TIMESTAMP,
        "actualSets" INTEGER,
        "actualReps" VARCHAR(50),
        "actualWeight" VARCHAR(50),
        notes TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "MealPlan" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        "isActive" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "Meal" (
        id SERIAL PRIMARY KEY,
        "mealPlanId" INTEGER NOT NULL REFERENCES "MealPlan"(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        time VARCHAR(50),
        "order" INTEGER DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "MealFood" (
        id SERIAL PRIMARY KEY,
        "mealId" INTEGER NOT NULL REFERENCES "Meal"(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        quantity VARCHAR(255) NOT NULL,
        calories INTEGER,
        protein DECIMAL(10, 2),
        carbs DECIMAL(10, 2),
        fat DECIMAL(10, 2),
        notes TEXT,
        "order" INTEGER DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "ShoppingList" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) DEFAULT 'Lista de Compras',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "ShoppingItem" (
        id SERIAL PRIMARY KEY,
        "shoppingListId" INTEGER NOT NULL REFERENCES "ShoppingList"(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        quantity VARCHAR(255),
        category VARCHAR(100),
        "isChecked" BOOLEAN DEFAULT false,
        notes TEXT,
        "order" INTEGER DEFAULT 0
      );
    `);

    console.log('✅ Tabelas criadas/verificadas com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao criar tabelas:', err.message);
    // Continue anyway - tables might already exist
  } finally {
    client.release();
  }
}

// Start server
async function start() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 GymDiet app running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar aplicação:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⛔ Shutting down...');
  pool.end(() => {
    console.log('database connection closed');
    process.exit(0);
  });
});

start();

module.exports = app;
