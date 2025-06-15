import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';
// import fs from 'fs'; // Removed, unused
// import path from 'path'; // Removed, unused

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL must be set. Did you forget to provision a database?',
  );
}

const client = postgres(process.env.DATABASE_URL!, {
  // Explicitly enable SSL for production on Render, but disable certificate verification.
  // This is the correct way to achieve 'no-verify' behavior with this library's types.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(client, { schema });