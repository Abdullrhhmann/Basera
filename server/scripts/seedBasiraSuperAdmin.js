const bcrypt = require('bcryptjs');
require('dotenv').config();

const { Prisma } = require('../prisma/generated');
const prisma = require('../prisma/client');

const seedBasiraSuperAdmin = async () => {
  const args = process.argv.slice(2);
  const name = args[0] || process.env.DEFAULT_SUPER_ADMIN_NAME || 'Basira Admin';
  const email = args[1] || process.env.DEFAULT_SUPER_ADMIN_EMAIL || 'admin@basira.com';
  const password = args[2] || process.env.DEFAULT_SUPER_ADMIN_PASSWORD || 'Basira@2024';
  const phone = args[3] || process.env.DEFAULT_SUPER_ADMIN_PHONE || '+201234567890';

  try {
    console.log('🧪 Seeding Basira Super Admin (Postgres + Prisma)');
    console.log('');

    const existingAdmin = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { name: true, email: true, role: true, hierarchy: true, phone: true },
    });

    if (existingAdmin) {
      console.log(`⚠️  Admin user with email ${email} already exists!`);
      console.log('');
      console.log('📋 Existing Admin Details:');
      console.log('   👤 Name:', existingAdmin.name);
      console.log('   📧 Email:', existingAdmin.email);
      console.log('   🎯 Role:', existingAdmin.role);
      console.log('   📊 Hierarchy:', existingAdmin.hierarchy);
      console.log('   📱 Phone:', existingAdmin.phone);
      console.log('');
      console.log('💡 Options:');
      console.log('   1. Use a different email as 2nd argument');
      console.log('   2. Delete this user from the database first');
      console.log('   3. Run: node server/scripts/resetAdmins.js');
      console.log('');
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const permissions = {
      canManageUsers: true,
      canManageProperties: true,
      canApproveProperties: true,
      canManageLaunches: true,
      canManageDevelopers: true,
      canManageInquiries: true,
      canAccessDashboard: true,
      canBulkUpload: true,
    };

    const admin = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: Prisma.UserRole.ADMIN,
        hierarchy: 1,
        phone,
        permissions,
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
        hierarchy: true,
        role: true,
      },
    });

    console.log('✅ Basira Super Admin Created Successfully!');
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('📋 ADMIN CREDENTIALS');
    console.log('═══════════════════════════════════════════');
    console.log('👤 Name:      ', name);
    console.log('📧 Email:     ', email);
    console.log('🔑 Password:  ', password);
    console.log('📱 Phone:     ', phone);
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('🎯 ROLE & PERMISSIONS');
    console.log('═══════════════════════════════════════════');
    console.log('🏆 Role:              ', Prisma.UserRole.ADMIN.toUpperCase?.() || 'ADMIN');
    console.log('📊 Hierarchy Level:   ', 1, '(SUPER ADMIN)');
    console.log('');
    Object.entries(permissions).forEach(([key, value]) => {
      console.log(`✓ ${key.replace(/([A-Z])/g, ' $1')}:   ${value}`);
    });
    console.log('═══════════════════════════════════════════');
    console.log('');

    const isMatch = await bcrypt.compare(password, admin.password);
    console.log(`✅ Password verification: ${isMatch ? 'SUCCESS' : 'FAILED'}`);
    console.log('');

    const allAdmins = await prisma.user.findMany({
      where: {
        role: {
          in: [
            Prisma.UserRole.ADMIN,
            Prisma.UserRole.SALES_MANAGER,
            Prisma.UserRole.SALES_TEAM_LEADER,
            Prisma.UserRole.SALES_AGENT,
          ],
        },
      },
      orderBy: [{ hierarchy: 'asc' }, { createdAt: 'desc' }],
      select: { name: true, email: true, role: true, hierarchy: true },
    });

    if (allAdmins.length > 0) {
      const roleLabels = {
        [Prisma.UserRole.ADMIN]: '🏆 Admin',
        [Prisma.UserRole.SALES_MANAGER]: '💼 Sales Manager',
        [Prisma.UserRole.SALES_TEAM_LEADER]: '👥 Team Leader',
        [Prisma.UserRole.SALES_AGENT]: '🎯 Sales Agent',
      };
      console.log('📊 All Admin Users in System:');
      console.log('');
      allAdmins.forEach((user, index) => {
        console.log(`${index + 1}. ${roleLabels[user.role] || user.role} (Level ${user.hierarchy})`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log('');
      });
    }

    console.log('⚠️  IMPORTANT: Change the password after first login!');
    console.log('');
    console.log('🚀 Login URL: http://localhost:3000/admin/login');
    console.log('');
  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

seedBasiraSuperAdmin();

