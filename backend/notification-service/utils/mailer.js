const nodemailer = require('nodemailer');

const createTransport = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const sendMail = async ({ to, subject, html }) => {
  const transporter = createTransport();
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"TWZ FEMS" <noreply@twzfems.com>',
    to,
    subject,
    html,
  });
  return info;
};

module.exports = { sendMail };
