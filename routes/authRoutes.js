const express = require('express');
const router = express.Router();

const { 
  registerUser, 
  loginUser, 
  forgotPassword, 
  resetPassword,
  googleLogin //  Naya import
} = require('../controllers/authController');

// Validation Middlewares import
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword
} = require('../middleware/authValidator');

// 1. User Registration Route
// URL: http://localhost:5000/api/auth/register
router.post('/register', validateRegister, registerUser);

// 2. User Login Route
// URL: http://localhost:5000/api/auth/login
router.post('/login', validateLogin, loginUser);

// 3. Google Login Route (Frontend se token handle karega)
// URL: http://localhost:5000/api/auth/google-login
router.post('/google-login', googleLogin); // <-- Ye line add ki hai

// 4. Forgot Password Route (Email bhejta hai)
// URL: http://localhost:5000/api/auth/forgot-password
router.post('/forgot-password', validateForgotPassword, forgotPassword);

// 5. Reset Password Route (Password update karta hai)
// URL: http://localhost:5000/api/auth/reset-password/:token
router.put('/reset-password/:token', validateResetPassword, resetPassword);

module.exports = router;
