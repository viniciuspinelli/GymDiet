const bcrypt = require('bcrypt');

// ========================
// DASHBOARD
// ========================
exports.getDashboard = async (req, res, next) => {
  try {
    const usersResult = await global.db.query(`SELECT COUNT(*) FROM "User" WHERE role = 'user'`);
    const workoutTemplatesResult = await global.db.query(`SELECT COUNT(*) FROM "WorkoutPlan" WHERE "isTemplate" = true`);
    const dietTemplatesResult = await global.db.query(`SELECT COUNT(*) FROM "MealPlan" WHERE "isTemplate" = true`);
    const sessionsResult = await global.db.query(`SELECT COUNT(*) FROM "WorkoutSession" WHERE "isCompleted" = true`);

    res.render('admin/dashboard', {
      title: 'Painel Admin',
      csrfToken: req.csrfToken(),
      stats: {
        users: parseInt(usersResult.rows[0].count),
        workoutTemplates: parseInt(workoutTemplatesResult.rows[0].count),
        dietTemplates: parseInt(dietTemplatesResult.rows[0].count),
        sessions: parseInt(sessionsResult.rows[0].count),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ========================
// USER MANAGEMENT
// ========================
exports.getUsers = async (req, res, next) => {
  try {
    const result = await global.db.query(
      `SELECT id, username, role, "createdAt" FROM "User" ORDER BY "createdAt" DESC`
    );
    res.render('admin/users', {
      title: 'Gerenciar Usuários',
      csrfToken: req.csrfToken(),
      users: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

exports.getCreateUser = (req, res) => {
  res.render('admin/user-form', {
    title: 'Novo Usuário',
    csrfToken: req.csrfToken(),
    editUser: null,
    error: null,
  });
};

exports.postCreateUser = async (req, res, next) => {
  try {
    const { username, password, role, email } = req.body;
    if (!username || !password || !email) {
      return res.render('admin/user-form', {
        title: 'Novo Usuário',
        csrfToken: req.csrfToken(),
        editUser: null,
        error: 'Usuário, senha e e-mail são obrigatórios',
      });
    }
    const existing = await global.db.query(`SELECT id FROM "User" WHERE username = $1`, [username]);
    if (existing.rows.length > 0) {
      return res.render('admin/user-form', {
        title: 'Novo Usuário',
        csrfToken: req.csrfToken(),
        editUser: null,
        error: 'Nome de usuário já está em uso',
      });
    }
    const hashed = await bcrypt.hash(password, 12);
    const safeRole = role === 'admin' ? 'admin' : 'user';
    const safeEmail = email && email.trim() ? email.trim().toLowerCase() : null;
    await global.db.query(
      `INSERT INTO "User" (username, password, role, email) VALUES ($1, $2, $3, $4)`,
      [username, hashed, safeRole, safeEmail]
    );
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
};

exports.getEditUser = async (req, res, next) => {
  try {
    const result = await global.db.query(
      `SELECT id, username, role, email FROM "User" WHERE id = $1`, [req.params.id]
    );
    if (!result.rows[0]) return res.redirect('/admin/users');
    res.render('admin/user-form', {
      title: 'Editar Usuário',
      csrfToken: req.csrfToken(),
      editUser: result.rows[0],
      error: null,
    });
  } catch (err) {
    next(err);
  }
};

exports.postEditUser = async (req, res, next) => {
  try {
    const { username, password, role, email } = req.body;
    const userId = parseInt(req.params.id);

    // Prevent demoting yourself
    if (userId === req.session.user.id && role !== 'admin') {
      const result = await global.db.query(`SELECT id, username, role, email FROM "User" WHERE id = $1`, [userId]);
      return res.render('admin/user-form', {
        title: 'Editar Usuário',
        csrfToken: req.csrfToken(),
        editUser: result.rows[0],
        error: 'Você não pode remover o seu próprio acesso de admin',
      });
    }

    const safeRole = role === 'admin' ? 'admin' : 'user';
    const safeEmail = email && email.trim() ? email.trim().toLowerCase() : null;

    if (password && password.trim() !== '') {
      const hashed = await bcrypt.hash(password, 12);
      await global.db.query(
        `UPDATE "User" SET username = $1, password = $2, role = $3, email = $4 WHERE id = $5`,
        [username, hashed, safeRole, safeEmail, userId]
      );
    } else {
      await global.db.query(
        `UPDATE "User" SET username = $1, role = $2, email = $3 WHERE id = $4`,
        [username, safeRole, safeEmail, userId]
      );
    }
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    if (userId === req.session.user.id) {
      return res.status(400).json({ success: false, message: 'Você não pode deletar sua própria conta' });
    }
    await global.db.query(`DELETE FROM "User" WHERE id = $1`, [userId]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.getUserDetail = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const userResult = await global.db.query(`SELECT id, username, role FROM "User" WHERE id = $1`, [userId]);
    if (!userResult.rows[0]) return res.redirect('/admin/users');
    const targetUser = userResult.rows[0];

    const workoutsResult = await global.db.query(
      `SELECT id, name, "isActive", "dayOfWeek" FROM "WorkoutPlan" WHERE "userId" = $1 AND "isTemplate" = false ORDER BY "order" ASC`,
      [userId]
    );
    const dietsResult = await global.db.query(
      `SELECT id, name, "isActive" FROM "MealPlan" WHERE "userId" = $1 AND "isTemplate" = false ORDER BY "createdAt" DESC`,
      [userId]
    );

    const workoutTemplatesResult = await global.db.query(
      `SELECT id, name, "dayOfWeek" FROM "WorkoutPlan" WHERE "isTemplate" = true ORDER BY name ASC`
    );
    const dietTemplatesResult = await global.db.query(
      `SELECT id, name FROM "MealPlan" WHERE "isTemplate" = true ORDER BY name ASC`
    );

    res.render('admin/user-detail', {
      title: `Usuário: ${targetUser.username}`,
      csrfToken: req.csrfToken(),
      targetUser,
      workouts: workoutsResult.rows,
      diets: dietsResult.rows,
      workoutTemplates: workoutTemplatesResult.rows,
      dietTemplates: dietTemplatesResult.rows,
    });
  } catch (err) {
    next(err);
  }
};

// ========================
// TEMPLATE LIBRARY
// ========================
exports.getTemplates = async (req, res, next) => {
  try {
    const workoutsResult = await global.db.query(
      `SELECT wp.id, wp.name, wp.description, wp."dayOfWeek",
              COUNT(e.id) AS exercise_count
       FROM "WorkoutPlan" wp
       LEFT JOIN "Exercise" e ON e."workoutPlanId" = wp.id
       WHERE wp."isTemplate" = true
       GROUP BY wp.id
       ORDER BY wp.name ASC`
    );
    const dietsResult = await global.db.query(
      `SELECT mp.id, mp.name,
              COUNT(m.id) AS meal_count
       FROM "MealPlan" mp
       LEFT JOIN "Meal" m ON m."mealPlanId" = mp.id
       WHERE mp."isTemplate" = true
       GROUP BY mp.id
       ORDER BY mp.name ASC`
    );

    res.render('admin/templates', {
      title: 'Biblioteca de Planos',
      csrfToken: req.csrfToken(),
      workoutTemplates: workoutsResult.rows,
      dietTemplates: dietsResult.rows,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteWorkoutTemplate = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await global.db.query(
      `DELETE FROM "WorkoutSession" WHERE "workoutPlanId" = $1`, [id]
    );
    await global.db.query(
      `DELETE FROM "Exercise" WHERE "workoutPlanId" = $1`, [id]
    );
    await global.db.query(
      `DELETE FROM "WorkoutPlan" WHERE id = $1 AND "isTemplate" = true`, [id]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.deleteDietTemplate = async (req, res, next) => {
  try {
    await global.db.query(
      `DELETE FROM "MealPlan" WHERE id = $1 AND "isTemplate" = true`,
      [parseInt(req.params.id)]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ========================
// ASSIGN PLANS TO USERS
// ========================
exports.assignWorkout = async (req, res, next) => {
  const client = await global.db.connect();
  try {
    const { templateId } = req.body;
    const userId = parseInt(req.params.id);

    const templateResult = await client.query(
      `SELECT * FROM "WorkoutPlan" WHERE id = $1 AND "isTemplate" = true`,
      [parseInt(templateId)]
    );
    if (!templateResult.rows[0]) {
      return res.status(404).json({ success: false, message: 'Template não encontrado' });
    }
    const template = templateResult.rows[0];

    await client.query('BEGIN');

    // Deep copy the workout plan for the user
    const newPlanResult = await client.query(
      `INSERT INTO "WorkoutPlan" (name, description, "dayOfWeek", "order", "isActive", "isTemplate", "userId")
       VALUES ($1, $2, $3, $4, true, false, $5) RETURNING id`,
      [template.name, template.description, template.dayOfWeek, template.order, userId]
    );
    const newPlanId = newPlanResult.rows[0].id;

    // Copy exercises
    const exercises = await client.query(
      `SELECT * FROM "Exercise" WHERE "workoutPlanId" = $1 ORDER BY "order" ASC`,
      [template.id]
    );
    for (const ex of exercises.rows) {
      await client.query(
        `INSERT INTO "Exercise" ("workoutPlanId", name, sets, reps, weight, "restSeconds", notes, "order")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [newPlanId, ex.name, ex.sets, ex.reps, ex.weight, ex.restSeconds, ex.notes, ex.order]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

exports.assignDiet = async (req, res, next) => {
  const client = await global.db.connect();
  try {
    const { templateId } = req.body;
    const userId = parseInt(req.params.id);

    const templateResult = await client.query(
      `SELECT * FROM "MealPlan" WHERE id = $1 AND "isTemplate" = true`,
      [parseInt(templateId)]
    );
    if (!templateResult.rows[0]) {
      return res.status(404).json({ success: false, message: 'Template não encontrado' });
    }
    const template = templateResult.rows[0];

    // Deactivate current active plan
    await client.query('BEGIN');
    await client.query(
      `UPDATE "MealPlan" SET "isActive" = false WHERE "userId" = $1`, [userId]
    );

    // Deep copy
    const newPlanResult = await client.query(
      `INSERT INTO "MealPlan" (name, "isActive", "isTemplate", "userId")
       VALUES ($1, true, false, $2) RETURNING id`,
      [template.name, userId]
    );
    const newPlanId = newPlanResult.rows[0].id;

    const meals = await client.query(
      `SELECT * FROM "Meal" WHERE "mealPlanId" = $1 ORDER BY "order" ASC`,
      [template.id]
    );
    for (const meal of meals.rows) {
      const newMealResult = await client.query(
        `INSERT INTO "Meal" ("mealPlanId", name, time, "order") VALUES ($1, $2, $3, $4) RETURNING id`,
        [newPlanId, meal.name, meal.time, meal.order]
      );
      const newMealId = newMealResult.rows[0].id;

      const foods = await client.query(
        `SELECT * FROM "MealFood" WHERE "mealId" = $1 ORDER BY "order" ASC`,
        [meal.id]
      );
      for (const food of foods.rows) {
        await client.query(
          `INSERT INTO "MealFood" ("mealId", name, quantity, calories, protein, carbs, fat, notes, "order")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [newMealId, food.name, food.quantity, food.calories, food.protein, food.carbs, food.fat, food.notes, food.order]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

exports.removeWorkout = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    const planId = parseInt(req.params.planId);
    // Delete sessions first (SessionExercise cascades from WorkoutSession)
    await global.db.query(
      `DELETE FROM "WorkoutSession" WHERE "workoutPlanId" = $1 AND "userId" = $2`,
      [planId, userId]
    );
    await global.db.query(
      `DELETE FROM "Exercise" WHERE "workoutPlanId" = $1`,
      [planId]
    );
    await global.db.query(
      `DELETE FROM "WorkoutPlan" WHERE id = $1 AND "userId" = $2 AND "isTemplate" = false`,
      [planId, userId]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.removeDiet = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    const planId = parseInt(req.params.planId);
    await global.db.query(
      `DELETE FROM "MealPlan" WHERE id = $1 AND "userId" = $2 AND "isTemplate" = false`,
      [planId, userId]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
