const { body, validationResult } = require('express-validator');

// Error check karne wala standard handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg // Sabse pehla clean error return karega
    });
  }
  next();
};

// 1. Register Rules
const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Full name is required.')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters.'),
  
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),

  validate
];

// 2. Login Rules
const validateLogin = [
  body('email')
    .trim()
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password cannot be empty.'),

  validate
];

// 3. Forgot Password Rules
const validateForgotPassword = [
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  validate
];

// 4. Reset Password Rules
const validateResetPassword = [
  body('password')
    .notEmpty().withMessage('New password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),

  validate
];

module.exports = {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword
};