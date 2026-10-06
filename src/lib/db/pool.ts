import { Pool, types } from 'pg';

types.setTypeParser(1082, (v) => v); // keep DATE columns as 'YYYY-MM-DD'

// One pool per server process (survives hot reloads in dev).
const g = globalThis as unknown as { pool?: Pool };
export const pool = g.pool ?? (g.pool = new Pool({ connectionString: process.env.DATABASE_URL }));
