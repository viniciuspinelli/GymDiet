// Shopping Controller - Using global.db (pg Pool)

/**
 * Get shopping list page
 */
exports.getShopping = async (req, res, next) => {
  try {
    // Get the most recent shopping list
    let listResult = await global.db.query(
      `SELECT id, name, "createdAt" FROM "ShoppingList" ORDER BY "createdAt" DESC LIMIT 1`
    );

    let list = listResult.rows[0];

    // If no list exists, create one
    if (!list) {
      const createResult = await global.db.query(
        `INSERT INTO "ShoppingList" (name, "createdAt")
         VALUES ($1, NOW())
         RETURNING *`,
        ['Lista de Compras']
      );
      list = createResult.rows[0];
    }

    // Get items for this list
    const itemsResult = await global.db.query(
      `SELECT id, name, quantity, category, "isChecked", "order"
       FROM "ShoppingItem"
       WHERE "shoppingListId" = $1
       ORDER BY "order" ASC`,
      [list.id]
    );

    // Group items by category
    const itemsByCategory = {};
    let totalItems = 0;
    let checkedItems = 0;

    itemsResult.rows.forEach(item => {
      const category = item.category || 'Outros';
      if (!itemsByCategory[category]) {
        itemsByCategory[category] = [];
      }
      itemsByCategory[category].push(item);
      totalItems++;
      if (item.isChecked) checkedItems++;
    });

    // Get all lists for switching
    const allListsResult = await global.db.query(
      `SELECT id, name, "createdAt" FROM "ShoppingList" ORDER BY "createdAt" DESC`
    );

    res.render('shopping/index', {
      title: 'Lista de Compras',
      list,
      itemsByCategory,
      allLists: allListsResult.rows,
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
    const result = await global.db.query(
      `INSERT INTO "ShoppingList" (name, "createdAt")
       VALUES ($1, NOW())
       RETURNING *`,
      ['Lista de Compras']
    );

    res.json({ success: true, list: result.rows[0] });
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

    const result = await global.db.query(
      `INSERT INTO "ShoppingItem" ("shoppingListId", name, quantity, category, notes, "isChecked", "createdAt")
       VALUES ($1, $2, $3, $4, $5, false, NOW())
       RETURNING *`,
      [parseInt(shoppingListId), name, quantity || null, category || 'Outros', notes || null]
    );

    res.json({ success: true, item: result.rows[0] });
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
    const itemResult = await global.db.query(
      `SELECT "isChecked" FROM "ShoppingItem" WHERE id = $1`,
      [parseInt(itemId)]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item não encontrado' });
    }

    const currentState = itemResult.rows[0].isChecked;

    // Toggle state
    const result = await global.db.query(
      `UPDATE "ShoppingItem" SET "isChecked" = $1 WHERE id = $2 RETURNING *`,
      [!currentState, parseInt(itemId)]
    );

    res.json({ success: true, item: result.rows[0] });
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

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (quantity !== undefined) {
      updates.push(`quantity = $${paramCount++}`);
      values.push(quantity);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      values.push(category);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhum campo para atualizar' });
    }

    values.push(parseInt(itemId));

    const result = await global.db.query(
      `UPDATE "ShoppingItem" SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json({ success: true, item: result.rows[0] });
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

    await global.db.query(
      `DELETE FROM "ShoppingItem" WHERE id = $1`,
      [parseInt(itemId)]
    );

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

    await global.db.query(
      `DELETE FROM "ShoppingItem" WHERE "shoppingListId" = $1 AND "isChecked" = true`,
      [parseInt(listId)]
    );

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
    const planResult = await global.db.query(
      `SELECT id FROM "MealPlan" WHERE "isActive" = true LIMIT 1`
    );

    if (planResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhum plano de dieta ativo' });
    }

    const planId = planResult.rows[0].id;

    // Get the most recent shopping list
    let listResult = await global.db.query(
      `SELECT id FROM "ShoppingList" ORDER BY "createdAt" DESC LIMIT 1`
    );

    let listId;
    if (listResult.rows.length === 0) {
      const createResult = await global.db.query(
        `INSERT INTO "ShoppingList" (name, "createdAt")
         VALUES ($1, NOW())
         RETURNING id`,
        ['Lista de Compras']
      );
      listId = createResult.rows[0].id;
    } else {
      listId = listResult.rows[0].id;
    }

    // Get all foods from active plan's meals
    const foodsResult = await global.db.query(
      `SELECT DISTINCT f.name, f.quantity
       FROM "MealFood" f
       JOIN "Meal" m ON f."mealId" = m.id
       WHERE m."mealPlanId" = $1`,
      [planId]
    );

    // Create shopping items from foods
    const importedItems = [];
    for (const food of foodsResult.rows) {
      const result = await global.db.query(
        `INSERT INTO "ShoppingItem" ("shoppingListId", name, quantity, category, "isChecked")
         VALUES ($1, $2, $3, $4, false)
         RETURNING *`,
        [listId, food.name, food.quantity, 'Outros']
      );
      importedItems.push(result.rows[0]);
    }

    res.json({ success: true, importedItems, count: importedItems.length });
  } catch (error) {
    console.error('Error importing from diet:', error);
    next(error);
  }
};
