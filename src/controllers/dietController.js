// Diet Controller - Using global.db (pg Pool)

/**
 * Get diet page with active meal plan
 */
exports.getDiet = async (req, res, next) => {
  try {
    // Get active meal plan
    let activePlanResult = await global.db.query(
      `SELECT id, name, "isActive" FROM "MealPlan" WHERE "isActive" = true LIMIT 1`
    );

    let activePlan = activePlanResult.rows[0] || null;

    // If no active plan, get the first one
    if (!activePlan) {
      const firstResult = await global.db.query(
        `SELECT id, name, "isActive" FROM "MealPlan" LIMIT 1`
      );
      activePlan = firstResult.rows[0] || null;
    }

    // Get all plans for switching
    const allPlansResult = await global.db.query(
      `SELECT id, name, "isActive" FROM "MealPlan" ORDER BY "createdAt" DESC`
    );
    const allPlans = allPlansResult.rows;

    // Calculate totals if there's an active plan
    let totals = { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };

    if (activePlan) {
      const mealsResult = await global.db.query(
        `SELECT id, name, "time" FROM "Meal" WHERE "mealPlanId" = $1 ORDER BY "order" ASC`,
        [activePlan.id]
      );

      const meals = mealsResult.rows;

      for (const meal of meals) {
        const foodsResult = await global.db.query(
          `SELECT calories, protein, carbs, fat FROM "MealFood" WHERE "mealId" = $1 ORDER BY "order" ASC`,
          [meal.id]
        );

        for (const food of foodsResult.rows) {
          totals.totalCalories += food.calories || 0;
          totals.totalProtein += food.protein || 0;
          totals.totalCarbs += food.carbs || 0;
          totals.totalFat += food.fat || 0;
        }

        meal.foods = foodsResult.rows;
      }

      activePlan.meals = meals;
    }

    res.render('diet/index', {
      title: 'Dieta',
      activePlan,
      allPlans,
      totals,
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error('Error fetching diet:', error);
    next(error);
  }
};

/**
 * Create a new meal plan
 */
exports.createMealPlan = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
    }

    const result = await global.db.query(
      `INSERT INTO "MealPlan" (name, "isActive", "createdAt")
       VALUES ($1, false, NOW())
       RETURNING id, name, "isActive"`,
      [name]
    );

    res.json({ success: true, plan: result.rows[0] });
  } catch (error) {
    console.error('Error creating meal plan:', error);
    next(error);
  }
};

/**
 * Activate a meal plan
 */
exports.activateMealPlan = async (req, res, next) => {
  try {
    const { planId } = req.params;

    // Deactivate all other plans
    await global.db.query(
      `UPDATE "MealPlan" SET "isActive" = false WHERE "isActive" = true`
    );

    // Activate selected plan
    const result = await global.db.query(
      `UPDATE "MealPlan" SET "isActive" = true WHERE id = $1 RETURNING *`,
      [parseInt(planId)]
    );

    res.json({ success: true, plan: result.rows[0] });
  } catch (error) {
    console.error('Error activating meal plan:', error);
    next(error);
  }
};

/**
 * Add a meal to a plan
 */
exports.addMeal = async (req, res, next) => {
  try {
    const { mealPlanId, name, time } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
    }

    const result = await global.db.query(
      `INSERT INTO "Meal" ("mealPlanId", name, "time", "createdAt")
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [parseInt(mealPlanId), name, time || null]
    );

    res.json({ success: true, meal: result.rows[0] });
  } catch (error) {
    console.error('Error adding meal:', error);
    next(error);
  }
};

/**
 * Delete a meal
 */
exports.deleteMeal = async (req, res, next) => {
  try {
    const { mealId } = req.params;

    // Delete foods first
    await global.db.query(
      `DELETE FROM "MealFood" WHERE "mealId" = $1`,
      [parseInt(mealId)]
    );

    // Delete meal
    await global.db.query(
      `DELETE FROM "Meal" WHERE id = $1`,
      [parseInt(mealId)]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting meal:', error);
    next(error);
  }
};

/**
 * Add food to a meal
 */
exports.addFood = async (req, res, next) => {
  try {
    const { mealId, name, quantity, calories, protein, carbs, fat, notes } = req.body;

    if (!name || !quantity) {
      return res.status(400).json({ success: false, message: 'Nome e quantidade são obrigatórios' });
    }

    const result = await global.db.query(
      `INSERT INTO "MealFood" ("mealId", name, quantity, calories, protein, carbs, fat, notes, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [
        parseInt(mealId),
        name,
        quantity,
        calories ? parseInt(calories) : null,
        protein ? parseFloat(protein) : null,
        carbs ? parseFloat(carbs) : null,
        fat ? parseFloat(fat) : null,
        notes || null
      ]
    );

    res.json({ success: true, food: result.rows[0] });
  } catch (error) {
    console.error('Error adding food:', error);
    next(error);
  }
};

/**
 * Delete a food
 */
exports.deleteFood = async (req, res, next) => {
  try {
    const { foodId } = req.params;

    await global.db.query(
      `DELETE FROM "MealFood" WHERE id = $1`,
      [parseInt(foodId)]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting food:', error);
    next(error);
  }
};

/**
 * Update meal plan name
 */
exports.updateMealPlanName = async (req, res, next) => {
  try {
    const { planId } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
    }

    const result = await global.db.query(
      `UPDATE "MealPlan" SET name = $1 WHERE id = $2 RETURNING *`,
      [name, parseInt(planId)]
    );

    res.json({ success: true, plan: result.rows[0] });
  } catch (error) {
    console.error('Error updating meal plan:', error);
    next(error);
  }
};
