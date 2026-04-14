-- CreateTable User
CREATE TABLE IF NOT EXISTS "User" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable WorkoutPlan
CREATE TABLE IF NOT EXISTS "WorkoutPlan" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dayOfWeek" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable Exercise
CREATE TABLE IF NOT EXISTS "Exercise" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "workoutPlanId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" TEXT NOT NULL,
    "weight" TEXT,
    "restSeconds" INTEGER,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Exercise_workoutPlanId_fkey" FOREIGN KEY ("workoutPlanId") REFERENCES "WorkoutPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable WorkoutSession
CREATE TABLE IF NOT EXISTS "WorkoutSession" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "workoutPlanId" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "durationMin" INTEGER,
    "notes" TEXT,
    CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkoutSession_workoutPlanId_fkey" FOREIGN KEY ("workoutPlanId") REFERENCES "WorkoutPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable SessionExercise
CREATE TABLE IF NOT EXISTS "SessionExercise" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "workoutSessionId" INTEGER NOT NULL,
    "exerciseId" INTEGER NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "actualSets" INTEGER,
    "actualReps" TEXT,
    "actualWeight" TEXT,
    "notes" TEXT,
    CONSTRAINT "SessionExercise_workoutSessionId_fkey" FOREIGN KEY ("workoutSessionId") REFERENCES "WorkoutSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SessionExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable MealPlan
CREATE TABLE IF NOT EXISTS "MealPlan" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable Meal
CREATE TABLE IF NOT EXISTS "Meal" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "mealPlanId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "time" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Meal_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable MealFood
CREATE TABLE IF NOT EXISTS "MealFood" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "mealId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "calories" INTEGER,
    "protein" DOUBLE PRECISION,
    "carbs" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MealFood_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable ShoppingList
CREATE TABLE IF NOT EXISTS "ShoppingList" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT 'Lista de Compras',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable ShoppingItem
CREATE TABLE IF NOT EXISTS "ShoppingItem" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "shoppingListId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" TEXT,
    "category" TEXT,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ShoppingItem_shoppingListId_fkey" FOREIGN KEY ("shoppingListId") REFERENCES "ShoppingList" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "Exercise_workoutPlanId_idx" ON "Exercise"("workoutPlanId");
CREATE INDEX "WorkoutSession_userId_idx" ON "WorkoutSession"("userId");
CREATE INDEX "WorkoutSession_workoutPlanId_idx" ON "WorkoutSession"("workoutPlanId");
CREATE INDEX "SessionExercise_workoutSessionId_idx" ON "SessionExercise"("workoutSessionId");
CREATE INDEX "SessionExercise_exerciseId_idx" ON "SessionExercise"("exerciseId");
CREATE INDEX "Meal_mealPlanId_idx" ON "Meal"("mealPlanId");
CREATE INDEX "MealFood_mealId_idx" ON "MealFood"("mealId");
CREATE INDEX "ShoppingItem_shoppingListId_idx" ON "ShoppingItem"("shoppingListId");
