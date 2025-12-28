import { db } from './db/index.js';
import { events } from './db/schema.js';

// Seed events near Raleigh, NC
const seedEvents = [
  {
    name: "State Farmers Market",
    description: "North Carolina's largest farmers market featuring local produce, plants, and artisan goods.",
    venueName: "NC State Farmers Market",
    address: "1201 Agriculture St",
    city: "Raleigh",
    state: "NC",
    zipCode: "27603",
    latitude: "35.7564",
    longitude: "-78.6699",
    startDate: new Date("2025-01-04T07:00:00"),
    endDate: new Date("2025-01-04T18:00:00"),
    category: "farmers_market",
    boothFee: 5000, // $50
    expectedAttendance: 5000,
    vendorSpots: 100,
    organizerName: "NC Dept of Agriculture",
    website: "https://www.ncagr.gov/markets/",
    isActive: true,
  },
  {
    name: "Downtown Raleigh Artisan Market",
    description: "Weekly artisan market in the heart of downtown featuring handcrafted goods and local art.",
    venueName: "Moore Square",
    address: "200 S Blount St",
    city: "Raleigh",
    state: "NC",
    zipCode: "27601",
    latitude: "35.7762",
    longitude: "-78.6364",
    startDate: new Date("2025-01-11T10:00:00"),
    endDate: new Date("2025-01-11T16:00:00"),
    category: "craft_fair",
    boothFee: 7500, // $75
    expectedAttendance: 2000,
    vendorSpots: 40,
    organizerName: "Downtown Raleigh Alliance",
    website: "https://downtownraleigh.org",
    isActive: true,
  },
  {
    name: "Durham Craft Market",
    description: "Monthly craft market celebrating local makers and artisans in Durham.",
    venueName: "Durham Central Park",
    address: "501 Foster St",
    city: "Durham",
    state: "NC",
    zipCode: "27701",
    latitude: "35.9986",
    longitude: "-78.8986",
    startDate: new Date("2025-01-18T09:00:00"),
    endDate: new Date("2025-01-18T14:00:00"),
    category: "craft_fair",
    boothFee: 6000, // $60
    expectedAttendance: 1500,
    vendorSpots: 35,
    organizerName: "Durham Central Park",
    isActive: true,
  },
  {
    name: "Cary Farmers Market",
    description: "Year-round farmers market featuring fresh produce and local goods.",
    venueName: "Downtown Cary Park",
    address: "316 N Academy St",
    city: "Cary",
    state: "NC",
    zipCode: "27513",
    latitude: "35.7915",
    longitude: "-78.7811",
    startDate: new Date("2025-01-25T08:00:00"),
    endDate: new Date("2025-01-25T12:00:00"),
    category: "farmers_market",
    boothFee: 4000, // $40
    expectedAttendance: 1200,
    vendorSpots: 50,
    organizerName: "Town of Cary",
    website: "https://www.townofcary.org",
    isActive: true,
  },
  {
    name: "Chapel Hill Spring Festival",
    description: "Annual spring festival with vendors, food trucks, and live entertainment.",
    venueName: "Franklin Street",
    address: "100 E Franklin St",
    city: "Chapel Hill",
    state: "NC",
    zipCode: "27514",
    latitude: "35.9132",
    longitude: "-79.0558",
    startDate: new Date("2025-03-15T11:00:00"),
    endDate: new Date("2025-03-16T18:00:00"),
    category: "festival",
    boothFee: 15000, // $150
    expectedAttendance: 10000,
    vendorSpots: 80,
    organizerName: "Chapel Hill Downtown Partnership",
    website: "https://downtownchapelhill.com",
    applicationDeadline: new Date("2025-02-15"),
    isActive: true,
  },
  {
    name: "Wake Forest Farmers Market",
    description: "Community farmers market with local produce and artisan goods.",
    venueName: "Wake Forest Town Hall",
    address: "301 S Brooks St",
    city: "Wake Forest",
    state: "NC",
    zipCode: "27587",
    latitude: "35.9799",
    longitude: "-78.5097",
    startDate: new Date("2025-02-01T09:00:00"),
    endDate: new Date("2025-02-01T13:00:00"),
    category: "farmers_market",
    boothFee: 3500, // $35
    expectedAttendance: 800,
    vendorSpots: 25,
    organizerName: "Wake Forest Downtown",
    isActive: true,
  },
];

async function seed() {
  console.log('Seeding events...');

  for (const event of seedEvents) {
    try {
      await db.insert(events).values(event);
      console.log(`Added: ${event.name}`);
    } catch (error) {
      console.error(`Error adding ${event.name}:`, error);
    }
  }

  console.log('Seeding complete!');
  process.exit(0);
}

seed();
