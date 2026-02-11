import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Database connection string from environment
const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
}

// Create postgres client
export const client = postgres(connectionString, {
    max: 10, // Maximum number of connections
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Connection timeout in seconds
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Export schema for convenience
export * from "./schema";
