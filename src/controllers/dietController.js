const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get diet page with active meal plan
 */
exports.getDiet = async (req, res, next) => {
  try {
    // Get active meal plan
    let activePlan = await prisma.mealPlan.findFirst({
      where: { isActive: true },
      include: {
        meals: {
          include: { foods: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    });

    // If no active plan, get the first one
    if (!activePlan) {
      activePlan = await prisma.mealPlan.findFirst({
        include: {
          meals: {
            include: { foods: { orderBy: { order: 'asc' } } },
            orderBy: { order: 'asc' },
          },
        },
      });
    }

    // Get all plans for switching
    const allPlans = await prisma.mealPlan.findMany();

    // Calculate totals
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    if (activePlan) {
      activePlan.meals.forEach((meal) => {
        meal.foods.forEach((food) => {
          totalCalories += food.calories || 0;
          totalProtein += food.protein || 0;
          totalCarbs += food.carbs || 0;
          totalFat += food.fat || 0;
        });
      });
    }

    res.render('diet/index', {
      title: 'Dieta',
      activePlan,
      allPlans,
      totals: { totalCalories, totalProtein, totalCarbs, totalFat },
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

    const plan = await prisma.mealPlan.create({
      data: { name, isActive: false },
    });

    res.json({ success: true, plan });
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
    await prisma.mealPlan.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Activate selected plan
    const plan = await prisma.mealPlan.update({
      where: { id: parseInt(planId) },
      data: { isActive: true },
    });

    res.json({ success: true, plan });
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

    const meal = await prisma.meal.create({
      data: {
        mealPlanId: parseInt(mealPlanId),
        name,
        time: time || null,
      },
    });

    res.json({ success: true, meal });
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

    await prisma.meal.delete({
      where: { id: parseInt(mealId) },
    });

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

    const food = await prisma.mealFood.create({
      data: {
        mealId: parseInt(mealId),
        name,
        quantity,
        calories: calories ? parseInt(calories) : null,
        protein: protein ? parseFloat(protein) : null,
        carbs: carbs ? parseFloat(carbs) : null,
        fat: fat ? parseFloat(fat) : null,
        notes: notes || null,
      },
    });

    res.json({ success: true, food });
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

    await prisma.mealFood.delete({
      where: { id: parseInt(foodId) },
    });

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

    const plan = await prisma.mealPlan.update({
      where: { id: parseInt(planId) },
      data: { name },
    });

    res.json({ success: true, plan });
  } catch (error) {
    console.error('Error updating meal plan:', error);
    next(error);
  }
};
