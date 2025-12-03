require('dotenv').config();
const { Prisma } = require('../prisma/generated');
const prisma = require('../prisma/client');

// Test data array with 30 diverse properties
const normalizeEnumValue = (value, enumObject, fallbackKey) => {
  if (!value || !enumObject) {
    return fallbackKey ? enumObject?.[fallbackKey] : undefined;
  }

  const normalizedKey = value.toString().trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  return enumObject[normalizedKey] || (fallbackKey ? enumObject?.[fallbackKey] : undefined);
};

const testProperties = [
  // Dubai Marina Properties
  {
    title: "Luxury Marina Penthouse",
    description: "Stunning penthouse with panoramic views of Dubai Marina, featuring high-end finishes and private terrace.",
    type: "apartment",
    status: "for-sale",
    price: 7500000,
    currency: "AED",
    location: {
      address: "Dubai Marina",
      city: "Dubai",
      coordinates: { lat: 25.0819, lng: 55.1467 }
    },
    specifications: {
      bedrooms: 4,
      bathrooms: 4.5,
      area: 3200,
      areaUnit: "sqft"
    },
    amenities: ["Pool", "Gym", "Parking", "Security", "Beach Access"],
    images: [
      { url: "https://source.unsplash.com/random/1000x600/?luxury,apartment", isFeatured: true }
    ],
    isFeatured: true
  },
  // Palm Jumeirah Properties
  {
    title: "Signature Palm Villa",
    description: "Exclusive beachfront villa on Palm Jumeirah with private pool and direct beach access.",
    type: "villa",
    status: "for-sale",
    price: 15000000,
    currency: "AED",
    location: {
      address: "Palm Jumeirah",
      city: "Dubai",
      coordinates: { lat: 25.1123, lng: 55.1382 }
    },
    specifications: {
      bedrooms: 6,
      bathrooms: 7,
      area: 8000,
      areaUnit: "sqft"
    },
    amenities: ["Private Pool", "Beach Access", "Garden", "Smart Home", "Maid's Room"],
    images: [
      { url: "https://source.unsplash.com/random/1000x600/?luxury,villa", isFeatured: true }
    ],
    isFeatured: true
  },
  // Downtown Dubai Properties
  {
    title: "Burj Khalifa View Apartment",
    description: "Modern apartment with direct views of Burj Khalifa and Dubai Fountain.",
    type: "apartment",
    status: "for-rent",
    price: 180000,
    currency: "AED",
    location: {
      address: "Downtown Dubai",
      city: "Dubai",
      coordinates: { lat: 25.1972, lng: 55.2744 }
    },
    specifications: {
      bedrooms: 2,
      bathrooms: 2.5,
      area: 1500,
      areaUnit: "sqft"
    },
    amenities: ["Pool", "Gym", "Parking", "Security"],
    images: [
      { url: "https://source.unsplash.com/random/1000x600/?modern,apartment", isFeatured: true }
    ],
    isFeatured: true
  },
  // Business Bay Properties
  {
    title: "Executive Business Bay Office",
    description: "Premium office space with modern facilities and canal views.",
    type: "commercial",
    status: "for-sale",
    price: 4500000,
    currency: "AED",
    location: {
      address: "Business Bay",
      city: "Dubai",
      coordinates: { lat: 25.1857, lng: 55.2644 }
    },
    specifications: {
      area: 2500,
      areaUnit: "sqft"
    },
    amenities: ["Reception", "Meeting Rooms", "Parking", "24/7 Access"],
    images: [
      { url: "https://source.unsplash.com/random/1000x600/?office,modern", isFeatured: true }
    ],
    isFeatured: false
  },
  // JLT Properties
  {
    title: "Lake View JLT Apartment",
    description: "Spacious apartment with stunning lake views in Jumeirah Lake Towers.",
    type: "apartment",
    status: "for-rent",
    price: 90000,
    currency: "AED",
    location: {
      address: "Jumeirah Lake Towers",
      city: "Dubai",
      coordinates: { lat: 25.0669, lng: 55.1401 }
    },
    specifications: {
      bedrooms: 2,
      bathrooms: 2,
      area: 1200,
      areaUnit: "sqft"
    },
    amenities: ["Pool", "Gym", "Parking", "Security"],
    images: [
      { url: "https://source.unsplash.com/random/1000x600/?lake,apartment", isFeatured: true }
    ],
    isFeatured: false
  },
  // Emirates Hills Properties
  {
    title: "Luxury Emirates Hills Villa",
    description: "Magnificent villa in Emirates Hills with golf course views.",
    type: "villa",
    status: "for-sale",
    price: 25000000,
    currency: "AED",
    location: {
      address: "Emirates Hills",
      city: "Dubai",
      coordinates: { lat: 25.0599, lng: 55.1609 }
    },
    specifications: {
      bedrooms: 7,
      bathrooms: 8,
      area: 12000,
      areaUnit: "sqft"
    },
    amenities: ["Private Pool", "Garden", "Smart Home", "Maid's Room", "Driver's Room"],
    images: [
      { url: "https://source.unsplash.com/random/1000x600/?mansion,luxury", isFeatured: true }
    ],
    isFeatured: true
  },
  // Arabian Ranches Properties
  {
    title: "Family Villa in Arabian Ranches",
    description: "Spacious family villa with modern amenities in a gated community.",
    type: "villa",
    status: "for-sale",
    price: 5500000,
    currency: "AED",
    location: {
      address: "Arabian Ranches",
      city: "Dubai",
      coordinates: { lat: 25.0511, lng: 55.2864 }
    },
    specifications: {
      bedrooms: 4,
      bathrooms: 4,
      area: 3500,
      areaUnit: "sqft"
    },
    amenities: ["Private Garden", "Community Pool", "Park Access", "Security"],
    images: [
      { url: "https://source.unsplash.com/random/1000x600/?family,house", isFeatured: true }
    ],
    isFeatured: false
  },
  // DIFC Properties
  {
    title: "DIFC Luxury Apartment",
    description: "High-floor apartment with stunning city views in DIFC.",
    type: "apartment",
    status: "for-sale",
    price: 6500000,
    currency: "AED",
    location: {
      address: "DIFC",
      city: "Dubai",
      coordinates: { lat: 25.2048, lng: 55.2708 }
    },
    specifications: {
      bedrooms: 3,
      bathrooms: 3.5,
      area: 2200,
      areaUnit: "sqft"
    },
    amenities: ["Pool", "Gym", "Concierge", "Valet Parking"],
    images: [
      { url: "https://source.unsplash.com/random/1000x600/?luxury,city", isFeatured: true }
    ],
    isFeatured: true
  },
  // Jumeirah Beach Residence Properties
  {
    title: "JBR Beachfront Apartment",
    description: "Direct beach access apartment with stunning sea views.",
    type: "apartment",
    status: "for-rent",
    price: 140000,
    currency: "AED",
    location: {
      address: "JBR",
      city: "Dubai",
      coordinates: { lat: 25.0777, lng: 55.1333 }
    },
    specifications: {
      bedrooms: 2,
      bathrooms: 2,
      area: 1400,
      areaUnit: "sqft"
    },
    amenities: ["Beach Access", "Pool", "Gym", "Restaurants"],
    images: [
      { url: "https://source.unsplash.com/random/1000x600/?beach,apartment", isFeatured: true }
    ],
    isFeatured: false
  },
  // Dubai Hills Estate Properties
  {
    title: "Dubai Hills Modern Villa",
    description: "Contemporary villa with golf course views in Dubai Hills Estate.",
    type: "villa",
    status: "for-sale",
    price: 8500000,
    currency: "AED",
    location: {
      address: "Dubai Hills Estate",
      city: "Dubai",
      coordinates: { lat: 25.1157, lng: 55.2466 }
    },
    specifications: {
      bedrooms: 5,
      bathrooms: 6,
      area: 5001,
      areaUnit: "sqft"
    },
    amenities: ["Private Pool", "Golf Views", "Smart Home", "Maid's Room"],
    images: [
      { url: "https://source.unsplash.com/random/1000x600/?modern,villa", isFeatured: true }
    ],
    isFeatured: true
  },
  // Add 20 more properties with variations...
  {
    title: "Bluewaters Island Apartment",
    description: "Modern apartment with Dubai Eye views on Bluewaters Island.",
    type: "apartment",
    status: "for-sale",
    price: 3200000,
    currency: "AED",
    location: {
      address: "Bluewaters Island",
      city: "Dubai",
      coordinates: { lat: 25.0825, lng: 55.1173 }
    },
    specifications: {
      bedrooms: 1,
      bathrooms: 1.5,
      area: 950,
      areaUnit: "sqft"
    },
    amenities: ["Pool", "Gym", "Beach Access", "Restaurants"],
    images: [
      { url: "https://source.unsplash.com/random/1000x600/?island,modern", isFeatured: true }
    ],
    isFeatured: false
  },
  // Continue with more variations...
  // (Add more properties following similar pattern with different locations, types, and prices)
];

const normalizeProperty = (property, adminId) => {
  const type = normalizeEnumValue(property.type, Prisma.PropertyType, 'APARTMENT');
  const status = normalizeEnumValue(property.status, Prisma.PropertyStatus, 'FOR_SALE');
  const developerStatus = property.developerStatus
    ? normalizeEnumValue(property.developerStatus, Prisma.DeveloperStatus)
    : null;

  return {
    title: property.title,
    description: property.description,
    type,
    status,
    developerStatus,
    price: new Prisma.Decimal(property.price),
    currency: property.currency,
    location: {
      ...property.location,
      state: property.location?.state || 'Dubai',
      country: property.location?.country || 'UAE',
    },
    specifications: {
      ...property.specifications,
      furnished: property.specifications?.furnished || 'unfurnished',
    },
    amenities: property.amenities || [],
    features: property.features || [],
    images: property.images || [],
    isFeatured: property.isFeatured ?? false,
    isActive: true,
    createdById: adminId,
    approvalStatus: Prisma.PropertyApprovalStatus.APPROVED,
    submittedById: adminId,
    approvedById: adminId,
    approvalDate: new Date(),
  };
};

async function runSeed() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL env var is required');
    }

    console.log('🌱 Seeding properties via Prisma/Postgres...');

    let adminUser = await prisma.user.findFirst({
      where: { role: Prisma.UserRole.ADMIN },
      select: { id: true },
    });

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          name: 'Seed Admin User',
          email: `seed-admin-${Date.now()}@basira.com`,
          password: '$2a$12$placeholderhashplaceholderhashplacehol', // placeholder hash
          role: Prisma.UserRole.ADMIN,
          hierarchy: 1,
          phone: '+201000000000',
          isActive: true,
          isEmailVerified: true,
        },
        select: { id: true },
      });
    }

    await prisma.property.deleteMany();
    console.log('Cleared existing properties');

    const normalizedProps = testProperties.map((prop) => normalizeProperty(prop, adminUser.id));

    for (const prop of normalizedProps) {
      await prisma.property.create({ data: prop });
    }

    console.log(`Successfully inserted ${normalizedProps.length} properties`);
  } catch (error) {
    console.error('Error seeding properties:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSeed();