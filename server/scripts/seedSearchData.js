const { Prisma } = require('../prisma/generated');
const prisma = require('../prisma/client');
require('dotenv').config();

const sampleSearchTerms = [
  'villa', 'apartment', 'dubai', 'abu dhabi', 'jumeirah', 'downtown',
  'palm jumeirah', 'luxury villa', 'penthouse', 'studio apartment',
  '2 bedroom apartment', '3 bedroom villa', 'beachfront property',
  'investment property', 'commercial property', 'office space',
  'retail space', 'warehouse', 'townhouse', 'duplex',
  'garden villa', 'sea view apartment', 'high floor apartment',
  'furnished apartment', 'unfurnished villa', 'ready to move',
  'off plan property', 'completed project', 'under construction',
  'payment plan', 'mortgage', 'rental property', 'lease',
  'short term rental', 'long term rental', 'holiday home',
  'vacation rental', 'airbnb property', 'buy to let',
  'real estate investment', 'property management', 'real estate agent',
  'property for sale', 'property for rent', 'new development',
  'residential property', 'mixed use development', 'gated community'
];

const sampleIPs = [
  '192.168.1.1', '192.168.1.2', '192.168.1.3', '192.168.1.4', '192.168.1.5',
  '10.0.0.1', '10.0.0.2', '10.0.0.3', '10.0.0.4', '10.0.0.5',
  '172.16.0.1', '172.16.0.2', '172.16.0.3', '172.16.0.4', '172.16.0.5'
];

const sampleUserAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
  'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
  'Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0'
];

const propertyTypes = ['villa', 'apartment', 'townhouse', 'penthouse', 'studio', 'duplex'];
const propertyStatuses = ['for-sale', 'for-rent'];
const cities = ['dubai', 'abu dhabi', 'sharjah', 'ajman', 'ras al khaimah'];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const showSampleAnalytics = () => {
  console.log('⚠️ Database not available. Showing sample analytics output instead...\n');
  const samplePopularSearches = [
    { query: 'villa', count: 45, avgResults: 12 },
    { query: 'apartment', count: 38, avgResults: 8 },
    { query: 'dubai', count: 32, avgResults: 15 },
    { query: 'jumeirah', count: 28, avgResults: 10 },
    { query: 'penthouse', count: 25, avgResults: 5 },
  ];

  console.log('🔍 POPULAR SEARCH TERMS (Sample)');
  samplePopularSearches.forEach((item, index) => {
    console.log(`${index + 1}. "${item.query}" - ${item.count} searches (${item.avgResults} avg results)`);
  });

  const totalSearches = samplePopularSearches.reduce((sum, item) => sum + item.count, 0);
  const mostPopular = samplePopularSearches[0];

  console.log('\n📈 SAMPLE SEARCH INSIGHTS');
  console.log(`Total Searches (30 days): ${totalSearches}`);
  console.log(`Unique Search Terms: ${samplePopularSearches.length}`);
  console.log(`Most Popular: "${mostPopular.query}" (${mostPopular.count} searches)`);
  console.log('\n💡 Run this script again once Postgres is reachable to insert real data.');
};

async function seedSearchData() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL env var is required');
    }

    console.log('🌱 Starting search data seeding via Prisma/Postgres...');

    const recordsToGenerate = 500;
    const searchRecords = [];
    const now = Date.now();

    for (let i = 0; i < recordsToGenerate; i += 1) {
      const query = randomItem(sampleSearchTerms);
      const filters = {
        propertyType: randomItem(propertyTypes),
        status: randomItem(propertyStatuses),
        city: randomItem(cities),
        priceRange: {
          min: randomInt(100000, 1000000),
          max: randomInt(1000000, 5000000),
        },
      };

      const createdAt = new Date(now - randomInt(0, 30) * 24 * 60 * 60 * 1000);
      const resultsCount = randomInt(1, 50);

      searchRecords.push({
        query,
        ipAddress: randomItem(sampleIPs),
        userAgent: randomItem(sampleUserAgents),
        resultsCount,
        filters,
        createdAt,
      });

      if ((i + 1) % 100 === 0) {
        console.log(`📝 Generated ${i + 1} search records...`);
      }
    }

    const batchSize = 100;
    for (let i = 0; i < searchRecords.length; i += batchSize) {
      const batch = searchRecords.slice(i, i + batchSize);
      await prisma.search.createMany({
        data: batch,
        skipDuplicates: false,
      });
      console.log(
        `💾 Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(searchRecords.length / batchSize)}`
      );
    }

    console.log('✅ Search data seeding completed successfully!');
    console.log(`📊 Created ${searchRecords.length} search records`);

    const totalSearches = await prisma.search.count();
    const uniqueQueries = await prisma.search.findMany({
      distinct: ['query'],
      select: { query: true },
    });

    const popularSearches = await prisma.search.groupBy({
      by: ['query'],
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: 5,
    });

    console.log('\n📈 Seeding Results:');
    console.log(`Total searches: ${totalSearches}`);
    console.log(`Unique search terms: ${uniqueQueries.length}`);
    console.log('\n🔝 Top 5 Search Terms:');
    popularSearches.forEach((item, index) => {
      console.log(`${index + 1}. "${item.query}" - ${item._count.query} searches`);
    });
  } catch (error) {
    console.error('❌ Error seeding search data:', error.message);
    showSampleAnalytics();
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedSearchData()
    .then(() => {
      console.log('🎉 Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedSearchData;
