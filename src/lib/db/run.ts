import { pool } from './pool';
import * as catalog from './catalog'; // SQL of missions M1-M10 (plain JS, shared with the Express version)

type Entry = { id: string; sql: string; param?: { default: string }; param2?: { default: string } };
const entries = catalog.queries as Entry[];

export type Row = Record<string, unknown>;

/** Runs one of the catalogued queries by id. Values are always passed as $1/$2, never concatenated. */
export async function run(id: string, ...values: (string | undefined)[]): Promise<Row[]> {
  const q = entries.find((e) => e.id === id);
  if (!q) throw new Error('Unknown query: ' + id);
  const args = [q.param && (values[0] || q.param.default), q.param2 && (values[1] || q.param2.default)].filter(Boolean);
  return (await pool.query(q.sql, args as string[])).rows;
}
