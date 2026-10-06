'use server';
import { redirect } from 'next/navigation';
import { pool } from '@/lib/db/pool';

const field = (f: FormData, k: string) => String(f.get(k) ?? '');

/** M13: one entry point to rate a film (procedure noter). Database errors are shown as-is. */
export async function noter(form: FormData) {
  let qs: string;
  try {
    const r = await pool.query('CALL noter($1::text, $2::text, $3::numeric, NULL::numeric)',
      [field(form, 'pseudo'), field(form, 'titre'), field(form, 'note')]);
    qs = 'ok=' + encodeURIComponent('Rating saved. New average: ' + r.rows[0].p_moyenne);
  } catch (e) { qs = 'err=' + encodeURIComponent((e as Error).message); }
  redirect('/noter?' + qs);
}

/** M15.2: the increment happens inside the UPDATE, so two simultaneous views are both counted. */
export async function voir(form: FormData) {
  let qs: string;
  try {
    const r = await pool.query('UPDATE films SET nb_vues = nb_vues + 1 WHERE titre = $1 RETURNING nb_vues', [field(form, 'titre')]);
    qs = r.rowCount ? 'ok=' + encodeURIComponent('Views: ' + r.rows[0].nb_vues) : 'err=' + encodeURIComponent('Film inconnu : ' + field(form, 'titre'));
  } catch (e) { qs = 'err=' + encodeURIComponent((e as Error).message); }
  redirect('/noter?' + qs);
}

/** M15.3: a whole evening is saved, or nothing at all. One transaction, ROLLBACK on the first error. */
export async function soiree(form: FormData) {
  const pseudo = field(form, 'pseudo');
  const date = field(form, 'date');
  const titres = field(form, 'titres').split('\n').map((t) => t.trim()).filter(Boolean);
  let qs: string;
  const c = await pool.connect();
  try {
    if (!titres.length) throw new Error('Add at least one film.');
    await c.query('BEGIN');
    const u = await c.query('SELECT id FROM utilisateurs WHERE pseudo = $1', [pseudo]);
    if (!u.rowCount) throw new Error('Membre inconnu : ' + pseudo);
    const id = u.rows[0].id;
    await c.query("SELECT set_config('app.membre_id', $1, true)", [String(id)]);   // journal RLS (M16.2)
    for (const t of titres) {
      const r = await c.query(
        'INSERT INTO journal (utilisateur_id, film_id, date_visionnage) SELECT $1, f.id, $3::date FROM films f WHERE f.titre = $2',
        [id, t, date]);
      if (!r.rowCount) throw new Error('Film inconnu : ' + t);
    }
    await c.query('COMMIT');
    qs = 'ok=' + encodeURIComponent(titres.length + ' viewing(s) saved for ' + pseudo);
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    qs = 'err=' + encodeURIComponent('Nothing was saved. ' + (e as Error).message);
  } finally {
    c.release();
  }
  redirect('/noter?' + qs);
}
