// Workout Controller - Using global.db (pg Pool)

/**
 * Get all workout plans
 */
exports.getWorkouts = async (req, res, next) => {
  try {
    const userId = req.session.user.id;

    // Get all active workout plans
    const plansResult = await global.db.query(
      'SELECT id, name, description, "isActive", "order" FROM "WorkoutPlan" WHERE "isActive" = true ORDER BY "order" ASC'
    );

    // Get total completed sessions for user
    const sessionsResult = await global.db.query(
      'SELECT COUNT(*) as count FROM "WorkoutSession" WHERE "userId" = $1 AND "isCompleted" = true',
      [userId]
    );

    const plans = plansResult.rows;
    const totalSessions = parseInt(sessionsResult.rows[0].count);

    res.render('workouts/index', {
      title: 'Treinos',
      plans,
      totalSessions,
    });
  } catch (error) {
    console.error('Error fetching workouts:', error);
    next(error);
  }
};

/**
 * Start a new workout session
 */
exports.startWorkout = async (req, res, next) => {
  try {
    const { id: planId } = req.params;
    const userId = req.session.user.id;

    // Verify workout plan exists
    const planResult = await global.db.query(
      'SELECT id, name, description FROM "WorkoutPlan" WHERE id = $1',
      [parseInt(planId)]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Plano não encontrado' });
    }

    const plan = planResult.rows[0];

    // Create workout session
    const sessionResult = await global.db.query(
      `INSERT INTO "WorkoutSession" ("userId", "workoutPlanId", "startedAt", "isCompleted")
       VALUES ($1, $2, NOW(), false)
       RETURNING id`,
      [userId, plan.id]
    );

    const sessionId = sessionResult.rows[0].id;

    // Get exercises for this plan
    const exercisesResult = await global.db.query(
      'SELECT id FROM "Exercise" WHERE "workoutPlanId" = $1 ORDER BY "order" ASC',
      [plan.id]
    );

    // Create session exercises
    for (const exercise of exercisesResult.rows) {
      await global.db.query(
        `INSERT INTO "SessionExercise" ("workoutSessionId", "exerciseId", "isCompleted")
         VALUES ($1, $2, false)`,
        [sessionId, exercise.id]
      );
    }

    res.redirect(`/workouts/session/${sessionId}`);
  } catch (error) {
    console.error('Error starting workout:', error);
    next(error);
  }
};

/**
 * Get active workout session
 */
exports.getActiveWorkout = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.session.user.id;

    // Get session
    const sessionResult = await global.db.query(
      `SELECT id, "userId", "workoutPlanId", "startedAt", "isCompleted"
       FROM "WorkoutSession" WHERE id = $1`,
      [parseInt(sessionId)]
    );

    if (sessionResult.rows.length === 0 || sessionResult.rows[0].userId !== userId) {
      return res.status(404).render('error', {
        message: 'Sessão de treino não encontrada',
      });
    }

    const session = sessionResult.rows[0];

    // Get workout plan
    const planResult = await global.db.query(
      'SELECT id, name FROM "WorkoutPlan" WHERE id = $1',
      [session.workoutPlanId]
    );
    session.workoutPlan = planResult.rows[0];

    // Get session exercises with details
    const exercisesResult = await global.db.query(
      `SELECT se.id, se."exerciseId", se."isCompleted", se."completedAt",
              e.name, e.description, e.sets, e.reps
       FROM "SessionExercise" se
       JOIN "Exercise" e ON se."exerciseId" = e.id
       WHERE se."workoutSessionId" = $1
       ORDER BY e."order" ASC`,
      [sessionId]
    );

    session.sessionExercises = exercisesResult.rows.map(row => ({
      id: row.id,
      exerciseId: row.exerciseId,
      isCompleted: row.isCompleted,
      completedAt: row.completedAt,
      exercise: {
        name: row.name,
        description: row.description,
        sets: row.sets,
        reps: row.reps,
      }
    }));

    const completedCount = session.sessionExercises.filter(se => se.isCompleted).length;
    const totalCount = session.sessionExercises.length;

    res.render('workouts/active', {
      title: 'Treino Ativo',
      session,
      completedCount,
      totalCount,
    });
  } catch (error) {
    console.error('Error fetching active workout:', error);
    next(error);
  }
};

/**
 * Mark exercise as completed
 */
exports.completeExercise = async (req, res, next) => {
  try {
    const { sessionId, exerciseId } = req.params;
    const userId = req.session.user.id;

    // Verify session belongs to user
    const sessionResult = await global.db.query(
      'SELECT "userId" FROM "WorkoutSession" WHERE id = $1',
      [parseInt(sessionId)]
    );

    if (sessionResult.rows.length === 0 || sessionResult.rows[0].userId !== userId) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    // Update session exercise
    const updateResult = await global.db.query(
      `UPDATE "SessionExercise"
       SET "isCompleted" = true, "completedAt" = NOW()
       WHERE id = $1
       RETURNING *`,
      [parseInt(exerciseId)]
    );

    res.json({ success: true, exercise: updateResult.rows[0] });
  } catch (error) {
    console.error('Error completing exercise:', error);
    next(error);
  }
};

/**
 * Complete workout session
 */
exports.completeWorkout = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.session.user.id;
    const { durationMin } = req.body;

    // Verify session belongs to user
    const sessionResult = await global.db.query(
      'SELECT "userId" FROM "WorkoutSession" WHERE id = $1',
      [parseInt(sessionId)]
    );

    if (sessionResult.rows.length === 0 || sessionResult.rows[0].userId !== userId) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    // Update session
    const updateResult = await global.db.query(
      `UPDATE "WorkoutSession"
       SET "isCompleted" = true, "completedAt" = NOW(), "durationMin" = $1
       WHERE id = $2
       RETURNING *`,
      [parseInt(durationMin) || 0, parseInt(sessionId)]
    );

    res.json({ success: true, session: updateResult.rows[0] });
  } catch (error) {
    console.error('Error completing workout:', error);
    next(error);
  }
};

/**
 * Get workout history
 */
exports.getHistory = async (req, res, next) => {
  try {
    const userId = req.session.user.id;

    // Get completed sessions
    const sessionsResult = await global.db.query(
      `SELECT ws.id, ws."workoutPlanId", ws."startedAt", ws."completedAt", ws."durationMin",
              wp.name as plan_name
       FROM "WorkoutSession" ws
       JOIN "WorkoutPlan" wp ON ws."workoutPlanId" = wp.id
       WHERE ws."userId" = $1 AND ws."isCompleted" = true
       ORDER BY ws."completedAt" DESC`,
      [userId]
    );

    const sessions = sessionsResult.rows.map(row => ({
      id: row.id,
      workoutPlanId: row.workoutPlanId,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      durationMin: row.durationMin,
      workoutPlan: { name: row.plan_name }
    }));

    res.render('workouts/history', {
      title: 'Histórico',
      sessions,
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    next(error);
  }
};

/**
 * Delete a workout session
 */
exports.deleteSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.session.user.id;

    // Verify session belongs to user
    const sessionResult = await global.db.query(
      'SELECT "userId" FROM "WorkoutSession" WHERE id = $1',
      [parseInt(sessionId)]
    );

    if (sessionResult.rows.length === 0 || sessionResult.rows[0].userId !== userId) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    // Delete session exercises first
    await global.db.query(
      'DELETE FROM "SessionExercise" WHERE "workoutSessionId" = $1',
      [parseInt(sessionId)]
    );

    // Delete session
    await global.db.query(
      'DELETE FROM "WorkoutSession" WHERE id = $1',
      [parseInt(sessionId)]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    next(error);
  }
};
