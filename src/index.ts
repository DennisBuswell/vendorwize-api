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

// Get events near a location with filtering
app.get('/api/events/near', async (c) => {
  try {
    const lat = parseFloat(c.req.query('lat') || '35.7796'); // Default: Raleigh
    const lng = parseFloat(c.req.query('lng') || '-78.6382');
    const radiusMiles = parseFloat(c.req.query('radius') || '50');

    // Filter params
    const category = c.req.query('category');
    const maxFee = c.req.query('maxFee') ? parseInt(c.req.query('maxFee')!) * 100 : null; // Convert to cents
    const freeOnly = c.req.query('freeOnly') === 'true';
    const dateFrom = c.req.query('dateFrom');
    const dateTo = c.req.query('dateTo');
    const indoor = c.req.query('indoor') === 'true';
    const noInsurance = c.req.query('noInsurance') === 'true';
    const noTent = c.req.query('noTent') === 'true';
    const handmadeOk = c.req.query('handmadeOk') === 'true'; // excludes handmade-only events
    const hasDeadline = c.req.query('hasDeadline') === 'true';

    // Simple bounding box filter (approximate)
    const latDelta = radiusMiles / 69.0; // ~69 miles per degree latitude
    const lngDelta = radiusMiles / (69.0 * Math.cos(lat * Math.PI / 180));

    // Build conditions array
    const conditions = [
      gte(events.latitude, String(lat - latDelta)),
      lte(events.latitude, String(lat + latDelta)),
      gte(events.longitude, String(lng - lngDelta)),
      lte(events.longitude, String(lng + lngDelta))
    ];

    // Category filter
    if (category && category !== 'all') {
      conditions.push(sql`${events.category} = ${category}`);
    }

    // Fee filters
    if (freeOnly) {
      conditions.push(sql`(${events.boothFeeMin} IS NULL OR ${events.boothFeeMin} = 0)`);
    } else if (maxFee !== null) {
      conditions.push(sql`(${events.boothFeeMin} IS NULL OR ${events.boothFeeMin} <= ${maxFee})`);
    }

    // Date filters
    if (dateFrom) {
      conditions.push(gte(events.startDate, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(events.startDate, new Date(dateTo)));
    }

    // Requirement filters
    if (indoor) {
      conditions.push(sql`${events.isIndoor} = true`);
    }
    if (noInsurance) {
      conditions.push(sql`(${events.requiresInsurance} = false OR ${events.requiresInsurance} IS NULL)`);
    }
    if (noTent) {
      conditions.push(sql`(${events.requiresTent} = false OR ${events.requiresTent} IS NULL)`);
    }
    if (handmadeOk) {
      conditions.push(sql`(${events.handmadeOnly} = false OR ${events.handmadeOnly} IS NULL)`);
    }
    if (hasDeadline) {
      conditions.push(sql`${events.applicationDeadline} IS NOT NULL`);
    }

    const nearbyEvents = await db.select().from(events)
      .where(and(...conditions))
      .orderBy(events.startDate);

    return c.json({
      events: nearbyEvents,
      searchCenter: { lat, lng },
      radiusMiles,
      filters: { category, maxFee: maxFee ? maxFee / 100 : null, freeOnly, dateFrom, dateTo, indoor, noInsurance, noTent }
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

// Admin: Create schema (v2 with enriched fields)
app.post('/api/admin/migrate', async (c) => {
  try {
    // Drop and recreate events table with new schema
    await db.execute(sql`DROP TABLE IF EXISTS events`);
    await db.execute(sql`
      CREATE TABLE events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,

        -- Location
        venue_name VARCHAR(255),
        address VARCHAR(500),
        city VARCHAR(100) NOT NULL,
        state VARCHAR(50) NOT NULL,
        zip_code VARCHAR(20),
        latitude NUMERIC(10, 7),
        longitude NUMERIC(10, 7),

        -- Date/Time
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        setup_time VARCHAR(10),
        teardown_time VARCHAR(10),

        -- Event details
        category VARCHAR(100),
        tags JSONB,
        expected_attendance INTEGER,
        vendor_spots INTEGER,
        is_indoor BOOLEAN DEFAULT false,
        has_shelter BOOLEAN DEFAULT false,
        is_recurring BOOLEAN DEFAULT false,
        recurrence_pattern JSONB,

        -- Booth fees
        booth_fee_min INTEGER,
        booth_fee_max INTEGER,
        booth_fees JSONB,

        -- Application
        application_method VARCHAR(50),
        application_url VARCHAR(500),
        application_platform VARCHAR(100),
        application_deadline TIMESTAMP,
        is_juried BOOLEAN DEFAULT false,
        application_details JSONB,

        -- Vendor requirements
        handmade_only BOOLEAN DEFAULT false,
        requires_tax_id BOOLEAN DEFAULT false,
        requires_insurance BOOLEAN DEFAULT false,
        requires_tent BOOLEAN DEFAULT false,
        vendor_requirements JSONB,

        -- Operations
        weather_policy VARCHAR(50),
        operations JSONB,
        policies JSONB,
        amenities JSONB,

        -- Organizer
        organizer_name VARCHAR(255),
        organizer_email VARCHAR(255),
        organizer_phone VARCHAR(50),
        organizer_website VARCHAR(500),
        organizer_description TEXT,
        organizer_socials JSONB,

        -- Links
        website VARCHAR(500),
        external_event_url VARCHAR(500),

        -- Status & Metadata
        is_active BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,
        region VARCHAR(50),
        source_url VARCHAR(500),
        import_source VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    return c.json({ status: 'Schema v2 created successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    return c.json({ error: 'Migration failed', details: String(error) }, 500);
  }
});

// Admin: Import enriched events from JSON
app.post('/api/admin/import', async (c) => {
  try {
    const body = await c.req.json();
    const enrichedEvents = body.events || [];
    let imported = 0;
    let errors: string[] = [];

    for (const item of enrichedEvents) {
      try {
        const e = item.event;
        const o = item.organizer || {};
        const loc = e.location || {};
        const app = e.application || {};
        const vr = e.vendor_requirements || {};
        const ops = e.operations || {};
        const minFee = e.min_booth_fee?.amount ? Math.round(e.min_booth_fee.amount * 100) : null;
        const maxFee = e.max_booth_fee?.amount ? Math.round(e.max_booth_fee.amount * 100) : null;

        await db.insert(events).values({
          name: e.name,
          description: e.description,
          venueName: loc.venue_name,
          address: loc.address_line1,
          city: loc.city || 'Unknown',
          state: loc.state || 'NC',
          zipCode: loc.postal_code,
          latitude: loc.latitude ? String(loc.latitude) : null,
          longitude: loc.longitude ? String(loc.longitude) : null,
          startDate: new Date(e.start_date),
          endDate: new Date(e.end_date),
          setupTime: e.setup_time,
          teardownTime: e.teardown_time,
          category: e.category,
          tags: e.tags,
          expectedAttendance: e.expected_attendance,
          vendorSpots: e.total_booth_capacity,
          isIndoor: e.is_indoor || false,
          hasShelter: e.has_shelter || false,
          isRecurring: e.is_recurring || false,
          recurrencePattern: e.recurrence_pattern,
          boothFeeMin: minFee,
          boothFeeMax: maxFee,
          boothFees: e.booth_fees,
          applicationMethod: app.method || e.application_method,
          applicationUrl: app.url || e.external_application_url,
          applicationPlatform: app.platform,
          applicationDeadline: app.deadline ? new Date(app.deadline) : null,
          isJuried: app.is_juried || false,
          applicationDetails: app,
          handmadeOnly: vr.handmade_only || false,
          requiresTaxId: vr.requires_tax_id || false,
          requiresInsurance: vr.requires_insurance || false,
          requiresTent: vr.requires_tent || false,
          vendorRequirements: vr,
          weatherPolicy: ops.weather_policy,
          operations: ops,
          policies: e.policies,
          amenities: e.amenities_detailed || e.amenities,
          organizerName: o.organization_name,
          organizerEmail: o.contact_email,
          organizerPhone: o.contact_phone,
          organizerWebsite: o.website,
          organizerDescription: o.description,
          organizerSocials: o.social_links,
          website: o.website,
          externalEventUrl: e.external_event_url,
          isActive: true,
          isVerified: item.provenance?.is_verified || false,
          region: e.region,
          importSource: item.provenance?.import_source || 'api_import',
        });
        imported++;
      } catch (err) {
        errors.push(`Failed to import "${item.event?.name}": ${err}`);
      }
    }

    return c.json({
      status: 'Import complete',
      imported,
      total: enrichedEvents.length,
      errors: errors.slice(0, 10) // limit error output
    });
  } catch (error) {
    console.error('Import error:', error);
    return c.json({ error: 'Import failed', details: String(error) }, 500);
  }
});

// Admin: Clear all events
app.delete('/api/admin/events', async (c) => {
  try {
    await db.delete(events);
    return c.json({ status: 'All events deleted' });
  } catch (error) {
    return c.json({ error: 'Delete failed', details: String(error) }, 500);
  }
});

const port = parseInt(process.env.PORT || '3000');
console.log(`VendorWize API starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
