require('dotenv').config();
const { Prisma } = require('../prisma/generated');
const prisma = require('../prisma/client');

async function checkPendingProperty() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL env var is required');
    }

    const property = await prisma.property.findFirst({
      where: { title: { contains: 'Modern Apartment', mode: 'insensitive' } },
      include: {
        createdBy: { select: { name: true, email: true, role: true, hierarchy: true } },
        approvedBy: { select: { name: true, email: true, role: true } },
        submittedBy: { select: { name: true, email: true, role: true } },
      },
    });

    if (!property) {
      console.log('❌ Property not found');
      return;
    }

    console.log('=== PROPERTY DETAILS ===');
    console.log('Title:', property.title);
    console.log('Approval Status:', property.approvalStatus);
    console.log('Created At:', property.createdAt);
    console.log('Updated At:', property.updatedAt);
    console.log('\n=== CREATOR INFO ===');

    if (property.createdBy) {
      console.log('Created By:', property.createdBy.name);
      console.log('Email:', property.createdBy.email);
      console.log('Role:', property.createdBy.role);
      console.log('Hierarchy:', property.createdBy.hierarchy);
    } else {
      console.log('❌ No creator info');
    }

    console.log('\n=== APPROVAL INFO ===');
    console.log('Approved By:', property.approvedBy ? property.approvedBy.name : 'None');
    console.log('Approval Date:', property.approvalDate || 'None');
    console.log('Submitted By:', property.submittedBy ? property.submittedBy.name : 'None');

    console.log('\n=== DIAGNOSIS ===');
    if (property.approvalStatus === 'pending') {
      console.log('🔴 Status is PENDING - Property needs approval');

      if (property.createdBy) {
        if (property.createdBy.role === 'admin') {
          console.log('⚠️  ISSUE: Admin user created this but it\'s pending!');
          console.log('   This should NOT happen with the latest fix.');
          console.log('   Did you restart the server after the fix?');
        } else if (property.createdBy.hierarchy === 1) {
          console.log('⚠️  ISSUE: Hierarchy 1 user created this but it\'s pending!');
        } else {
          console.log('✅ This is expected - user is not admin (role:', property.createdBy.role, ')');
        }
      }
    } else {
      console.log('✅ Status is:', property.approvalStatus);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkPendingProperty();

