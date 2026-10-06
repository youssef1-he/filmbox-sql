import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Row } from '@/lib/db/run';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2>{title}</h2>{children}</section>;
}

const show = (v: unknown) => (v == null ? '—' : Array.isArray(v) ? v.join(', ') : String(v));

/** Film titles open the film sheet, member names open the profile. */
function cell(col: string, v: unknown) {
  if (v == null || typeof v !== 'string') return show(v);
  if (col === 'titre' || col === 'film') return <Link href={'/films/' + encodeURIComponent(v)}>{v}</Link>;
  if (col === 'pseudo') return <Link href={'/membres/' + encodeURIComponent(v)}>{v}</Link>;
  return show(v);
}

export function Table({ rows }: { rows: Row[] }) {
  if (!rows.length) return <p className="dim">No rows.</p>;
  const cols = Object.keys(rows[0]);
  return (
    <div className="wrap">
      <table>
        <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c}>{cell(c, r[c])}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function Plan({ rows }: { rows: Row[] }) {
  return <pre>{rows.map((r) => String(r['QUERY PLAN'])).join('\n')}</pre>;
}
