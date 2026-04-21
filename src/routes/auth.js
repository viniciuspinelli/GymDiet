const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// GET /auth/login
router.get('/login', authController.getLogin);

// POST /auth/login
router.post('/login', authController.postLogin);

// GET /auth/register
router.get('/register', authController.getRegister);

// POST /auth/register
router.post('/register', authController.postRegister);

// GET /auth/logout
router.get('/logout', authController.getLogout);

// GET /auth/forgot-password
router.get('/forgot-password', authController.getForgotPassword);

// POST /auth/forgot-password
router.post('/forgot-password', authController.postForgotPassword);

// GET /auth/reset-password/:token
router.get('/reset-password/:token', authController.getResetPassword);

// POST /auth/reset-password/:token
router.post('/reset-password/:token', authController.postResetPassword);

module.exports = router;
