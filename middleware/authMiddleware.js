const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // 1. HttpOnly Cookie check karo
  if (req.cookies && req.cookies.seapearl_session_token) {
    token = req.cookies.seapearl_session_token;
  } 
  // 2. Authorization Header fallback check
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please login to reserve your sanctuary.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'The account associated with this session no longer exists.'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Session expired or unauthorized token. Please sign in again.'
    });
  }
};

module.exports = { protect };