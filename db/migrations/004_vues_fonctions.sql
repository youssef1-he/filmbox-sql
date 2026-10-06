-- À lancer UNE fois, après filmbox-s2.sql :  psql -p 5431 -d filmbox -f setup-s2.sql

-- M9.1 · fiche film
CREATE OR REPLACE VIEW v_fiche_film AS
SELECT f.id, f.titre, f.annee, f.genre,
  (SELECT STRING_AGG(p.nom, ', ' ORDER BY p.nom)
     FROM casting c JOIN personnes p ON p.id = c.personne_id
    WHERE c.film_id = f.id AND c.role = 'realisateur') AS realisateurs,
  (f.details->>'duree')::int AS duree_min,
  (SELECT COUNT(*) FROM notes n WHERE n.film_id = f.id) AS nb_notes,
  (SELECT ROUND(AVG(n.note)::numeric, 2) FROM notes n WHERE n.film_id = f.id) AS moyenne
FROM films f;

-- M9.2 · cache des statistiques (l'index unique permet REFRESH ... CONCURRENTLY)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_stats_films AS
SELECT f.id AS film_id, f.titre, COUNT(n.film_id) AS nb_notes, ROUND(AVG(n.note)::numeric, 2) AS moyenne
FROM films f LEFT JOIN notes n ON n.film_id = f.id
GROUP BY f.id, f.titre;
CREATE UNIQUE INDEX IF NOT EXISTS mv_stats_films_pk ON mv_stats_films (film_id);

-- M9.3 · vitrine science-fiction
CREATE OR REPLACE VIEW v_films_sf AS
SELECT * FROM films WHERE genre = 'Science-fiction'
WITH CHECK OPTION;

-- M10.1 · durée lisible
CREATE OR REPLACE FUNCTION duree_texte(minutes INT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT (minutes / 60) || ' h ' || LPAD((minutes % 60)::text, 2, '0');
$$;

-- M10.2 · note pondérée (formule du Top 250 d'IMDb)
CREATE OR REPLACE FUNCTION note_ponderee(p_film_id INT, m INT DEFAULT 5) RETURNS NUMERIC
LANGUAGE plpgsql STABLE AS $$
DECLARE v INT; r NUMERIC; c NUMERIC;
BEGIN
  SELECT COUNT(*), AVG(note) INTO v, r FROM notes WHERE film_id = p_film_id;
  IF v = 0 THEN
    RAISE EXCEPTION 'Le film % n''a aucune note', p_film_id;
  END IF;
  SELECT AVG(note) INTO c FROM notes;
  RETURN ROUND((v::numeric / (v + m)) * r + (m::numeric / (v + m)) * c, 2);
END;
$$;

-- M10.3 · compatibilité entre deux membres
CREATE OR REPLACE FUNCTION compatibilite(pseudo_a TEXT, pseudo_b TEXT)
RETURNS TABLE (titre TEXT, note_a NUMERIC, note_b NUMERIC, ecart NUMERIC)
LANGUAGE sql STABLE AS $$
  SELECT f.titre::text, na.note::numeric, nb.note::numeric, ABS(na.note - nb.note)::numeric
  FROM utilisateurs ua
  JOIN notes na ON na.utilisateur_id = ua.id
  JOIN notes nb ON nb.film_id = na.film_id
  JOIN utilisateurs ub ON ub.id = nb.utilisateur_id
  JOIN films f ON f.id = na.film_id
  WHERE ua.pseudo = pseudo_a AND ub.pseudo = pseudo_b
  ORDER BY ABS(na.note - nb.note) DESC, f.titre;
$$;
