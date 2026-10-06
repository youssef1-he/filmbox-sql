-- Run once after filmbox.sql:  psql -d filmbox -f setup.sql
CREATE TABLE IF NOT EXISTS listes (
  id             SERIAL PRIMARY KEY,
  utilisateur_id INT  NOT NULL REFERENCES utilisateurs(id),
  titre          TEXT NOT NULL,
  visibilite     TEXT NOT NULL DEFAULT 'privee' CHECK (visibilite IN ('publique', 'privee')),
  cree_le        DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS liste_films (
  liste_id INT NOT NULL REFERENCES listes(id) ON DELETE CASCADE,
  film_id  INT NOT NULL REFERENCES films(id),
  position INT NOT NULL CHECK (position > 0),
  PRIMARY KEY (liste_id, film_id)
);

INSERT INTO listes (utilisateur_id, titre, visibilite)
SELECT id, 'Mon top Nolan', 'publique' FROM utilisateurs WHERE pseudo = 'nolanfan';

INSERT INTO liste_films (liste_id, film_id, position)
SELECT l.id, f.id, v.pos
FROM listes l
CROSS JOIN (VALUES ('The Dark Knight', 1), ('Inception', 2), ('Batman Begins', 3)) AS v(titre, pos)
JOIN films f ON f.titre = v.titre
WHERE l.titre = 'Mon top Nolan';
