const { Prisma } = require('../prisma/generated');
const prisma = require('../prisma/client');
require('dotenv').config();

// Egyptian Governorates, Cities, and Areas with realistic appreciation rates
const locationsData = {
  'Cairo': {
    appreciationRate: 10,
    description: 'Capital and largest city of Egypt',
    cities: {
      'New Cairo': {
        appreciationRate: 12,
        areas: [
          { name: 'Fifth Settlement', rate: 15 },
          { name: 'First Settlement', rate: 13 },
          { name: 'Katameya', rate: 14 },
          { name: 'Maadi', rate: 12 },
          { name: 'Rehab City', rate: 11 },
          { name: 'Shorouk City', rate: 10 },
          { name: 'Badr City', rate: 9 },
        ]
      },
      'Nasr City': {
        appreciationRate: 10,
        areas: [
          { name: 'Nasr City District 1', rate: 11 },
          { name: 'Nasr City District 7', rate: 10 },
          { name: 'Abbas El Akkad', rate: 10 },
          { name: 'Makram Ebeid', rate: 9 },
        ]
      },
      'Heliopolis': {
        appreciationRate: 11,
        areas: [
          { name: 'Sheraton', rate: 12 },
          { name: 'Roxy', rate: 11 },
          { name: 'Korba', rate: 13 },
          { name: 'Ard El Golf', rate: 14 },
        ]
      },
      'October City': {
        appreciationRate: 13,
        areas: [
          { name: '6th of October City', rate: 14 },
          { name: 'Sheikh Zayed', rate: 16 },
          { name: 'Hadayek October', rate: 12 },
          { name: 'Al Motamayez District', rate: 13 },
        ]
      },
      'Dokki': {
        appreciationRate: 9,
        areas: [
          { name: 'Dokki', rate: 9 },
          { name: 'Mohandessin', rate: 10 },
          { name: 'Agouza', rate: 9 },
        ]
      },
      'Zamalek': {
        appreciationRate: 8,
        areas: [
          { name: 'Zamalek', rate: 8 },
          { name: 'Garden City', rate: 8 },
        ]
      },
    }
  },
  'Giza': {
    appreciationRate: 11,
    description: 'Home to the Great Pyramids and expanding urban areas',
    cities: {
      'Sheikh Zayed': {
        appreciationRate: 15,
        areas: [
          { name: 'Beverly Hills', rate: 18 },
          { name: 'Allegria', rate: 17 },
          { name: 'West Town', rate: 16 },
          { name: 'The Polygon', rate: 16 },
          { name: 'Palm Hills', rate: 15 },
          { name: 'Zayed Dunes', rate: 14 },
        ]
      },
      '6th of October': {
        appreciationRate: 14,
        areas: [
          { name: 'Hadayek October', rate: 13 },
          { name: 'Al Hosary', rate: 14 },
          { name: 'Al Motamayez', rate: 15 },
          { name: 'Dream Land', rate: 14 },
          { name: 'Juhayna Square', rate: 13 },
        ]
      },
      'Haram': {
        appreciationRate: 8,
        areas: [
          { name: 'Haram Street', rate: 8 },
          { name: 'Marioutiya', rate: 7 },
          { name: 'Faisal', rate: 7 },
        ]
      },
    }
  },
  'Alexandria': {
    appreciationRate: 9,
    description: 'Mediterranean coastal city and major port',
    cities: {
      'Alexandria': {
        appreciationRate: 9,
        areas: [
          { name: 'Stanley', rate: 10 },
          { name: 'Smouha', rate: 9 },
          { name: 'San Stefano', rate: 11 },
          { name: 'Sidi Gaber', rate: 9 },
          { name: 'Miami', rate: 8 },
          { name: 'Glim', rate: 10 },
          { name: 'Sporting', rate: 9 },
          { name: 'Mandara', rate: 8 },
          { name: 'Montaza', rate: 9 },
        ]
      },
      'Borg El Arab': {
        appreciationRate: 10,
        areas: [
          { name: 'Borg El Arab New City', rate: 11 },
          { name: 'Borg El Arab Industrial', rate: 10 },
        ]
      },
    }
  },
  'Red Sea': {
    appreciationRate: 12,
    description: 'Premier tourist destination on the Red Sea coast',
    cities: {
      'Hurghada': {
        appreciationRate: 11,
        areas: [
          { name: 'Sahl Hasheesh', rate: 13 },
          { name: 'El Gouna', rate: 14 },
          { name: 'Makadi Bay', rate: 12 },
          { name: 'Soma Bay', rate: 13 },
          { name: 'Downtown Hurghada', rate: 10 },
        ]
      },
      'Ain Sokhna': {
        appreciationRate: 13,
        areas: [
          { name: 'Porto Sokhna', rate: 14 },
          { name: 'Telal', rate: 13 },
          { name: 'Mountain View Sokhna', rate: 14 },
        ]
      },
    }
  },
  'North Coast': {
    appreciationRate: 14,
    description: 'Mediterranean coastal resort area',
    cities: {
      'North Coast': {
        appreciationRate: 15,
        areas: [
          { name: 'Marina', rate: 16 },
          { name: 'Marassi', rate: 18 },
          { name: 'Hacienda', rate: 17 },
          { name: 'Sidi Abdel Rahman', rate: 15 },
          { name: 'Alamein', rate: 16 },
          { name: 'Fouka Bay', rate: 17 },
          { name: 'Amwaj', rate: 16 },
        ]
      },
    }
  },
  'Qalyubia': {
    appreciationRate: 8,
    description: 'Governorate north of Cairo',
    cities: {
      'Obour City': {
        appreciationRate: 10,
        areas: [
          { name: 'Obour City', rate: 10 },
          { name: 'Residential District', rate: 9 },
        ]
      },
      'Shorouk City': {
        appreciationRate: 9,
        areas: [
          { name: 'Shorouk City', rate: 9 },
        ]
      },
    }
  },
  'Sharqia': {
    appreciationRate: 7,
    description: 'Eastern governorate with emerging developments',
    cities: {
      '10th of Ramadan': {
        appreciationRate: 8,
        areas: [
          { name: '10th of Ramadan Industrial', rate: 8 },
          { name: '10th of Ramadan Residential', rate: 7 },
        ]
      },
    }
  },
  'New Administrative Capital': {
    appreciationRate: 18,
    description: 'New capital city under construction',
    cities: {
      'New Administrative Capital': {
        appreciationRate: 20,
        areas: [
          { name: 'R7 District', rate: 22 },
          { name: 'R8 District', rate: 21 },
          { name: 'Downtown', rate: 23 },
          { name: 'Diplomatic District', rate: 20 },
          { name: 'MU23', rate: 19 },
          { name: 'Medical City', rate: 18 },
        ]
      },
    }
  },
};

const slugify = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || `slug-${Date.now()}`;

async function seedLocations() {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('ERROR: DATABASE_URL environment variable is required!');
      console.error('Please set DATABASE_URL in your .env file.');
      process.exit(1);
    }

    console.log('✅ Connected to PostgreSQL via Prisma');
    console.log('🗑️  Clearing existing location data...');
    await prisma.$transaction([
      prisma.area.deleteMany(),
      prisma.city.deleteMany(),
      prisma.governorate.deleteMany(),
    ]);
    console.log('✅ Existing data cleared');

    console.log('🌱 Starting to seed locations...');

    for (const [governorateName, governorateData] of Object.entries(locationsData)) {
      console.log(`\n📍 Creating Governorate: ${governorateName}`);

      const governorate = await prisma.governorate.create({
        data: {
          name: governorateName,
          slug: slugify(governorateName),
          annualAppreciationRate: governorateData.appreciationRate,
          description: governorateData.description,
        },
      });

      console.log(
        `   ✅ Governorate created: ${governorate.name} (${governorateData.appreciationRate}% appreciation)`
      );

      for (const [cityName, cityData] of Object.entries(governorateData.cities)) {
        console.log(`   🏙️  Creating City: ${cityName}`);

        const city = await prisma.city.create({
          data: {
            name: cityName,
            slug: slugify(`${governorateName}-${cityName}`),
            governorateId: governorate.id,
            annualAppreciationRate: cityData.appreciationRate,
            description: `${cityName} in ${governorateName}`,
          },
        });

        console.log(
          `      ✅ City created: ${city.name} (${cityData.appreciationRate}% appreciation)`
        );

        for (const areaData of cityData.areas) {
          const area = await prisma.area.create({
            data: {
              name: areaData.name,
              slug: slugify(`${cityName}-${areaData.name}-${Date.now()}`),
              cityId: city.id,
              annualAppreciationRate: areaData.rate,
              description: `${areaData.name} area in ${cityName}`,
            },
          });

          console.log(
            `         ✅ Area created: ${area.name} (${areaData.rate}% appreciation)`
          );
        }
      }
    }

    const [governorateCount, cityCount, areaCount] = await Promise.all([
      prisma.governorate.count(),
      prisma.city.count(),
      prisma.area.count(),
    ]);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   • Governorates: ${governorateCount}`);
    console.log(`   • Cities: ${cityCount}`);
    console.log(`   • Areas: ${areaCount}`);
    console.log('='.repeat(60));

    console.log('\n💡 You can now:');
    console.log('   1. Create properties using the new location hierarchy');
    console.log('   2. Use the ROI calculator with real Egyptian areas');
    console.log('   3. Filter properties by governorate, city, or area');
    console.log('\n');
  } catch (error) {
    console.error('❌ Error seeding locations:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Prisma connection closed');
    process.exit(0);
  }
}

seedLocations();

