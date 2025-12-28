import { pgTable, uuid, varchar, text, timestamp, numeric, integer, boolean } from 'drizzle-orm/pg-core';

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  // Location
  venueName: varchar('venue_name', { length: 255 }),
  address: varchar('address', { length: 500 }),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 50 }).notNull(),
  zipCode: varchar('zip_code', { length: 20 }),
  latitude: numeric('latitude', { precision: 10, scale: 7 }),
  longitude: numeric('longitude', { precision: 10, scale: 7 }),

  // Date/Time
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),

  // Event details
  category: varchar('category', { length: 100 }), // farmers_market, craft_fair, festival, etc.
  boothFee: integer('booth_fee'), // in cents
  expectedAttendance: integer('expected_attendance'),
  vendorSpots: integer('vendor_spots'),

  // Organizer info
  organizerName: varchar('organizer_name', { length: 255 }),
  organizerEmail: varchar('organizer_email', { length: 255 }),
  organizerPhone: varchar('organizer_phone', { length: 50 }),
  website: varchar('website', { length: 500 }),

  // Status
  isActive: boolean('is_active').default(true),
  applicationDeadline: timestamp('application_deadline'),

  // Metadata
  sourceUrl: varchar('source_url', { length: 500 }), // where we found this event
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
