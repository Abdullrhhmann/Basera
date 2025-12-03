const bcrypt = require('bcryptjs');
require('dotenv').config();

const { Prisma } = require('../prisma/generated');
const prisma = require('../prisma/client');

const createAdmin = async () => {
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@basira.com';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123456';
  const adminPhone = process.env.DEFAULT_ADMIN_PHONE || '+1234567890';

  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: Prisma.UserRole.ADMIN },
      select: { email: true },
    });

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const admin = await prisma.user.create({
      data: {
        name: 'System Administrator',
        email: adminEmail.toLowerCase(),
        phone: adminPhone,
        password: hashedPassword,
        role: Prisma.UserRole.ADMIN,
        hierarchy: 1,
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
      select: {
        email: true,
        id: true,
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('🆔 ID:', admin.id);
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('⚠️  Please change the password after first login!');
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
};

createAdmin();
