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

const client = postgres(process.env.DATABASE_URL!); // Rely solely on PGSSLMODE env var on Render for SSL
export const db = drizzle(client, { schema });