// Workout Controller - Using global.db (pg Pool)
// TODO: Adapt Prisma queries to pg format

/**
 * Get all workout plans
 */
exports.getWorkouts = async (req, res, next) => {
  try {
    const userId = req.session.user.id;

    // Get all workout plans with exercise count
    const plans = await prisma.workoutPlan.findMany({
      where: { isActive: true },
      include: {
        exercises: true,
        sessions: {
          where: {
            userId,
            isCompleted: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Count total completed sessions across all plans
    const totalSessions = await prisma.workoutSession.count({
      where: {
        userId,
        isCompleted: true,
      },
    });

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
    const plan = await prisma.workoutPlan.findUnique({
      where: { id: parseInt(planId) },
      include: { exercises: { orderBy: { order: 'asc' } } },
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plano não encontrado' });
    }

    // Create workout session
    const session = await prisma.workoutSession.create({
      data: {
        userId,
        workoutPlanId: plan.id,
        startedAt: new Date(),
      },
    });

    // Create session exercises
    await Promise.all(
      plan.exercises.map((exercise) =>
        prisma.sessionExercise.create({
          data: {
            workoutSessionId: session.id,
            exerciseId: exercise.id,
          },
        })
      )
    );

    res.redirect(`/workouts/session/${session.id}`);
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

    const session = await prisma.workoutSession.findUnique({
      where: { id: parseInt(sessionId) },
      include: {
        workoutPlan: true,
        sessionExercises: {
          include: { exercise: true },
          orderBy: { exercise: { order: 'asc' } },
        },
      },
    });

    if (!session || session.userId !== userId) {
      return res.status(404).render('error', {
        message: 'Sessão de treino não encontrada',
      });
    }

    const completedCount = session.sessionExercises.filter((se) => se.isCompleted).length;
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
    const session = await prisma.workoutSession.findUnique({
      where: { id: parseInt(sessionId) },
    });

    if (!session || session.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    // Update session exercise
    const updatedExercise = await prisma.sessionExercise.update({
      where: {
        id: parseInt(exerciseId),
      },
      data: {
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    res.json({ success: true, exercise: updatedExercise });
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
    const session = await prisma.workoutSession.findUnique({
      where: { id: parseInt(sessionId) },
    });

    if (!session || session.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    // Update session
    const updatedSession = await prisma.workoutSession.update({
      where: { id: parseInt(sessionId) },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        durationMin: parseInt(durationMin) || 0,
      },
    });

    res.json({ success: true, session: updatedSession });
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

    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        isCompleted: true,
      },
      include: {
        workoutPlan: true,
        sessionExercises: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    // Group sessions by plan
    const sessionsByPlan = {};
    sessions.forEach((session) => {
      const planName = session.workoutPlan.name;
      if (!sessionsByPlan[planName]) {
        sessionsByPlan[planName] = [];
      }
      sessionsByPlan[planName].push(session);
    });

    res.render('workouts/history', {
      title: 'Histórico de Treinos',
      sessions,
      sessionsByPlan,
      totalSessions: sessions.length,
    });
  } catch (error) {
    console.error('Error fetching workout history:', error);
    next(error);
  }
};
