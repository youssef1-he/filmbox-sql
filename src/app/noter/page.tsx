import { noter, soiree, voir } from '../actions';
import { Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function Rate({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { ok, err } = await searchParams;
  return (
    <>
      <h1>Rate a film</h1>
      {ok && <p className="ok">{ok}</p>}
      {err && <p className="err">{err}</p>}
      <Section title="Rate · procedure noter() · M13.1 / M13.2">
        <form action={noter}>
          <input name="pseudo" defaultValue="lea.reel" aria-label="Member" />
          <input name="titre" defaultValue="Inception" aria-label="Film" />
          <select name="note" defaultValue="3.5" aria-label="Rating">
            {[5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 6].map((n) => <option key={n}>{n}</option>)}
          </select>
          <button>Rate</button>
        </form>
        <p className="dim">The list includes 6 on purpose: try it, or a film that does not exist, to see the procedure's messages.</p>
      </Section>
      <Section title="Open a film sheet · atomic counter · M15.2">
        <form action={voir}><input name="titre" defaultValue="Inception" aria-label="Film" /><button>Count a view</button></form>
      </Section>
      <Section title="Log an evening · all or nothing · transaction M15.3">
        <form action={soiree} style={{ flexWrap: 'wrap' }}>
          <input name="pseudo" defaultValue="lea.reel" aria-label="Member" />
          <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} aria-label="Date" />
          <textarea name="titres" rows={3} defaultValue={'Inception\nTitanic\nAvatar'} aria-label="Films, one per line" />
          <button>Save evening</button>
        </form>
        <p className="dim">One film per line. The default list contains Avatar, which is not in the catalogue: the whole evening is cancelled, not only the failing line.</p>
      </Section>
    </>
  );
}
