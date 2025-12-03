const bcrypt = require('bcryptjs');
require('dotenv').config();

const { Prisma } = require('../prisma/generated');
const prisma = require('../prisma/client');

const createCustomAdmin = async () => {
  const args = process.argv.slice(2);
  const name = args[0] || process.env.DEFAULT_ADMIN_NAME || 'System Administrator';
  const email = args[1] || process.env.DEFAULT_ADMIN_EMAIL || 'admin@basira.com';
  const password = args[2] || process.env.DEFAULT_ADMIN_PASSWORD || 'admin123456';
  const phone = args[3] || process.env.DEFAULT_ADMIN_PHONE || '+1234567890';

  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { email: true },
    });

    if (existingAdmin) {
      console.log(`❌ Admin user with email ${email} already exists!`);
      console.log('💡 Use a different email or run the admin reset script.');
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const admin = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: Prisma.UserRole.ADMIN,
        hierarchy: 1,
        phone,
        permissions: Prisma.JsonNull,
        profileImage: null,
        preferences: Prisma.JsonNull,
        location: 'Global',
        isActive: true,
        isEmailVerified: true,
        subscribeToNewsletter: false,
        activityStats: Prisma.JsonNull,
        createdById: null,
      },
      select: { id: true, name: true, email: true, password: true },
    });

    console.log('✅ Admin user created successfully!');
    console.log('👤 Name:', name);
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('📱 Phone:', phone);
    console.log('⚠️  Please change the password after first login!');

    const isMatch = await bcrypt.compare(password, admin.password);
    console.log('✅ Password test:', isMatch ? 'SUCCESS' : 'FAILED');

    const allAdmins = await prisma.user.findMany({
      where: { role: Prisma.UserRole.ADMIN },
      select: { name: true, email: true },
      orderBy: { createdAt: 'asc' },
    });

    console.log('\n📋 All admin users:');
    allAdmins.forEach((adm, index) => {
      console.log(`${index + 1}. ${adm.name} (${adm.email})`);
    });
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
};

createCustomAdmin();
