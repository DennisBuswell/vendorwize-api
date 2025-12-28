import { pgTable, uuid, varchar, text, timestamp, numeric, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

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
  setupTime: varchar('setup_time', { length: 10 }),
  teardownTime: varchar('teardown_time', { length: 10 }),

  // Event details
  category: varchar('category', { length: 100 }),
  tags: jsonb('tags').$type<string[]>(),
  expectedAttendance: integer('expected_attendance'),
  vendorSpots: integer('vendor_spots'),
  isIndoor: boolean('is_indoor').default(false),
  hasShelter: boolean('has_shelter').default(false),
  isRecurring: boolean('is_recurring').default(false),
  recurrencePattern: jsonb('recurrence_pattern'),

  // Booth fees (structured)
  boothFeeMin: integer('booth_fee_min'), // in cents
  boothFeeMax: integer('booth_fee_max'), // in cents
  boothFees: jsonb('booth_fees'), // full structured fees

  // Application
  applicationMethod: varchar('application_method', { length: 50 }),
  applicationUrl: varchar('application_url', { length: 500 }),
  applicationPlatform: varchar('application_platform', { length: 100 }),
  applicationDeadline: timestamp('application_deadline'),
  isJuried: boolean('is_juried').default(false),
  applicationDetails: jsonb('application_details'),

  // Vendor requirements
  handmadeOnly: boolean('handmade_only').default(false),
  requiresTaxId: boolean('requires_tax_id').default(false),
  requiresInsurance: boolean('requires_insurance').default(false),
  requiresTent: boolean('requires_tent').default(false),
  vendorRequirements: jsonb('vendor_requirements'),

  // Operations
  weatherPolicy: varchar('weather_policy', { length: 50 }),
  operations: jsonb('operations'),
  policies: jsonb('policies'),
  amenities: jsonb('amenities'),

  // Organizer info
  organizerName: varchar('organizer_name', { length: 255 }),
  organizerEmail: varchar('organizer_email', { length: 255 }),
  organizerPhone: varchar('organizer_phone', { length: 50 }),
  organizerWebsite: varchar('organizer_website', { length: 500 }),
  organizerDescription: text('organizer_description'),
  organizerSocials: jsonb('organizer_socials'),

  // Links
  website: varchar('website', { length: 500 }),
  externalEventUrl: varchar('external_event_url', { length: 500 }),

  // Status & Metadata
  isActive: boolean('is_active').default(true),
  isVerified: boolean('is_verified').default(false),
  region: varchar('region', { length: 50 }),
  sourceUrl: varchar('source_url', { length: 500 }),
  importSource: varchar('import_source', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
