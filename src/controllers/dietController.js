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
          `SELECT id, name, quantity, notes, calories, protein, carbs, fat FROM "MealFood" WHERE "mealId" = $1 ORDER BY "order" ASC`,
          [meal.id]
        );

        // Convert food values to numbers to prevent .toFixed() errors
        const foods = foodsResult.rows.map(food => ({
          id: food.id,
          name: food.name,
          quantity: food.quantity,
          notes: food.notes,
          calories: parseFloat(food.calories || 0),
          protein: parseFloat(food.protein || 0),
          carbs: parseFloat(food.carbs || 0),
          fat: parseFloat(food.fat || 0)
        }));

        for (const food of foods) {
          totals.totalCalories += food.calories || 0;
          totals.totalProtein += food.protein || 0;
          totals.totalCarbs += food.carbs || 0;
          totals.totalFat += food.fat || 0;
        }

        meal.foods = foods;
      }

      activePlan.meals = meals;
    }

    // Ensure totals are numbers
    totals = {
      totalCalories: parseFloat(totals.totalCalories || 0),
      totalProtein: parseFloat(totals.totalProtein || 0),
      totalCarbs: parseFloat(totals.totalCarbs || 0),
      totalFat: parseFloat(totals.totalFat || 0)
    };

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
      `INSERT INTO "Meal" ("mealPlanId", name, "time")
       VALUES ($1, $2, $3)
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

    // 🔧 Validação de nome
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Nome do alimento inválido (mín 2 caracteres)' });
    }

    if (name.length > 100) {
      return res.status(400).json({ success: false, message: 'Nome do alimento muito longo (máx 100 caracteres)' });
    }

    // 🔧 Validação de quantidade (opcional, mas se fornecida deve ser válida)
    if (quantity && typeof quantity !== 'string') {
      return res.status(400).json({ success: false, message: 'Quantidade deve ser um texto válido' });
    }

    // 🔧 Converter e validar valores numéricos
    let caloriesVal = null;
    let proteinVal = null;
    let carbsVal = null;
    let fatVal = null;

    if (calories !== null && calories !== undefined && calories !== '') {
      caloriesVal = parseFloat(calories);
      if (isNaN(caloriesVal) || caloriesVal < 0) {
        return res.status(400).json({ success: false, message: 'Calorias deve ser um número não-negativo' });
      }
      caloriesVal = Math.round(caloriesVal * 100) / 100; // Limit to 2 decimals
    }

    if (protein !== null && protein !== undefined && protein !== '') {
      proteinVal = parseFloat(protein);
      if (isNaN(proteinVal) || proteinVal < 0) {
        return res.status(400).json({ success: false, message: 'Proteína deve ser um número não-negativo' });
      }
      proteinVal = Math.round(proteinVal * 100) / 100;
    }

    if (carbs !== null && carbs !== undefined && carbs !== '') {
      carbsVal = parseFloat(carbs);
      if (isNaN(carbsVal) || carbsVal < 0) {
        return res.status(400).json({ success: false, message: 'Carboidratos deve ser um número não-negativo' });
      }
      carbsVal = Math.round(carbsVal * 100) / 100;
    }

    if (fat !== null && fat !== undefined && fat !== '') {
      fatVal = parseFloat(fat);
      if (isNaN(fatVal) || fatVal < 0) {
        return res.status(400).json({ success: false, message: 'Gordura deve ser um número não-negativo' });
      }
      fatVal = Math.round(fatVal * 100) / 100;
    }

    // 🔧 Validação: pelo menos uma propriedade nutricional deve estar definida
    if (caloriesVal === null && proteinVal === null && carbsVal === null && fatVal === null) {
      return res.status(400).json({ success: false, message: 'Adicione pelo menos uma informação nutricional' });
    }

    // 🔧 Validação de notes (opcional)
    let notesVal = null;
    if (notes && typeof notes === 'string') {
      notesVal = notes.trim() || null;
      if (notesVal && notesVal.length > 500) {
        return res.status(400).json({ success: false, message: 'Notas muito longas (máx 500 caracteres)' });
      }
    }

    const result = await global.db.query(
      `INSERT INTO "MealFood" ("mealId", name, quantity, calories, protein, carbs, fat, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        parseInt(mealId),
        name.trim(),
        quantity?.trim() || null,
        caloriesVal,
        proteinVal,
        carbsVal,
        fatVal,
        notesVal
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
