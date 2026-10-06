import { run } from '@/lib/db/run';
import { Section, Table } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function Bacon({ searchParams }: { searchParams: Promise<{ acteur?: string }> }) {
  const { acteur } = await searchParams;
  const [path, far, none] = await Promise.all([run('m4-4', acteur), run('m4-3'), run('m4-5')]);
  return (
    <>
      <h1>Six degrees of Kevin Bacon</h1>
      <Section title="Shortest path · M4.4">
        <form><input name="acteur" defaultValue={acteur ?? 'Omar Sy'} aria-label="Actor" /><button>Find path</button></form>
        <Table rows={path} />
      </Section>
      <Section title="Farthest actors · M4.3"><Table rows={far} /></Section>
      <Section title="Unreachable actors · M4.5"><Table rows={none} /></Section>
    </>
  );
}
