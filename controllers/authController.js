require('dotenv').config();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// 1. JWT Token Generator (Lifespan dynamically handled by Cookie wrapper)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// 2. Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({   //smtp connection 
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error) => {
  if (error) console.log("Email Config Error :", error.message);
  else console.log("SeaPearl Email Server Ready ✅");
});

//  Email Template Wrapper
const emailTemplate = (content) => `
  <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #050505; margin: 0; padding: 40px 0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #0f0f0f; border: 1px solid #1a1a1a; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
      <div style="padding: 40px; text-align: center; border-bottom: 1px solid #1a1a1a;">
        <h1 style="color: #C6A675; margin: 0; font-size: 28px; letter-spacing: 4px; font-weight: 300;">SEAPEARL</h1>
        <p style="color: #444; margin: 5px 0 0; font-size: 10px; letter-spacing: 2px; text-transform: uppercase;">Luxury Sanctuary & Estates</p>
      </div>
      <div style="padding: 50px 40px;">
        ${content}
      </div>
      <div style="padding: 30px; background-color: #080808; text-align: center; border-top: 1px solid #1a1a1a;">
        <p style="color: #444; font-size: 12px; margin: 0;">&copy; 2026 SeaPearl Global Reservations. All rights reserved.</p>
      </div>
    </div>
  </div>
`;

//  Session Cookie Injection Pipeline 
const sendSessionCookie = (res, statusCode, userData) => {
  const token = generateToken(userData._id);

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000
  };

  res.status(statusCode)
    .cookie('seapearl_session_token', token, cookieOptions)
    .json({
      _id: userData._id,
      name: userData.name,
      email: userData.email,
      token
    });
};

// @desc    Register a new user
const registerUser = async (req, res, next) => {
  const { name, email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const user = await User.create({ name, email, password });
    if (user) {
      //  Welcome email ---
      const welcomeContent = `
        <h2 style="color: #ffffff; font-size: 24px; font-weight: 400; margin-bottom: 20px;">Welcome to the Inner Circle, ${name}.</h2>
        <p style="color: #888; line-height: 1.8; margin-bottom: 30px;">Your account at SeaPearl has been successfully established. You now have exclusive access to our world-class sanctuary and private estate listings.</p>
        <a href="${process.env.FRONTEND_URL}" style="display: inline-block; background-color: #C6A675; color: #000; padding: 16px 35px; text-decoration: none; font-weight: bold; font-size: 13px; border-radius: 4px; letter-spacing: 2px; text-transform: uppercase;">Explore Your Dashboard</a>
      `;

      transporter.sendMail({
        from: `"SeaPearl Luxury" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Welcome to SeaPearl - Your Journey Begins',
        html: emailTemplate(welcomeContent)
      });

      // Bypassed directly to our secure session runtime handler
      sendSessionCookie(res, 201, user);
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Google Login / Register
const googleLogin = async (req, res, next) => {
  const { name, email, image } = req.body;
  try {
    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString('hex');
      user = await User.create({ name, email, password: randomPassword });
    }

    sendSessionCookie(res, 200, user);
  } catch (error) {
    next(error);
  }
};

// @desc    Auth user & get token
const loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      sendSessionCookie(res, 200, user);
    } else {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
};

// @desc   Forgot Password - Send Link
const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    // ---  Reset Email ---
    const resetContent = `
      <h2 style="color: #ffffff; font-size: 24px; font-weight: 400; margin-bottom: 20px;">Password Security Alert</h2>
      <p style="color: #888; line-height: 1.8; margin-bottom: 30px;">We received a request to reset your sanctuary access key. If you did not make this request, please ignore this email. This link is valid for 10 minutes.</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" style="display: inline-block; background-color: #C6A675; color: #000; padding: 16px 35px; text-decoration: none; font-weight: bold; font-size: 13px; border-radius: 4px; letter-spacing: 2px; text-transform: uppercase;">Reset Password</a>
      </div>
    `;

    await transporter.sendMail({
      from: `"SeaPearl Security" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Security: Password Reset Request',
      html: emailTemplate(resetContent)
    });

    res.json({ message: "Reset link sent to your email! ✅" });

  } catch (error) {
    console.error(" Nodemailer Send Error:", error.message);
    next(error);
  }
};

// @desc    Reset Password - Save New
const resetPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      const error = new Error("Token invalid or expired");
      res.status(400);
      throw error;
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password updated successfully! ✅" });
  } catch (error) {
    next(error);
  }
};

// @desc   Logout User - Clear Session Cookie Container
const logoutUser = async (req, res, next) => {
  try {
    res.cookie('seapearl_session_token', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      expires: new Date(0)
    }).json({ message: "Session logged out securely! ✅" });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerUser, loginUser, forgotPassword, resetPassword, googleLogin, logoutUser, transporter, emailTemplate };