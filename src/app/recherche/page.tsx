import { run } from '@/lib/db/run';
import { Section, Table } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const rows = await run('m16-3', q);               // rechercher_films(): static SQL (M16.3), trigram index (M12.3)
  return (
    <>
      <h1>Search</h1>
      <form><input name="q" defaultValue={q ?? 'dark'} aria-label="Title" /><button>Search</button></form>
      <Section title="First 5 matches · rechercher_films() · M16.3"><Table rows={rows} /></Section>
      <p className="dim">Try x&apos; OR &apos;1&apos;=&apos;1: it is treated as plain text, so there is no match.</p>
    </>
  );
}
