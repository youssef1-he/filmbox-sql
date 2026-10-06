// Every query is parameterized: the browser can only pick an id and one value ($1),
// never send raw SQL.
const queries = [
  { id: 'm1-1', mission: 'M1 · Getting started', title: 'Columns of a table',
    param: { label: 'Table', default: 'casting' },
    sql: `SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = $1
ORDER BY ordinal_position;` },
  { id: 'm1-4', mission: 'M1 · Getting started', title: 'A member list',
    param: { label: 'List title', default: 'Mon top Nolan' },
    sql: `SELECT l.titre AS liste, lf.position, f.titre AS film
FROM listes l
JOIN liste_films lf ON lf.liste_id = l.id
JOIN films f ON f.id = lf.film_id
WHERE l.titre = $1
ORDER BY lf.position;` },

  { id: 'm2-1', mission: 'M2 · Catalogue', title: 'Films from 2000 to 2010',
    sql: `SELECT titre, annee, genre
FROM films
WHERE annee BETWEEN 2000 AND 2010
ORDER BY annee, titre;` },
  { id: 'm2-2', mission: 'M2 · Catalogue', title: 'Filmography of an actor',
    param: { label: 'Actor', default: 'Kevin Bacon' },
    sql: `SELECT f.titre, f.annee
FROM films f
JOIN casting c ON c.film_id = f.id AND c.role = 'acteur'
JOIN personnes p ON p.id = c.personne_id
WHERE p.nom = $1
ORDER BY f.annee;` },
  { id: 'm2-3', mission: 'M2 · Catalogue', title: 'Prolific directors',
    sql: `SELECT p.nom AS realisateur, COUNT(*) AS nb_films
FROM casting c
JOIN personnes p ON p.id = c.personne_id
WHERE c.role = 'realisateur'
GROUP BY p.id, p.nom
HAVING COUNT(*) >= 2
ORDER BY nb_films DESC, p.nom;` },
  { id: 'm2-4', mission: 'M2 · Catalogue', title: 'Top 5 rated films (5+ ratings)',
    sql: `SELECT f.titre, ROUND(AVG(n.note)::numeric, 2) AS moyenne, COUNT(*) AS nb_notes
FROM films f
JOIN notes n ON n.film_id = f.id
GROUP BY f.id, f.titre
HAVING COUNT(*) >= 5
ORDER BY moyenne DESC, f.titre
LIMIT 5;` },
  { id: 'm2-5', mission: 'M2 · Catalogue', title: 'Most active members',
    sql: `SELECT u.pseudo, COUNT(*) AS nb_visionnages,
       COUNT(DISTINCT j.film_id) AS nb_films_distincts
FROM utilisateurs u
JOIN journal j ON j.utilisateur_id = u.id
GROUP BY u.id, u.pseudo
ORDER BY nb_visionnages DESC, u.pseudo;` },

  { id: 'm3-1', mission: 'M3 · Member profile', title: 'Profile card (one CTE per fact)',
    param: { label: 'Member', default: 'cinephile_92' },
    sql: `WITH u AS (
  SELECT id, pseudo FROM utilisateurs WHERE pseudo = $1
), stats AS (
  SELECT n.utilisateur_id, COUNT(*) AS nb_films_notes,
         ROUND(AVG(n.note)::numeric, 2) AS note_moyenne
  FROM notes n JOIN u ON u.id = n.utilisateur_id
  GROUP BY n.utilisateur_id
), genre AS (
  SELECT f.genre FROM notes n
  JOIN u ON u.id = n.utilisateur_id JOIN films f ON f.id = n.film_id
  GROUP BY f.genre ORDER BY COUNT(*) DESC, f.genre LIMIT 1
), coeur AS (
  SELECT f.titre FROM notes n
  JOIN u ON u.id = n.utilisateur_id JOIN films f ON f.id = n.film_id
  ORDER BY n.note DESC, n.note_le, f.titre LIMIT 1
)
SELECT u.pseudo, s.nb_films_notes, s.note_moyenne,
       g.genre AS genre_prefere, c.titre AS coup_de_coeur
FROM u
JOIN stats s ON s.utilisateur_id = u.id
CROSS JOIN genre g CROSS JOIN coeur c;` },
  { id: 'm3-2', mission: 'M3 · Member profile', title: 'Up next (not yet watched)',
    param: { label: 'Member', default: 'cinephile_92' },
    sql: `SELECT f.titre, f.annee
FROM films f
WHERE NOT EXISTS (
  SELECT 1 FROM journal j
  JOIN utilisateurs u ON u.id = j.utilisateur_id
  WHERE u.pseudo = $1 AND j.film_id = f.id
)
ORDER BY f.annee DESC, f.titre;` },
  { id: 'm3-3', mission: 'M3 · Member profile', title: 'Most divisive films',
    sql: `SELECT f.titre, MIN(n.note) AS pire, MAX(n.note) AS meilleure,
       MAX(n.note) - MIN(n.note) AS ecart
FROM films f
JOIN notes n ON n.film_id = f.id
GROUP BY f.id, f.titre
ORDER BY ecart DESC, f.titre
LIMIT 5;` },

  { id: 'm4-1', mission: 'M4 · Sagas & Bacon', title: 'Episodes of one saga',
    param: { label: 'Saga', default: 'Retour vers le futur' },
    sql: `WITH RECURSIVE ep AS (
  SELECT f.id, f.titre, f.annee, 1 AS episode
  FROM films f JOIN sagas s ON s.id = f.saga_id
  WHERE s.nom = $1 AND f.film_precedent_id IS NULL
  UNION ALL
  SELECT f.id, f.titre, f.annee, ep.episode + 1
  FROM films f JOIN ep ON f.film_precedent_id = ep.id
)
SELECT episode, titre, annee FROM ep ORDER BY episode;` },
  { id: 'm4-2', mission: 'M4 · Sagas & Bacon', title: 'All sagas with full path',
    sql: `WITH RECURSIVE ep AS (
  SELECT f.id, f.saga_id, 1 AS episode, f.titre::text AS parcours
  FROM films f
  WHERE f.saga_id IS NOT NULL AND f.film_precedent_id IS NULL
  UNION ALL
  SELECT f.id, f.saga_id, ep.episode + 1, ep.parcours || ' → ' || f.titre
  FROM films f JOIN ep ON f.film_precedent_id = ep.id
)
SELECT s.nom AS saga, ep.episode, ep.parcours
FROM ep JOIN sagas s ON s.id = ep.saga_id
ORDER BY s.nom, ep.episode;` },
  { id: 'm4-3', mission: 'M4 · Sagas & Bacon', title: 'Bacon number (farthest actors)',
    sql: `WITH RECURSIVE reseau AS (
  SELECT id AS personne_id, 0 AS degre FROM personnes WHERE nom = 'Kevin Bacon'
  UNION ALL
  SELECT c2.personne_id, r.degre + 1
  FROM reseau r
  JOIN casting c1 ON c1.personne_id = r.personne_id AND c1.role = 'acteur'
  JOIN casting c2 ON c2.film_id = c1.film_id AND c2.role = 'acteur'
                 AND c2.personne_id <> c1.personne_id
  WHERE r.degre < 4
)
SELECT p.nom, MIN(r.degre) AS nombre_de_bacon
FROM reseau r JOIN personnes p ON p.id = r.personne_id
WHERE p.nom <> 'Kevin Bacon'
GROUP BY p.id, p.nom
ORDER BY nombre_de_bacon DESC, p.nom
LIMIT 8;` },
  { id: 'm4-4', mission: 'M4 · Sagas & Bacon', title: 'Shortest path from Kevin Bacon',
    param: { label: 'Actor', default: 'Omar Sy' },
    sql: `WITH RECURSIVE walk AS (
  SELECT p.id AS personne_id, 0 AS degre, p.nom::text AS chemin, ARRAY[p.id] AS vus
  FROM personnes p WHERE p.nom = 'Kevin Bacon'
  UNION ALL
  SELECT c2.personne_id, w.degre + 1,
         w.chemin || ' — ' || f.titre || ' — ' || p2.nom, w.vus || c2.personne_id
  FROM walk w
  JOIN casting c1 ON c1.personne_id = w.personne_id AND c1.role = 'acteur'
  JOIN casting c2 ON c2.film_id = c1.film_id AND c2.role = 'acteur'
                 AND c2.personne_id <> c1.personne_id
  JOIN films f ON f.id = c1.film_id
  JOIN personnes p2 ON p2.id = c2.personne_id
  WHERE NOT c2.personne_id = ANY(w.vus) AND w.degre < 6
)
SELECT w.degre, w.chemin
FROM walk w JOIN personnes p ON p.id = w.personne_id
WHERE p.nom = $1
ORDER BY w.degre, w.chemin
LIMIT 1;` },
  { id: 'm4-5', mission: 'M4 · Sagas & Bacon', title: 'Actors unreachable from Bacon',
    sql: `WITH RECURSIVE reseau AS (
  SELECT id AS personne_id FROM personnes WHERE nom = 'Kevin Bacon'
  UNION  -- UNION (not UNION ALL) drops duplicates, so cycles stop
  SELECT c2.personne_id
  FROM reseau r
  JOIN casting c1 ON c1.personne_id = r.personne_id AND c1.role = 'acteur'
  JOIN casting c2 ON c2.film_id = c1.film_id AND c2.role = 'acteur'
)
SELECT p.nom
FROM personnes p
WHERE p.id IN (SELECT personne_id FROM casting WHERE role = 'acteur')
  AND p.id NOT IN (SELECT personne_id FROM reseau)
ORDER BY p.nom;` },

  { id: 'm5-1', mission: 'M5 · Rankings', title: 'Top 3 per genre (3+ ratings)',
    sql: `WITH moy AS (
  SELECT f.genre, f.titre, ROUND(AVG(n.note)::numeric, 2) AS moyenne
  FROM films f JOIN notes n ON n.film_id = f.id
  GROUP BY f.id, f.genre, f.titre
  HAVING COUNT(*) >= 3
), classes AS (
  SELECT genre, titre, moyenne,
         ROW_NUMBER() OVER (PARTITION BY genre ORDER BY moyenne DESC, titre) AS rang
  FROM moy
)
SELECT genre, rang, titre, moyenne
FROM classes WHERE rang <= 3
ORDER BY genre, rang;` },
  { id: 'm5-2', mission: 'M5 · Rankings', title: 'Director ranking (DENSE_RANK)',
    sql: `SELECT DENSE_RANK() OVER (ORDER BY ROUND(AVG(n.note)::numeric, 2) DESC) AS rang,
       p.nom AS realisateur,
       ROUND(AVG(n.note)::numeric, 2) AS moyenne,
       COUNT(*) AS nb_notes
FROM personnes p
JOIN casting c ON c.personne_id = p.id AND c.role = 'realisateur'
JOIN notes n ON n.film_id = c.film_id
GROUP BY p.id, p.nom
ORDER BY rang, p.nom
LIMIT 10;` },
  { id: 'm5-3', mission: 'M5 · Rankings', title: "Each member's favourite film",
    sql: `SELECT DISTINCT ON (u.pseudo) u.pseudo, f.titre, n.note, n.note_le
FROM notes n
JOIN utilisateurs u ON u.id = n.utilisateur_id
JOIN films f ON f.id = n.film_id
ORDER BY u.pseudo, n.note DESC, n.note_le;` },
  { id: 'm5-4', mission: 'M5 · Rankings', title: 'Best episode of each saga',
    sql: `WITH moy AS (
  SELECT s.nom AS saga, f.titre, ROUND(AVG(n.note)::numeric, 2) AS moyenne
  FROM sagas s
  JOIN films f ON f.saga_id = s.id
  JOIN notes n ON n.film_id = f.id
  GROUP BY s.nom, f.id, f.titre
)
SELECT saga, titre, moyenne,
       DENSE_RANK() OVER (PARTITION BY saga ORDER BY moyenne DESC) AS rang_dans_saga
FROM moy
ORDER BY saga, rang_dans_saga, titre;` },

  { id: 'm6-1', mission: 'M6 · My cinema season', title: 'Cumulative viewings per month',
    param: { label: 'Member', default: 'cinephile_92' },
    sql: `SELECT TO_CHAR(DATE_TRUNC('month', j.date_visionnage), 'YYYY-MM') AS mois,
       COUNT(*) AS nb,
       SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', j.date_visionnage))::int AS cumul
FROM journal j
JOIN utilisateurs u ON u.id = j.utilisateur_id
WHERE u.pseudo = $1
GROUP BY DATE_TRUNC('month', j.date_visionnage)
ORDER BY 1;` },
  { id: 'm6-2', mission: 'M6 · My cinema season', title: 'Running average of a film',
    param: { label: 'Film', default: 'Inception' },
    sql: `SELECT n.note_le, u.pseudo, n.note,
       ROUND((AVG(n.note) OVER (ORDER BY n.note_le, u.pseudo))::numeric, 2) AS moyenne_cumulee
FROM notes n
JOIN films f ON f.id = n.film_id
JOIN utilisateurs u ON u.id = n.utilisateur_id
WHERE f.titre = $1
ORDER BY n.note_le, u.pseudo;` },
  { id: 'm6-3', mission: 'M6 · My cinema season', title: 'Harsher than average?',
    param: { label: 'Member', default: 'nolanfan' },
    sql: `WITH tous AS (
  SELECT n.*, AVG(n.note) OVER (PARTITION BY n.film_id) AS moyenne_film
  FROM notes n
)
SELECT u.pseudo, f.titre, t.note,
       ROUND(t.moyenne_film::numeric, 2) AS moyenne_film,
       ROUND((t.note - t.moyenne_film)::numeric, 2) AS ecart
FROM tous t
JOIN utilisateurs u ON u.id = t.utilisateur_id
JOIN films f ON f.id = t.film_id
WHERE u.pseudo = $1
ORDER BY ecart DESC, f.titre;` },
  { id: 'm6-4', mission: 'M6 · My cinema season', title: 'Days between viewings',
    param: { label: 'Member', default: 'cinephile_92' },
    sql: `SELECT j.date_visionnage, f.titre,
       j.date_visionnage - LAG(j.date_visionnage) OVER (ORDER BY j.date_visionnage, j.id)
         AS jours_depuis_precedent
FROM journal j
JOIN utilisateurs u ON u.id = j.utilisateur_id
JOIN films f ON f.id = j.film_id
WHERE u.pseudo = $1
ORDER BY j.date_visionnage, j.id;` },

  { id: 'm7-1', mission: 'M7 · Dashboard', title: 'Favourites and disappointments by genre',
    sql: `SELECT f.genre, COUNT(*) AS nb_notes,
       COUNT(*) FILTER (WHERE n.note >= 4.5) AS coups_de_coeur,
       COUNT(*) FILTER (WHERE n.note <= 2.5) AS deceptions
FROM notes n JOIN films f ON f.id = n.film_id
GROUP BY f.genre
ORDER BY nb_notes DESC, f.genre;` },
  { id: 'm7-2', mission: 'M7 · Dashboard', title: 'Sci-fi average vs overall average',
    sql: `SELECT u.pseudo,
       ROUND((AVG(n.note) FILTER (WHERE f.genre = 'Science-fiction'))::numeric, 2) AS moyenne_sf,
       ROUND(AVG(n.note)::numeric, 2) AS moyenne_globale
FROM utilisateurs u
JOIN notes n ON n.utilisateur_id = u.id
JOIN films f ON f.id = n.film_id
GROUP BY u.id, u.pseudo
ORDER BY moyenne_sf DESC NULLS LAST, u.pseudo;` },
  { id: 'm7-3', mission: 'M7 · Dashboard', title: 'Viewings per genre and quarter (ROLLUP)',
    sql: `SELECT COALESCE(f.genre, 'TOTAL') AS genre,
       COALESCE('T' || EXTRACT(QUARTER FROM j.date_visionnage)::int, 'Année') AS trimestre,
       COUNT(*) AS visionnages
FROM journal j JOIN films f ON f.id = j.film_id
WHERE EXTRACT(YEAR FROM j.date_visionnage) = 2026
GROUP BY ROLLUP (f.genre, EXTRACT(QUARTER FROM j.date_visionnage))
ORDER BY f.genre NULLS LAST, EXTRACT(QUARTER FROM j.date_visionnage) NULLS LAST;` },

  { id: 'm8-1', mission: 'M8 · Film sheet', title: 'Epic films (> 2 h 30)',
    sql: `SELECT titre, (details->>'duree')::int AS duree_min,
       duree_texte((details->>'duree')::int) AS duree
FROM films
WHERE (details->>'duree')::int > 150
ORDER BY duree_min DESC, titre;` },
  { id: 'm8-2', mission: 'M8 · Film sheet', title: 'Best Picture winners',
    sql: `SELECT f.titre, f.annee, STRING_AGG(p.nom, ', ' ORDER BY p.nom) AS realisateur
FROM films f
JOIN casting c ON c.film_id = f.id AND c.role = 'realisateur'
JOIN personnes p ON p.id = c.personne_id
WHERE f.details @> '{"oscar_meilleur_film": true}'
GROUP BY f.id, f.titre, f.annee
ORDER BY f.annee;` },
  { id: 'm8-3', mission: 'M8 · Film sheet', title: 'Most used tags',
    sql: `SELECT tag, COUNT(*) AS nb_films
FROM films f, jsonb_array_elements_text(f.details->'tags') AS tag
GROUP BY tag
ORDER BY nb_films DESC, tag
LIMIT 5;` },
  { id: 'm8-4', mission: 'M8 · Film sheet', title: 'Activity feed (2 latest per member)',
    sql: `SELECT pseudo, titre, date_visionnage FROM (
  SELECT u.pseudo, f.titre, j.date_visionnage,
         ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY j.date_visionnage DESC, j.id DESC) AS rn
  FROM journal j
  JOIN utilisateurs u ON u.id = j.utilisateur_id
  JOIN films f ON f.id = j.film_id
) x
WHERE rn <= 2
ORDER BY pseudo, date_visionnage DESC;` },

  { id: 'm9-1', mission: 'M9 · Views & cache', title: 'Film cards of a genre (view)',
    param: { label: 'Genre', default: 'Science-fiction' },
    sql: `SELECT titre, annee, realisateurs, duree_min, nb_notes, moyenne
FROM v_fiche_film
WHERE genre = $1
ORDER BY moyenne DESC NULLS LAST, titre;` },
  { id: 'fiche', mission: 'M9 · Views & cache', title: 'Full film sheet',
    param: { label: 'Film', default: 'Inception' },
    sql: `SELECT v.annee, v.genre, v.realisateurs, v.duree_min, duree_texte(v.duree_min) AS duree,
       v.nb_notes, v.moyenne,
       CASE WHEN v.nb_notes > 0 THEN note_ponderee(v.id) END AS ponderee,
       f.details->>'langue' AS langue, f.details->'pays' AS pays, f.details->'tags' AS tags
FROM v_fiche_film v JOIN films f ON f.id = v.id
WHERE v.titre = $1;` },
  { id: 'm9-2-live', mission: 'M9 · Views & cache', title: 'Live stats of a film',
    param: { label: 'Film', default: 'Inception' },
    sql: `SELECT titre, nb_notes, moyenne FROM v_fiche_film WHERE titre = $1;` },
  { id: 'm9-2-cache', mission: 'M9 · Views & cache', title: 'Cached stats of a film',
    param: { label: 'Film', default: 'Inception' },
    sql: `SELECT titre, nb_notes, moyenne FROM mv_stats_films WHERE titre = $1;` },

  { id: 'm10-2', mission: 'M10 · Weighted rating', title: 'Raw vs weighted ranking',
    param: { label: 'Vote threshold m', default: '5' },
    sql: `WITH s AS (
  SELECT f.id, f.titre, COUNT(*) AS nb_notes,
         ROUND(AVG(n.note)::numeric, 2) AS moyenne,
         note_ponderee(f.id, $1::int) AS note_ponderee
  FROM films f JOIN notes n ON n.film_id = f.id
  GROUP BY f.id, f.titre
)
SELECT titre, nb_notes, moyenne,
       DENSE_RANK() OVER (ORDER BY moyenne DESC) AS rang_brut,
       note_ponderee,
       DENSE_RANK() OVER (ORDER BY note_ponderee DESC) AS rang_pondere
FROM s
ORDER BY rang_pondere, titre
LIMIT 10;` },
  { id: 'm10-3', mission: 'M10 · Weighted rating', title: 'Films rated by both members',
    param: { label: 'Member A', default: 'cinephile_92' }, param2: { label: 'Member B', default: 'nolanfan' },
    sql: `SELECT titre, note_a, note_b, ecart FROM compatibilite($1, $2) ORDER BY ecart DESC, titre;` },
  { id: 'm10-3b', mission: 'M10 · Weighted rating', title: 'Compatibility summary',
    param: { label: 'Member A', default: 'cinephile_92' }, param2: { label: 'Member B', default: 'nolanfan' },
    sql: `SELECT COUNT(*) AS films_communs, ROUND(AVG(ecart), 2) AS ecart_moyen FROM compatibilite($1, $2);` },

  // EXPLAIN queries use fixed values on purpose (nothing typed by the visitor reaches them).
  { id: 'm11-1', mission: 'M11 · Diagnostic', title: 'Plan: profile page',
    sql: `EXPLAIN (ANALYZE, BUFFERS)
SELECT f.titre, j.date_visionnage
FROM journal j JOIN films f ON f.id = j.film_id
WHERE j.utilisateur_id = (SELECT id FROM utilisateurs WHERE pseudo = 'membre_4242')
ORDER BY j.date_visionnage DESC LIMIT 20` },
  { id: 'm11-2', mission: 'M11 · Diagnostic', title: 'Plan: trends with TO_CHAR',
    sql: `EXPLAIN (ANALYZE, BUFFERS)
SELECT film_id, COUNT(*) AS vues FROM journal
WHERE TO_CHAR(date_visionnage, 'YYYY-MM') = '2026-08'
GROUP BY film_id ORDER BY vues DESC LIMIT 5` },
  { id: 'm11-3', mission: 'M11 · Diagnostic', title: 'Plan: planner estimate',
    sql: `EXPLAIN (ANALYZE) SELECT COUNT(*) FROM films WHERE genre = 'Science-fiction'` },
  { id: 'm11-3b', mission: 'M11 · Diagnostic', title: 'pg_stats for genre',
    sql: `SELECT most_common_vals, most_common_freqs FROM pg_stats WHERE tablename = 'films' AND attname = 'genre'` },
  { id: 'm12-2', mission: 'M12 · Optimisation', title: 'Plan: trends with a date range',
    sql: `EXPLAIN (ANALYZE, BUFFERS)
SELECT film_id, COUNT(*) AS vues FROM journal
WHERE date_visionnage >= '2026-08-01' AND date_visionnage < '2026-09-01'
GROUP BY film_id ORDER BY vues DESC LIMIT 5` },
  { id: 'm12-2b', mission: 'M12 · Optimisation', title: 'Both versions count the same rows',
    sql: `SELECT (SELECT COUNT(*) FROM journal WHERE TO_CHAR(date_visionnage, 'YYYY-MM') = '2026-08') AS version_origine,
       (SELECT COUNT(*) FROM journal WHERE date_visionnage >= '2026-08-01' AND date_visionnage < '2026-09-01') AS version_optimisee` },
  { id: 'm12-3', mission: 'M12 · Optimisation', title: 'Plan: title search',
    sql: `EXPLAIN (ANALYZE, BUFFERS) SELECT COUNT(*) FROM films WHERE titre ILIKE '%labyrinthe%'` },
  { id: 'm12-4', mission: 'M12 · Optimisation', title: 'Index report',
    sql: `SELECT t.relname AS table_cible, i.relname AS index,
       pg_size_pretty(pg_relation_size(i.oid)) AS taille_index,
       pg_size_pretty(pg_relation_size(t.oid)) AS taille_table
FROM pg_index x
JOIN pg_class i ON i.oid = x.indexrelid
JOIN pg_class t ON t.oid = x.indrelid
WHERE t.relname IN ('journal', 'films')
ORDER BY t.relname, i.relname` },

  { id: 'm14-1', mission: 'M14 · Triggers', title: 'films_stats (kept up to date by a trigger)',
    sql: `SELECT f.titre, s.nb_notes, s.moyenne
FROM films_stats s JOIN films f ON f.id = s.film_id
ORDER BY s.moyenne DESC, f.titre
LIMIT 10;` },
  { id: 'm14-2', mission: 'M14 · Triggers', title: 'Audit of changed ratings',
    sql: `SELECT u.pseudo, f.titre, a.ancienne, a.nouvelle, a.le
FROM audit_notes a
JOIN utilisateurs u ON u.id = a.utilisateur_id
JOIN films f ON f.id = a.film_id
ORDER BY a.le DESC, a.id DESC
LIMIT 10;` },
  { id: 'm14-3', mission: 'M14 · Triggers', title: 'Consistency check films_stats vs notes',
    sql: `SELECT COUNT(*) AS films_incoherents
FROM films f
LEFT JOIN films_stats s ON s.film_id = f.id
LEFT JOIN (SELECT film_id, COUNT(*) AS nb, ROUND(AVG(note), 2) AS moy FROM notes GROUP BY film_id) n ON n.film_id = f.id
WHERE COALESCE(s.nb_notes, 0) <> COALESCE(n.nb, 0) OR s.moyenne IS DISTINCT FROM n.moy;` },

  { id: 'm16-3', mission: 'M16 · Security', title: 'Injection-safe title search',
    param: { label: 'Text', default: 'dark' },
    sql: `SELECT titre, annee FROM rechercher_films($1)` },
];

// Write operations the browser may trigger. Same rule as queries: it sends an id + values, never SQL.
// "rollback: true" runs the statement and always cancels it (used to test the view's CHECK OPTION).
const actions = {
  rate: { args: 3, sql: `WITH t AS (
  SELECT u.id AS uid, f.id AS fid FROM utilisateurs u, films f WHERE u.pseudo = $1 AND f.titre = $2
), upd AS (
  UPDATE notes n SET note = $3::numeric, note_le = CURRENT_DATE
  FROM t WHERE n.utilisateur_id = t.uid AND n.film_id = t.fid RETURNING 1
), ins AS (
  INSERT INTO notes (utilisateur_id, film_id, note, note_le)
  SELECT uid, fid, $3::numeric, CURRENT_DATE FROM t WHERE NOT EXISTS (SELECT 1 FROM upd)
  RETURNING 1
)
SELECT (SELECT COUNT(*) FROM upd) + (SELECT COUNT(*) FROM ins) AS saved` },
  refresh: { args: 0, sql: `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stats_films` },
  guard: { args: 1, rollback: true, sql: `UPDATE v_films_sf SET genre = 'Action' WHERE titre = $1` },
};

module.exports = { queries, actions };
