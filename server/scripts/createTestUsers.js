const bcrypt = require('bcryptjs');
require('dotenv').config();

const { Prisma } = require('../prisma/generated');
const prisma = require('../prisma/client');

const testUsers = [
  {
    name: 'Sales Manager Test',
    email: 'manager@basira.com',
    password: 'Manager@2024',
    phone: '+201111111111',
    role: Prisma.UserRole.SALES_MANAGER,
    hierarchy: 2,
  },
  {
    name: 'Team Leader Test',
    email: 'leader@basira.com',
    password: 'Leader@2024',
    phone: '+201222222222',
    role: Prisma.UserRole.SALES_TEAM_LEADER,
    hierarchy: 3,
  },
  {
    name: 'Sales Agent Test',
    email: 'agent@basira.com',
    password: 'Agent@2024',
    phone: '+201333333333',
    role: Prisma.UserRole.SALES_AGENT,
    hierarchy: 4,
  },
];

const createTestUsers = async () => {
  try {
    console.log('🧪 Creating Test Users for Hierarchy Testing...\n');

    for (const userData of testUsers) {
      const lowerEmail = userData.email.toLowerCase();
      const existing = await prisma.user.findUnique({
        where: { email: lowerEmail },
        select: { role: true },
      });

      if (existing) {
        console.log(`⚠️  User ${userData.email} already exists (${existing.role})`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = await prisma.user.create({
        data: {
          name: userData.name,
          email: lowerEmail,
          password: hashedPassword,
          phone: userData.phone,
          role: userData.role,
          hierarchy: userData.hierarchy,
          permissions: Prisma.JsonNull,
          profileImage: null,
          preferences: Prisma.JsonNull,
          location: 'Testing Environment',
          isActive: true,
          isEmailVerified: true,
          subscribeToNewsletter: false,
          activityStats: Prisma.JsonNull,
          createdById: null,
        },
        select: {
          id: true,
          hierarchy: true,
          permissions: true,
        },
      });

      console.log(`✅ Created: ${userData.role}`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   Password: ${userData.password}`);
      console.log(`   Hierarchy: ${user.hierarchy}`);
      console.log(`   Permissions: ${JSON.stringify(user.permissions)}`);
      console.log('');
    }

    console.log('\n📊 All Admin-Type Users in System:\n');
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
      orderBy: { hierarchy: 'asc' },
      select: { name: true, email: true, role: true, hierarchy: true },
    });

    allAdmins.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.role} (Level ${user.hierarchy})`);
      console.log(`   📧 ${user.email}`);
      console.log(`   👤 ${user.name}`);
      console.log('');
    });

    console.log('\n🎉 Test users ready for testing!\n');
    console.log('═══════════════════════════════════════════');
    console.log('TEST LOGIN CREDENTIALS');
    console.log('═══════════════════════════════════════════');
    console.log('1. ADMIN (Hierarchy 1)');
    console.log('   Email: superadmin@basira.com');
    console.log('   Password: Basira@2024');
    console.log('');
    console.log('2. SALES MANAGER (Hierarchy 2)');
    console.log('   Email: manager@basira.com');
    console.log('   Password: Manager@2024');
    console.log('');
    console.log('3. TEAM LEADER (Hierarchy 3)');
    console.log('   Email: leader@basira.com');
    console.log('   Password: Leader@2024');
    console.log('');
    console.log('4. SALES AGENT (Hierarchy 4)');
    console.log('   Email: agent@basira.com');
    console.log('   Password: Agent@2024');
    console.log('═══════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

createTestUsers();


