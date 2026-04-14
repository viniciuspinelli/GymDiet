// Shopping Controller - Using global.db (pg Pool)
// TODO: Adapt Prisma queries to pg format

/**
 * Get shopping list page
 */
exports.getShopping = async (req, res, next) => {
  try {
    // Get the most recent shopping list
    let list = await prisma.shoppingList.findFirst({
      include: { items: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    // If no list exists, create one
    if (!list) {
      list = await prisma.shoppingList.create({
        data: { name: 'Lista de Compras' },
      });
    }

    // Group items by category
    const itemsByCategory = {};
    let totalItems = 0;
    let checkedItems = 0;

    list.items.forEach((item) => {
      const category = item.category || 'Outros';
      if (!itemsByCategory[category]) {
        itemsByCategory[category] = [];
      }
      itemsByCategory[category].push(item);
      totalItems++;
      if (item.isChecked) checkedItems++;
    });

    // Get all lists for switching
    const allLists = await prisma.shoppingList.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.render('shopping/index', {
      title: 'Lista de Compras',
      list,
      itemsByCategory,
      allLists,
      totalItems,
      checkedItems,
    });
  } catch (error) {
    console.error('Error fetching shopping list:', error);
    next(error);
  }
};

/**
 * Create a new shopping list
 */
exports.createList = async (req, res, next) => {
  try {
    const list = await prisma.shoppingList.create({
      data: { name: 'Lista de Compras' },
    });

    res.json({ success: true, list });
  } catch (error) {
    console.error('Error creating shopping list:', error);
    next(error);
  }
};

/**
 * Add item to shopping list
 */
exports.addItem = async (req, res, next) => {
  try {
    const { shoppingListId, name, quantity, category, notes } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
    }

    const item = await prisma.shoppingItem.create({
      data: {
        shoppingListId: parseInt(shoppingListId),
        name,
        quantity: quantity || null,
        category: category || 'Outros',
        notes: notes || null,
      },
    });

    res.json({ success: true, item });
  } catch (error) {
    console.error('Error adding item:', error);
    next(error);
  }
};

/**
 * Toggle item checked state
 */
exports.toggleItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    // Get current state
    const item = await prisma.shoppingItem.findUnique({
      where: { id: parseInt(itemId) },
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item não encontrado' });
    }

    // Toggle state
    const updatedItem = await prisma.shoppingItem.update({
      where: { id: parseInt(itemId) },
      data: { isChecked: !item.isChecked },
    });

    res.json({ success: true, item: updatedItem });
  } catch (error) {
    console.error('Error toggling item:', error);
    next(error);
  }
};

/**
 * Update item
 */
exports.updateItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { name, quantity, category, notes } = req.body;

    const updatedItem = await prisma.shoppingItem.update({
      where: { id: parseInt(itemId) },
      data: {
        name: name || undefined,
        quantity: quantity || undefined,
        category: category || undefined,
        notes: notes || undefined,
      },
    });

    res.json({ success: true, item: updatedItem });
  } catch (error) {
    console.error('Error updating item:', error);
    next(error);
  }
};

/**
 * Delete item from shopping list
 */
exports.deleteItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    await prisma.shoppingItem.delete({
      where: { id: parseInt(itemId) },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting item:', error);
    next(error);
  }
};

/**
 * Clear all checked items
 */
exports.clearChecked = async (req, res, next) => {
  try {
    const { listId } = req.params;

    await prisma.shoppingItem.deleteMany({
      where: {
        shoppingListId: parseInt(listId),
        isChecked: true,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing checked items:', error);
    next(error);
  }
};

/**
 * Import foods from active meal plan
 */
exports.importFromDiet = async (req, res, next) => {
  try {
    // Get active meal plan
    const activePlan = await prisma.mealPlan.findFirst({
      where: { isActive: true },
      include: {
        meals: {
          include: { foods: true },
        },
      },
    });

    if (!activePlan) {
      return res.status(400).json({ success: false, message: 'Nenhum plano de dieta ativo' });
    }

    // Get the most recent shopping list
    let list = await prisma.shoppingList.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!list) {
      list = await prisma.shoppingList.create({
        data: { name: 'Lista de Compras' },
      });
    }

    // Extract and combine foods from all meals
    const foodMap = {};
    activePlan.meals.forEach((meal) => {
      meal.foods.forEach((food) => {
        const key = `${food.name}-${food.category || 'Outros'}`;
        if (foodMap[key]) {
          // Combine quantities (simple string concatenation for now)
          foodMap[key].quantity = `${foodMap[key].quantity}; ${food.quantity}`;
        } else {
          foodMap[key] = food;
        }
      });
    });

    // Create shopping items from foods
    const importedItems = [];
    for (const food of Object.values(foodMap)) {
      const item = await prisma.shoppingItem.create({
        data: {
          shoppingListId: list.id,
          name: food.name,
          quantity: food.quantity,
          category: food.category || 'Outros',
        },
      });
      importedItems.push(item);
    }

    res.json({ success: true, count: importedItems.length, list });
  } catch (error) {
    console.error('Error importing from diet:', error);
    next(error);
  }
};
