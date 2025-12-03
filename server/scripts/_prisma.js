const { PrismaClient } = require('../prisma/generated');

const prisma = new PrismaClient();

async function withPrisma(fn) {
  try {
    return await fn(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = {
  prisma,
  withPrisma,
};

