const express = require('express');
const workoutController = require('../controllers/workoutController');

const router = express.Router();

// GET /workouts - list all workouts
router.get('/', workoutController.getWorkouts);

// POST /workouts/:id/start - start a new workout session
router.post('/:id/start', workoutController.startWorkout);

// GET /workouts/session/:sessionId - active workout page
router.get('/session/:sessionId', workoutController.getActiveWorkout);

// PATCH /workouts/session/:sessionId/exercise/:exerciseId/complete - mark exercise done
router.patch('/session/:sessionId/exercise/:exerciseId/complete', workoutController.completeExercise);

// POST /workouts/session/:sessionId/complete - complete workout
router.post('/session/:sessionId/complete', workoutController.completeWorkout);

// GET /workouts/history - workout history
router.get('/history', workoutController.getHistory);

module.exports = router;
