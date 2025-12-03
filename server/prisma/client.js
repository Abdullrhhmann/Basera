const { PrismaClient } = require('./generated');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:admin@localhost:5432/basera_dev?schema=public';

const getPool = () => {
  if (process.env.NODE_ENV !== 'production' && global.__PRISMA_POOL__) {
    return global.__PRISMA_POOL__;
  }
  const pool = new Pool({
    connectionString,
  });
  if (process.env.NODE_ENV !== 'production') {
    global.__PRISMA_POOL__ = pool;
  }
  return pool;
};

const adapter = new PrismaPg(getPool());

const prisma =
  (process.env.NODE_ENV !== 'production' && global.__PRISMA__) ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV !== 'production' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__PRISMA__ = prisma;
}

module.exports = prisma;

