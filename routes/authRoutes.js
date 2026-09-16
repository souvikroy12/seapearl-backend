const express = require('express');
const router = express.Router();

const { 
  registerUser, 
  loginUser, 
  forgotPassword, 
  resetPassword,
  googleLogin,
  logoutUser
} = require('../controllers/authController');

// Validation Middlewares import
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword
} = require('../middleware/authValidator');

// 1. User Registration Route
router.post('/register', validateRegister, registerUser);

// 2. User Login Route
router.post('/login', validateLogin, loginUser);

// 3. Google Login Route
router.post('/google-login', googleLogin);

// 4. Logout Route (Cookie Clear)
router.post('/logout', logoutUser);

// 5. Forgot Password Route
router.post('/forgot-password', validateForgotPassword, forgotPassword);

// 6. Reset Password Route
router.put('/reset-password/:token', validateResetPassword, resetPassword);

module.exports = router;