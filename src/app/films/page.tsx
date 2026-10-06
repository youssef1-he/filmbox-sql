import { run } from '@/lib/db/run';
import { Section, Table } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function Films({ searchParams }: { searchParams: Promise<{ acteur?: string; saga?: string }> }) {
  const { acteur, saga } = await searchParams;
  const [y2000, long, oscars, tags, sf, sagas, actor, episodes] = await Promise.all([
    run('m2-1'), run('m8-1'), run('m8-2'), run('m8-3'), run('m9-1', 'Science-fiction'), run('m4-2'),
    run('m2-2', acteur), run('m4-1', saga),
  ]);
  return (
    <>
      <h1>Films</h1>
      <Section title="Filmography of an actor · M2.2">
        <form><input name="acteur" defaultValue={acteur ?? 'Kevin Bacon'} aria-label="Actor" /><button>Search</button></form>
        <Table rows={actor} />
      </Section>
      <Section title="Films from 2000 to 2010 · M2.1"><Table rows={y2000} /></Section>
      <Section title="Epic films, over 2 h 30 · M8.1 + duree_texte() M10.1"><Table rows={long} /></Section>
      <Section title="Best Picture winners · M8.2"><Table rows={oscars} /></Section>
      <Section title="Most used tags · M8.3"><Table rows={tags} /></Section>
      <Section title="Science-fiction cards · view v_fiche_film M9.1"><Table rows={sf} /></Section>
      <Section title="Sagas, episode by episode · M4.2"><Table rows={sagas} /></Section>
      <Section title="One saga in order, recursive query · M4.1">
        <form><input name="saga" defaultValue={saga ?? 'Retour vers le futur'} aria-label="Saga" /><button>Show</button></form>
        <Table rows={episodes} />
      </Section>
    </>
  );
}
