const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // 1. Authorization Header check karo (Primary)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } 
  // 2. Cookie fallback check (Dono possible names check karo)
  else if (req.cookies) {
    token = req.cookies.seapearl_session_token || req.cookies.seapearl_refresh_token;
  }

  // Token null ya string "null"/"undefined" na ho
  if (!token || token === 'null' || token === 'undefined') {
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
    console.error("JWT Verify Error:", error.message);
    return res.status(401).json({
      success: false,
      message: 'Session expired or unauthorized token. Please sign in again.'
    });
  }
};

module.exports = { protect };