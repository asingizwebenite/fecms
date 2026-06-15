const User = require('../models/User');

async function seedAdmin() {
  const firstName = process.env.ADMIN_FIRST_NAME;
  const lastName = process.env.ADMIN_LAST_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn('⚠️  ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping admin seed');
    return;
  }

  const existingAdmin = await User.findOne({ where: { role: 'Admin' } });
  if (existingAdmin) {
    console.log(`✅ Admin already exists (${existingAdmin.email}) — skipping seed`);
    return;
  }

  await User.create({
    firstName: firstName || 'System',
    lastName: lastName || 'Admin',
    email,
    password,
    role: 'Admin',
    isActive: true,
    isAccountActivated: true,
  });

  console.log(`🌱 Admin seeded: ${email}`);
}

module.exports = seedAdmin;
