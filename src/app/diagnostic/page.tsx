import { run, type Row } from '@/lib/db/run';
import { Plan, Section, Table } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function Diagnostic() {
  // Sequential on purpose: concurrent EXPLAIN ANALYZE would distort each other's timings.
  const r: Record<string, Row[]> = {};
  for (const id of ['m11-1', 'm11-2', 'm12-2', 'm12-2b', 'm11-3', 'm11-3b', 'm12-3', 'm12-4', 'm1-1']) r[id] = await run(id);
  return (
    <>
      <h1>Diagnostic</h1>
      <p className="dim">Plans reflect the indexes that exist right now. They are most telling with the volume of session 3 loaded.</p>
      <Section title="Profile page, 20 latest viewings · M11.1 → M12.1"><Plan rows={r['m11-1']} /></Section>
      <Section title="Trends with TO_CHAR (slow) · M11.2"><Plan rows={r['m11-2']} /></Section>
      <Section title="Trends with a date range · M12.2"><Plan rows={r['m12-2']} /><Table rows={r['m12-2b']} /></Section>
      <Section title="Planner estimate for science-fiction · M11.3"><Plan rows={r['m11-3']} /><Table rows={r['m11-3b']} /></Section>
      <Section title="Title search with ILIKE · M12.3"><Plan rows={r['m12-3']} /></Section>
      <Section title="Index report · M12.4"><Table rows={r['m12-4']} /></Section>
      <Section title="Structure of the casting table · M1.1"><Table rows={r['m1-1']} /></Section>
    </>
  );
}
