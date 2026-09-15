const rateLimit = require('express-rate-limit');

// 1. Strict Limiter: Auth routes ke liye (Brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'For your security, access has been temporarily restricted due to multiple failed attempts. Please try again shortly.'
  }
});

// 2. General Limiter: Baaki APIs ke liye (DDoS / Bot scraping protection)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Max 200 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'We are experiencing unusually high traffic. Please wait a moment before trying again.'
  }
});

module.exports = { authLimiter, apiLimiter };