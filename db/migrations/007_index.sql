-- M12.1 · profile page: the 20 latest viewings of a member, already sorted
CREATE INDEX IF NOT EXISTS idx_journal_profil ON journal (utilisateur_id, date_visionnage DESC) INCLUDE (film_id);
-- M12.2 · trends: works with a date range (not with TO_CHAR(date_visionnage, 'YYYY-MM'))
CREATE INDEX IF NOT EXISTS idx_journal_date ON journal (date_visionnage) INCLUDE (film_id);
-- M12.3 · title search with ILIKE '%text%': trigram index
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_films_titre_trgm ON films USING gin (titre gin_trgm_ops);
