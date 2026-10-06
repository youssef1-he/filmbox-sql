-- Needs filmbox-s4.sql first (tables films_stats and audit_notes)

-- M13.3 · fill films_stats in batches (COMMIT after every p_lot films)
CREATE OR REPLACE PROCEDURE recalculer_stats(p_lot INTEGER)
LANGUAGE plpgsql AS $$
DECLARE r RECORD; n INTEGER := 0;
BEGIN
  FOR r IN SELECT id FROM films ORDER BY id LOOP
    INSERT INTO films_stats (film_id, nb_notes, moyenne)
    SELECT r.id, COUNT(*), ROUND(AVG(note), 2) FROM notes WHERE film_id = r.id HAVING COUNT(*) > 0
    ON CONFLICT (film_id) DO UPDATE SET nb_notes = EXCLUDED.nb_notes, moyenne = EXCLUDED.moyenne;
    n := n + 1;
    IF n % p_lot = 0 THEN
      COMMIT;
      RAISE NOTICE '% films traités', n;
    END IF;
  END LOOP;
  COMMIT;
END;
$$;

-- M14.1 · films_stats always up to date, whatever application writes the rating
CREATE OR REPLACE FUNCTION maj_stats_film(p_film INTEGER) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO films_stats (film_id, nb_notes, moyenne)
  SELECT p_film, COUNT(*), ROUND(AVG(note), 2) FROM notes WHERE film_id = p_film HAVING COUNT(*) > 0
  ON CONFLICT (film_id) DO UPDATE SET nb_notes = EXCLUDED.nb_notes, moyenne = EXCLUDED.moyenne;
  IF NOT FOUND THEN DELETE FROM films_stats WHERE film_id = p_film; END IF;   -- last rating removed
END;
$$;

CREATE OR REPLACE FUNCTION trg_films_stats() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP <> 'DELETE' THEN PERFORM maj_stats_film(NEW.film_id); END IF;
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.film_id <> NEW.film_id) THEN PERFORM maj_stats_film(OLD.film_id); END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_films_stats ON notes;
CREATE TRIGGER trg_films_stats AFTER INSERT OR UPDATE OR DELETE ON notes
  FOR EACH ROW EXECUTE FUNCTION trg_films_stats();

-- M14.2 · audit only the ratings that really change (WHEN skips a confirmation)
CREATE OR REPLACE FUNCTION trg_audit_notes() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO audit_notes (utilisateur_id, film_id, ancienne, nouvelle)
  VALUES (OLD.utilisateur_id, OLD.film_id, OLD.note, NEW.note);
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_audit_notes ON notes;
CREATE TRIGGER trg_audit_notes AFTER UPDATE ON notes
  FOR EACH ROW WHEN (OLD.note IS DISTINCT FROM NEW.note) EXECUTE FUNCTION trg_audit_notes();

-- initial fill, 10 films at a time (the triggers keep it right afterwards)
CALL recalculer_stats(10);
