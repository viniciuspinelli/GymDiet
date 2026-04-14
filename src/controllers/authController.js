const bcrypt = require('bcrypt');

/**
 * Display login page
 */
exports.getLogin = (req, res) => {
  // Redirect if already logged in
  if (req.session.user) {
    return res.redirect('/workouts');
  }
  
  // Ensure CSRF token is passed
  const csrfToken = req.csrfToken ? req.csrfToken() : '';
  res.render('auth/login', { 
    title: 'Login',
    csrfToken 
  });
};

/**
 * Handle login submission
 */
exports.postLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validate inputs
    if (!username || !password) {
      const csrfToken = req.csrfToken ? req.csrfToken() : '';
      return res.status(400).render('auth/login', {
        title: 'Login',
        error: 'Usuário e senha são obrigatórios',
        csrfToken
      });
    }

    // Find user by username
    const result = await global.db.query(
      'SELECT id, username, password FROM "User" WHERE username = $1',
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      const csrfToken = req.csrfToken ? req.csrfToken() : '';
      return res.status(401).render('auth/login', {
        title: 'Login',
        error: 'Usuário ou senha inválidos',
        csrfToken
      });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      const csrfToken = req.csrfToken ? req.csrfToken() : '';
      return res.status(401).render('auth/login', {
        title: 'Login',
        error: 'Usuário ou senha inválidos',
        csrfToken
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
