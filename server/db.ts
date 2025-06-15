import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL must be set. Did you forget to provision a database?',
  );
}

// Force SSL mode by appending it to the connection string for Render
const connectionString = `${process.env.DATABASE_URL!}?sslmode=no-verify`;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });