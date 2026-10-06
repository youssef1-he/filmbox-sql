-- Needs filmbox-s5.sql first (journal.prive, films.nb_vues)

-- M16.1 · application account: least privilege
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'filmbox_app') THEN CREATE ROLE filmbox_app NOLOGIN; END IF;
END $$;
GRANT USAGE ON SCHEMA public TO filmbox_app;
GRANT SELECT ON films, utilisateurs, notes, journal TO filmbox_app;
GRANT INSERT, UPDATE ON notes, journal TO filmbox_app;
GRANT UPDATE (nb_vues) ON films TO filmbox_app;          -- M15: the view counter, nothing else on films
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO filmbox_app;

-- M16.2 · private journal entries, enforced by the database (member id comes from app.membre_id)
ALTER TABLE journal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS journal_lecture ON journal;
DROP POLICY IF EXISTS journal_insertion ON journal;
DROP POLICY IF EXISTS journal_modification ON journal;
CREATE POLICY journal_lecture ON journal FOR SELECT TO filmbox_app
  USING (NOT prive OR utilisateur_id = NULLIF(current_setting('app.membre_id', true), '')::int);
CREATE POLICY journal_insertion ON journal FOR INSERT TO filmbox_app
  WITH CHECK (utilisateur_id = NULLIF(current_setting('app.membre_id', true), '')::int);
CREATE POLICY journal_modification ON journal FOR UPDATE TO filmbox_app
  USING (utilisateur_id = NULLIF(current_setting('app.membre_id', true), '')::int)
  WITH CHECK (utilisateur_id = NULLIF(current_setting('app.membre_id', true), '')::int);

-- M16.3 · search safe from injection: static SQL, the text is only ever a value
CREATE OR REPLACE FUNCTION rechercher_films(p_texte TEXT) RETURNS TABLE (titre TEXT, annee INT)
LANGUAGE sql STABLE AS $$
  SELECT f.titre::text, f.annee::int FROM films f
  WHERE f.titre ILIKE '%' || replace(replace(replace(p_texte, '\', '\\'), '%', '\%'), '_', '\_') || '%'
  ORDER BY f.annee, f.titre LIMIT 5;
$$;
