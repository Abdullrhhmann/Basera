const bcrypt = require('bcryptjs');
require('dotenv').config();

const { Prisma } = require('../prisma/generated');
const prisma = require('../prisma/client');

const DEFAULT_ADMIN_NAME = process.env.DEFAULT_ADMIN_NAME || 'System Administrator';
const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || 'admin@basira.com';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123456';
const DEFAULT_ADMIN_PHONE = process.env.DEFAULT_ADMIN_PHONE || '+1234567890';

const resetAdmins = async () => {
  try {
    const deleteResult = await prisma.user.deleteMany({
      where: { role: Prisma.UserRole.ADMIN },
    });
    console.log(`✅ Deleted ${deleteResult.count} admin user(s)`);

    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);

    const admin = await prisma.user.create({
      data: {
        name: DEFAULT_ADMIN_NAME,
        email: DEFAULT_ADMIN_EMAIL.toLowerCase(),
        password: hashedPassword,
        role: Prisma.UserRole.ADMIN,
        hierarchy: 1,
        phone: DEFAULT_ADMIN_PHONE,
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
        id: true,
        email: true,
        password: true,
      },
    });

    console.log('✅ New admin user created successfully!');
    console.log('👤 Name:', DEFAULT_ADMIN_NAME);
    console.log('📧 Email:', DEFAULT_ADMIN_EMAIL);
    console.log('🔑 Password:', DEFAULT_ADMIN_PASSWORD);
    console.log('📱 Phone:', DEFAULT_ADMIN_PHONE);

    const isMatch = await bcrypt.compare(DEFAULT_ADMIN_PASSWORD, admin.password);
    console.log('✅ Password test:', isMatch ? 'SUCCESS' : 'FAILED');

    const allAdmins = await prisma.user.findMany({
      where: { role: Prisma.UserRole.ADMIN },
      select: { name: true, email: true },
      orderBy: { createdAt: 'asc' },
    });

    console.log('\n📋 All admin users:');
    allAdmins.forEach((adminUser, index) => {
      console.log(`${index + 1}. ${adminUser.name} (${adminUser.email})`);
    });
  } catch (error) {
    console.error('❌ Error resetting admins:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
};

resetAdmins();

