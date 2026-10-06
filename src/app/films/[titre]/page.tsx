import { run } from '@/lib/db/run';
import { Section, Table } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function FilmSheet({ params }: { params: Promise<{ titre: string }> }) {
  const raw = (await params).titre;
  let titre = raw;
  try { titre = decodeURIComponent(raw); } catch { /* keep as is */ }
  const [sheet, history, live, cache] = await Promise.all([
    run('fiche', titre),          // v_fiche_film (M9.1) + duree_texte() (M10.1) + note_ponderee() (M10.2) + JSONB (M8)
    run('m6-2', titre),           // M6.2 running average
    run('m9-2-live', titre),      // live statistics (view)
    run('m9-2-cache', titre),     // cached statistics (materialized view)
  ]);
  if (!sheet.length) return <><h1>{titre}</h1><p className="dim">This film is not in the catalogue.</p></>;
  return (
    <>
      <h1>{titre}</h1>
      <Section title="Film sheet · view v_fiche_film M9.1, duree_texte() M10.1, note_ponderee() M10.2, JSONB M8"><Table rows={sheet} /></Section>
      <Section title="Rating history, running average · M6.2"><Table rows={history} /></Section>
      <Section title="Live statistics vs cached statistics · M9.2">
        <p className="dim">The first line is computed live (view). The second comes from the materialized view mv_stats_films: after a new rating it stays unchanged until REFRESH MATERIALIZED VIEW CONCURRENTLY is run by the table owner.</p>
        <Table rows={live} />
        <Table rows={cache} />
      </Section>
    </>
  );
}
