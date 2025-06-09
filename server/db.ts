import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for serverless environments
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure connection pool with better settings for stability
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 1, // Reduce max connections for better stability
  idleTimeoutMillis: 5000, // Shorter idle timeout
  connectionTimeoutMillis: 10000, // Connection timeout
});

export const db = drizzle({ client: pool, schema });