import { run } from '@/lib/db/run';
import { Section, Table } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function Rankings({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const [weighted, directors, active, prolific, favourite, episodes] = await Promise.all([
    run('m10-2', m),                              // M10.2 note_ponderee()
    run('m5-2'),                                  // M5.2 directors, DENSE_RANK
    run('m2-5'),                                  // M2.5 most active members
    run('m2-3'), run('m5-3'), run('m5-4'),        // M2.3 prolific directors, M5.3 favourites, M5.4 best episode
  ]);
  return (
    <>
      <h1>Rankings</h1>
      <Section title="Raw vs weighted ranking · M10.2">
        <p className="dim">Films with few votes are pulled toward the global average. m = vote threshold (default 5).</p>
        <form><input name="m" defaultValue={m ?? '5'} aria-label="Vote threshold m" size={4} /><button>Recompute</button></form>
        <Table rows={weighted} />
      </Section>
      <Section title="Directors · M5.2"><Table rows={directors} /></Section>
      <Section title="Most active members · M2.5"><p className="note">Public journal entries only (row-level security, M16.2).</p><Table rows={active} /></Section>
      <Section title="Prolific directors · M2.3"><Table rows={prolific} /></Section>
      <Section title="Each member's favourite film · M5.3"><Table rows={favourite} /></Section>
      <Section title="Best episode of each saga · M5.4"><Table rows={episodes} /></Section>
    </>
  );
}
