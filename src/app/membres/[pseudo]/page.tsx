import { run } from '@/lib/db/run';
import { Section, Table } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function Member({ params, searchParams }: {
  params: Promise<{ pseudo: string }>; searchParams: Promise<{ avec?: string }>;
}) {
  const pseudo = decodeURIComponent((await params).pseudo);
  const other = (await searchParams).avec ?? 'nolanfan';
  const [card, months, diary, vs, next, common, summary] = await Promise.all([
    run('m3-1', pseudo), run('m6-1', pseudo), run('m6-4', pseudo), run('m6-3', pseudo), run('m3-2', pseudo),
    run('m10-3', pseudo, other), run('m10-3b', pseudo, other),
  ]);
  return (
    <>
      <h1>{pseudo}</h1>
      <p className="note">Journal figures count public entries only: the site has no login yet, so row-level security (M16.2) hides every private entry.</p>
      {!card.length && !months.length && !diary.length && <p className="dim">No ratings or viewings found for this member.</p>}
      <Section title="Profile card · M3.1"><Table rows={card} /></Section>
      <Section title="Viewings per month, cumulative · M6.1"><Table rows={months} /></Section>
      <Section title="Diary, days since previous · M6.4"><Table rows={diary} /></Section>
      <Section title="Ratings vs the crowd · M6.3"><Table rows={vs} /></Section>
      <Section title="Still to watch · M3.2"><Table rows={next} /></Section>
      <Section title={'Compatibility with ' + other + ' · compatibilite() M10.3'}>
        <form><input name="avec" defaultValue={other} aria-label="Compare with" /><button>Compare</button></form>
        <Table rows={summary} />
        <Table rows={common} />
      </Section>
    </>
  );
}
