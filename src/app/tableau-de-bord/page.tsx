import { run } from '@/lib/db/run';
import { Section, Table } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const [genres, sf, quarters, feed, stats, audit, check] = await Promise.all([
    run('m7-1'), run('m7-2'), run('m7-3'), run('m8-4'), run('m14-1'), run('m14-2'), run('m14-3'),
  ]);
  return (
    <>
      <h1>Dashboard</h1>
      <Section title="Favourites and disappointments by genre · M7.1 (FILTER)"><Table rows={genres} /></Section>
      <Section title="Sci-fi average vs overall, per member · M7.2"><Table rows={sf} /></Section>
      <Section title="Viewings per genre and quarter · M7.3 (ROLLUP)"><p className="note">Public journal entries only (row-level security, M16.2).</p><Table rows={quarters} /></Section>
      <Section title="Activity feed, 2 latest per member · M8.4"><Table rows={feed} /></Section>
      <Section title="films_stats, kept up to date by a trigger · M14.1"><Table rows={stats} /></Section>
      <Section title="Audit of changed ratings, WHEN clause · M14.2">
        <p className="dim">Rate a film again on the Rate page: a changed rating adds one line, a confirmation adds none.</p>
        <Table rows={audit} />
      </Section>
      <Section title="Consistency check, films_stats vs notes · M14.3"><Table rows={check} /></Section>
    </>
  );
}
