// backend/utils/sendEmail.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  try {
    const data = await resend.emails.send({
      from: 'SeaPearl Luxury <onboarding@resend.dev>', // Resend testing verified sender
      to,
      subject,
      html,
    });
    console.log("Email Dispatched Successfully via Resend ✅ ID:", data.id);
    return { success: true, data };
  } catch (error) {
    console.error("Resend Dispatch Error ❌:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = sendEmail;