const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Display login page
 */
exports.getLogin = (req, res) => {
  // Redirect if already logged in
  if (req.session.user) {
    return res.redirect('/workouts');
  }
  res.render('auth/login', { title: 'Login' });
};

/**
 * Handle login submission
 */
exports.postLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validate inputs
    if (!username || !password) {
      return res.status(400).render('auth/login', {
        title: 'Login',
        error: 'Usuário e senha são obrigatórios',
      });
    }

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(401).render('auth/login', {
        title: 'Login',
        error: 'Usuário ou senha inválidos',
      });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).render('auth/login', {
        title: 'Login',
        error: 'Usuário ou senha inválidos',
      });
    }

    // Create session
    req.session.user = {
      id: user.id,
      username: user.username,
    };

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).render('error', {
          message: 'Erro ao criar sessão',
        });
      }
      res.redirect('/workouts');
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

/**
 * Handle logout
 */
exports.getLogout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
      return next(err);
    }
    res.redirect('/auth/login');
  });
};
