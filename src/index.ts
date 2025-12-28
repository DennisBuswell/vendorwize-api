import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { db } from './db/index.js';
import { events } from './db/schema.js';
import { desc, sql, and, gte, lte } from 'drizzle-orm';

const app = new Hono();

// Enable CORS for frontend access
app.use('/*', cors());

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'VendorWize API',
    version: '1.0.0'
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'healthy' });
});

// Get all events
app.get('/api/events', async (c) => {
  try {
    const allEvents = await db.select().from(events).orderBy(desc(events.startDate));
    return c.json({ events: allEvents });
  } catch (error) {
    console.error('Error fetching events:', error);
    return c.json({ error: 'Failed to fetch events' }, 500);
  }
});

// Get events near a location (simple distance filter)
app.get('/api/events/near', async (c) => {
  try {
    const lat = parseFloat(c.req.query('lat') || '35.7796'); // Default: Raleigh
    const lng = parseFloat(c.req.query('lng') || '-78.6382');
    const radiusMiles = parseFloat(c.req.query('radius') || '50');

    // Simple bounding box filter (approximate)
    const latDelta = radiusMiles / 69.0; // ~69 miles per degree latitude
    const lngDelta = radiusMiles / (69.0 * Math.cos(lat * Math.PI / 180));

    const nearbyEvents = await db.select().from(events)
      .where(and(
        gte(events.latitude, String(lat - latDelta)),
        lte(events.latitude, String(lat + latDelta)),
        gte(events.longitude, String(lng - lngDelta)),
        lte(events.longitude, String(lng + lngDelta))
      ))
      .orderBy(events.startDate);

    return c.json({
      events: nearbyEvents,
      searchCenter: { lat, lng },
      radiusMiles
    });
  } catch (error) {
    console.error('Error fetching nearby events:', error);
    return c.json({ error: 'Failed to fetch nearby events' }, 500);
  }
});

// Get single event by ID
app.get('/api/events/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const event = await db.select().from(events).where(sql`${events.id} = ${id}`).limit(1);

    if (event.length === 0) {
      return c.json({ error: 'Event not found' }, 404);
    }

    return c.json({ event: event[0] });
  } catch (error) {
    console.error('Error fetching event:', error);
    return c.json({ error: 'Failed to fetch event' }, 500);
  }
});

// Create a new event
app.post('/api/events', async (c) => {
  try {
    const body = await c.req.json();
    const newEvent = await db.insert(events).values(body).returning();
    return c.json({ event: newEvent[0] }, 201);
  } catch (error) {
    console.error('Error creating event:', error);
    return c.json({ error: 'Failed to create event' }, 500);
  }
});

// Admin: Create schema and seed data
app.post('/api/admin/migrate', async (c) => {
  try {
    // Create events table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        venue_name VARCHAR(255),
        address VARCHAR(500),
        city VARCHAR(100) NOT NULL,
        state VARCHAR(50) NOT NULL,
        zip_code VARCHAR(20),
        latitude NUMERIC(10, 7),
        longitude NUMERIC(10, 7),
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        category VARCHAR(100),
        booth_fee INTEGER,
        expected_attendance INTEGER,
        vendor_spots INTEGER,
        organizer_name VARCHAR(255),
        organizer_email VARCHAR(255),
        organizer_phone VARCHAR(50),
        website VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        application_deadline TIMESTAMP,
        source_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    return c.json({ status: 'Schema created successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    return c.json({ error: 'Migration failed', details: String(error) }, 500);
  }
});

// Admin: Seed sample events
app.post('/api/admin/seed', async (c) => {
  try {
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
        boothFee: 5000,
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
        boothFee: 7500,
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
        boothFee: 6000,
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
        boothFee: 4000,
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
        boothFee: 15000,
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
        boothFee: 3500,
        expectedAttendance: 800,
        vendorSpots: 25,
        organizerName: "Wake Forest Downtown",
        isActive: true,
      },
    ];

    for (const event of seedEvents) {
      await db.insert(events).values(event);
    }

    return c.json({ status: 'Seeded successfully', count: seedEvents.length });
  } catch (error) {
    console.error('Seed error:', error);
    return c.json({ error: 'Seeding failed', details: String(error) }, 500);
  }
});

const port = parseInt(process.env.PORT || '3000');
console.log(`VendorWize API starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
