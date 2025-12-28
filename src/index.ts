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

const port = parseInt(process.env.PORT || '3000');
console.log(`VendorWize API starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
