import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// Prefer public URL since internal networking may not be set up
let connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Clean up any trailing }} from Railway template issues
connectionString = connectionString.replace(/\}\}$/, '');

console.log('Connecting to database...');

const client = postgres(connectionString, {
  connect_timeout: 10,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
});
export const db = drizzle(client, { schema });
