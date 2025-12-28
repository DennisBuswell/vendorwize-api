import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// Use DATABASE_URL (Railway injects this)
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Clean up any trailing }} from Railway template issues
connectionString = connectionString.replace(/\}\}$/, '');

console.log('Connecting to database at:', connectionString.replace(/:[^:@]+@/, ':***@'));

const client = postgres(connectionString, {
  ssl: false, // Railway internal network doesn't need SSL
  max: 10,
  idle_timeout: 20,
});
export const db = drizzle(client, { schema });
