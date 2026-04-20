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
          title: 'Erro',
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
 * Display register page
 */
exports.getRegister = (req, res) => {
  if (req.session.user) {
    return res.redirect('/workouts');
  }
  const csrfToken = req.csrfToken ? req.csrfToken() : '';
  res.render('auth/register', {
    title: 'Criar Conta',
    csrfToken,
  });
};

/**
 * Handle register submission
 */
exports.postRegister = async (req, res, next) => {
  try {
    const { username, password, confirmPassword } = req.body;
    const csrfToken = req.csrfToken ? req.csrfToken() : '';

    if (!username || !password || !confirmPassword) {
      return res.status(400).render('auth/register', {
        title: 'Criar Conta',
        error: 'Todos os campos são obrigatórios',
        csrfToken,
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).render('auth/register', {
        title: 'Criar Conta',
        error: 'As senhas não coincidem',
        csrfToken,
      });
    }

    if (password.length < 6) {
      return res.status(400).render('auth/register', {
        title: 'Criar Conta',
        error: 'A senha deve ter pelo menos 6 caracteres',
        csrfToken,
      });
    }

    const existing = await global.db.query(
      'SELECT id FROM "User" WHERE username = $1',
      [username]
    );

    if (existing.rows.length > 0) {
      return res.status(400).render('auth/register', {
        title: 'Criar Conta',
        error: 'Nome de usuário já está em uso',
        csrfToken,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await global.db.query(
      'INSERT INTO "User" (username, password) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword]
    );

    const user = result.rows[0];
    req.session.user = { id: user.id, username: user.username };

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).render('error', {
          title: 'Erro',
          message: 'Erro ao criar sessão',
        });
      }
      res.redirect('/workouts');
    });
  } catch (error) {
    console.error('Register error:', error);
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
