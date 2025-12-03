require('dotenv').config();
const { Prisma } = require('../prisma/generated');
const prisma = require('../prisma/client');

const sampleLaunches = [
  {
    title: "Luxury Villas - New Cairo",
    developer: "Emaar Egypt",
    description: "Premium luxury villas with modern architecture, featuring private gardens, swimming pools, and smart home technology.",
    content: "Premium luxury villas with modern architecture, featuring private gardens, swimming pools, and smart home technology. Located in the heart of New Cairo with easy access to major highways and shopping centers. Starting from EGP 8.5M, this exclusive development by Emaar Egypt offers world-class amenities including smart home technology, private swimming pools, landscaped gardens, 24/7 security, gym & spa facilities, and direct access to shopping centers. Perfect for those seeking luxury living in Egypt's most prestigious new development area.",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2053&q=80"
    ],
    location: "New Cairo",
    propertyType: "Villa",
    status: "Available",
    startingPrice: 8500000,
    currency: "EGP",
    launchDate: new Date("2024-03-01"),
    completionDate: new Date("2025-12-31"),
    area: 300,
    areaUnit: "sqm",
    bedrooms: 4,
    bathrooms: 3,
    features: [
      "Smart Home Technology",
      "Private Swimming Pool",
      "Landscaped Gardens",
      "24/7 Security",
      "Gym & Spa",
      "Shopping Center Access"
    ],
    amenities: [
      "Swimming Pool",
      "Gym",
      "Spa",
      "Landscaped Gardens",
      "Security",
      "Parking"
    ],
    isFeatured: true,
    contactInfo: {
      phone: "+20 123 456 7890",
      email: "info@emaar.com",
      website: "https://emaar.com"
    },
    nearbyFacilities: [
      {
        name: "Cairo Festival City",
        type: "Mall",
        distance: 500,
        distanceUnit: "m"
      },
      {
        name: "New Cairo International School",
        type: "School",
        distance: 1000,
        distanceUnit: "m"
      }
    ],
    paymentPlans: [
      {
        name: "Early Bird",
        description: "10% down payment, 5 years installments",
        downPayment: 10,
        installments: 60,
        installmentPeriod: "monthly"
      }
    ]
  },
  {
    title: "Marina Heights - North Coast",
    developer: "SODIC",
    description: "Exclusive beachfront apartments and penthouses with stunning Mediterranean Sea views.",
    content: "Exclusive beachfront apartments and penthouses with stunning Mediterranean Sea views. Features include private beach access, yacht marina, and world-class amenities. Starting from EGP 12M, this premium development by SODIC offers the ultimate coastal living experience with direct beach access, private yacht marina, sea view balconies, and luxury resort-style amenities. Perfect for those seeking an investment opportunity in Egypt's most prestigious coastal destination.",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2053&q=80",
    images: [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2053&q=80"
    ],
    location: "North Coast",
    propertyType: "Apartment",
    status: "Coming Soon",
    startingPrice: 12000000,
    currency: "EGP",
    launchDate: new Date("2024-04-01"),
    completionDate: new Date("2026-06-30"),
    area: 120,
    areaUnit: "sqm",
    bedrooms: 2,
    bathrooms: 2,
    features: [
      "Beachfront Location",
      "Yacht Marina",
      "Private Beach Access",
      "Sea View Balconies",
      "Luxury Amenities",
      "Investment Opportunity"
    ],
    amenities: [
      "Private Beach",
      "Yacht Marina",
      "Swimming Pool",
      "Restaurant",
      "Spa",
      "Concierge Service"
    ],
    isFeatured: true,
    contactInfo: {
      phone: "+20 123 456 7891",
      email: "info@sodic.com",
      website: "https://sodic.com"
    }
  },
  {
    title: "Garden City Residences",
    developer: "Palm Hills",
    description: "Modern residential complex with green spaces and family-friendly amenities.",
    content: "Modern residential complex with green spaces and family-friendly amenities. Perfect for families looking for a peaceful environment with excellent connectivity to Cairo. Starting from EGP 6.2M, this family-oriented development by Palm Hills features extensive green spaces, family amenities, nearby schools, shopping mall, medical center, and easy access to Cairo. Ideal for families seeking a balanced lifestyle in a well-connected community.",
    image: "https://images.unsplash.com/photo-1600607687644-c7171b42498b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    images: [
      "https://images.unsplash.com/photo-1600607687644-c7171b42498b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
    ],
    location: "6th October City",
    propertyType: "Apartment",
    status: "Available",
    startingPrice: 6200000,
    currency: "EGP",
    launchDate: new Date("2024-05-01"),
    completionDate: new Date("2025-08-31"),
    area: 90,
    areaUnit: "sqm",
    bedrooms: 2,
    bathrooms: 2,
    features: [
      "Green Spaces",
      "Family Amenities",
      "Schools Nearby",
      "Shopping Mall",
      "Medical Center",
      "Easy Cairo Access"
    ],
    amenities: [
      "Green Spaces",
      "Playground",
      "Swimming Pool",
      "Gym",
      "Shopping Mall",
      "Medical Center"
    ],
    isFeatured: false,
    contactInfo: {
      phone: "+20 123 456 7892",
      email: "info@palmhills.com",
      website: "https://palmhills.com"
    }
  },
  {
    title: "Capital Heights - New Capital",
    developer: "Talaat Moustafa Group",
    description: "Ultra-modern high-rise towers in the heart of Egypt's new administrative capital.",
    content: "Ultra-modern high-rise towers in the heart of Egypt's new administrative capital. Featuring cutting-edge design, smart city integration, and proximity to government buildings. Starting from EGP 15M, this futuristic development by Talaat Moustafa Group offers smart city integration, government proximity, modern architecture, high-speed internet, and prime business district location. Perfect for those seeking a future investment in Egypt's new administrative capital.",
    image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    images: [
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
    ],
    location: "New Capital",
    propertyType: "Apartment",
    status: "Pre-Launch",
    startingPrice: 15000000,
    currency: "EGP",
    launchDate: new Date("2024-06-01"),
    completionDate: new Date("2027-12-31"),
    area: 150,
    areaUnit: "sqm",
    bedrooms: 3,
    bathrooms: 2,
    features: [
      "Smart City Integration",
      "Government Proximity",
      "Modern Architecture",
      "High-Speed Internet",
      "Business District",
      "Future Investment"
    ],
    amenities: [
      "Smart Building",
      "High-Speed Internet",
      "Business Center",
      "Gym",
      "Rooftop Garden",
      "Concierge"
    ],
    isFeatured: true,
    contactInfo: {
      phone: "+20 123 456 7893",
      email: "info@tmg.com",
      website: "https://tmg.com"
    }
  },
  {
    title: "Zamalek Heritage",
    developer: "Orascom Development",
    description: "Boutique luxury apartments in the prestigious Zamalek district.",
    content: "Boutique luxury apartments in the prestigious Zamalek district. Combining historical charm with modern luxury, featuring Nile views and premium finishes. Starting from EGP 18M, this exclusive development by Orascom Development offers Nile views, historical location, premium finishes, boutique design, cultural district access, and high-end amenities. Perfect for those seeking luxury living in Cairo's most prestigious neighborhood.",
    image: "https://images.unsplash.com/photo-1600607687644-c7171b42498b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    images: [
      "https://images.unsplash.com/photo-1600607687644-c7171b42498b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
    ],
    location: "Zamalek, Cairo",
    propertyType: "Apartment",
    status: "Available",
    startingPrice: 18000000,
    currency: "EGP",
    launchDate: new Date("2024-07-01"),
    completionDate: new Date("2025-10-31"),
    area: 180,
    areaUnit: "sqm",
    bedrooms: 3,
    bathrooms: 3,
    features: [
      "Nile Views",
      "Historical Location",
      "Premium Finishes",
      "Boutique Design",
      "Cultural District",
      "High-End Amenities"
    ],
    amenities: [
      "Nile Views",
      "Premium Finishes",
      "Concierge",
      "Valet Parking",
      "Rooftop Terrace",
      "Cultural Access"
    ],
    isFeatured: false,
    contactInfo: {
      phone: "+20 123 456 7894",
      email: "info@orascom.com",
      website: "https://orascom.com"
    }
  },
  {
    title: "Desert Oasis - El Gouna",
    developer: "El Gouna Development",
    description: "Eco-friendly resort-style villas in the beautiful El Gouna.",
    content: "Eco-friendly resort-style villas in the beautiful El Gouna. Perfect for those seeking a sustainable lifestyle with access to world-class diving and water sports. Starting from EGP 9.8M, this sustainable development by El Gouna Development features eco-friendly design, resort amenities, water sports access, diving center, sustainable living options, and tourism investment opportunities. Perfect for those seeking a unique lifestyle in Egypt's premier resort destination.",
    image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    images: [
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
    ],
    location: "El Gouna, Red Sea",
    propertyType: "Villa",
    status: "Coming Soon",
    startingPrice: 9800000,
    currency: "EGP",
    launchDate: new Date("2024-08-01"),
    completionDate: new Date("2026-03-31"),
    area: 250,
    areaUnit: "sqm",
    bedrooms: 3,
    bathrooms: 3,
    features: [
      "Eco-Friendly Design",
      "Resort Amenities",
      "Water Sports Access",
      "Diving Center",
      "Sustainable Living",
      "Tourism Investment"
    ],
    amenities: [
      "Water Sports",
      "Diving Center",
      "Resort Pool",
      "Spa",
      "Restaurant",
      "Eco Features"
    ],
    isFeatured: true,
    contactInfo: {
      phone: "+20 123 456 7895",
      email: "info@elgouna.com",
      website: "https://elgouna.com"
    }
  }
];

const statusMap = {
  available: Prisma.LaunchStatus.AVAILABLE,
  'coming soon': Prisma.LaunchStatus.COMING_SOON,
  'pre-launch': Prisma.LaunchStatus.PRE_LAUNCH,
  'prelaunch': Prisma.LaunchStatus.PRE_LAUNCH,
};

const propertyTypeMap = {
  villa: Prisma.LaunchPropertyType.VILLA,
  apartment: Prisma.LaunchPropertyType.APARTMENT,
  townhouse: Prisma.LaunchPropertyType.TOWNHOUSE,
  penthouse: Prisma.LaunchPropertyType.PENTHOUSE,
};

async function seedLaunches() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL env var is required');
    }

    const adminUser = await prisma.user.findFirst({
      where: { role: Prisma.UserRole.ADMIN },
      select: { id: true },
    });

    if (!adminUser) {
      console.error('No admin user found. Please create an admin user first.');
      process.exit(1);
    }

    await prisma.launch.deleteMany();
    console.log('Cleared existing launches');

    const preparedLaunches = sampleLaunches.map((launch) => ({
      title: launch.title,
      developer: launch.developer,
      description: launch.description,
      content: launch.content,
      image: launch.image,
      images: launch.images || [],
      location: launch.location,
      propertyType: propertyTypeMap[launch.propertyType?.toLowerCase()] || Prisma.LaunchPropertyType.APARTMENT,
      status: statusMap[launch.status?.toLowerCase()] || Prisma.LaunchStatus.AVAILABLE,
      startingPrice: new Prisma.Decimal(launch.startingPrice),
      currency: launch.currency || 'EGP',
      launchDate: launch.launchDate || new Date(),
      completionDate: launch.completionDate || null,
      area: launch.area || 0,
      areaUnit: launch.areaUnit || 'sqm',
      bedrooms: launch.bedrooms ?? null,
      bathrooms: launch.bathrooms ?? null,
      features: launch.features || [],
      amenities: launch.amenities || [],
      isFeatured: launch.isFeatured ?? false,
      isActive: true,
      contactInfo: launch.contactInfo || null,
      coordinates: launch.coordinates || null,
      nearbyFacilities: launch.nearbyFacilities || null,
      paymentPlans: launch.paymentPlans || null,
      createdById: adminUser.id,
      updatedById: adminUser.id,
    }));

    const createdLaunches = await prisma.$transaction(
      preparedLaunches.map((launch) => prisma.launch.create({ data: launch }))
    );

    console.log(`Successfully created ${createdLaunches.length} launches`);
    createdLaunches.forEach((launch) => {
      console.log(`- ${launch.title} (${launch.status})`);
    });
    console.log('\nLaunches seeded successfully!');
  } catch (error) {
    console.error('Error seeding launches:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedLaunches();

