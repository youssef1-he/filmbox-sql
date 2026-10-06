import { run } from '@/lib/db/run';
import { Section, Table } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [top, split, genres, list] = await Promise.all([
    run('m2-4'),                                  // M2.4 top rated
    run('m3-3'),                                  // M3.3 divisive films
    run('m5-1'),                                  // M5.1 top 3 per genre
    run('m1-4', 'Mon top Nolan'),                 // M1.4 featured list
  ]);
  return (
    <>
      <h1>Track the films you watch.<br />Rate them. Share your taste.</h1>
      <Section title="Top rated · M2.4"><Table rows={top} /></Section>
      <Section title="Featured list · M1.4"><Table rows={list} /></Section>
      <Section title="Films that divide opinion · M3.3"><Table rows={split} /></Section>
      <Section title="Top 3 per genre · M5.1"><Table rows={genres} /></Section>
    </>
  );
}
