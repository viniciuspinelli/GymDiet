const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

/**
 * Check if admin already exists
 */
router.get('/admin-existe', async (req, res) => {
  try {
    const result = await global.db.query('SELECT COUNT(*) FROM "User"');
    const count = parseInt(result.rows[0].count);
    
    res.json({ existe: count > 0 });
  } catch (err) {
    console.error('Erro ao verificar admin:', err);
    res.status(500).json({ erro: 'Erro ao verificar admin' });
  }
});

/**
 * Create first admin user
 */
router.post('/setup-admin', async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;

    // Validate inputs
    if (!username || !password || !confirmPassword) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Usuário, senha e confirmação são obrigatórios'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Senhas não coincidem'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Senha deve ter pelo menos 6 caracteres'
      });
    }

    // Check if user already exists
    const existingUser = await global.db.query(
      'SELECT id FROM "User" LIMIT 1'
    );

    if (existingUser.rows.length > 0) {
      return res.status(403).json({
        sucesso: false,
        erro: 'Admin já foi criado anteriormente'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await global.db.query(
      'INSERT INTO "User" (username, password) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword]
    );

    console.log('✅ Admin criado:', result.rows[0].username);

    res.json({
      sucesso: true,
      mensagem: 'Admin criado com sucesso!',
      usuario: result.rows[0]
    });
  } catch (err) {
    console.error('Erro ao criar admin:', err);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao criar admin'
    });
  }
});

module.exports = router;
