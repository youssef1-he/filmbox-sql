-- M13.1 · one entry point to rate a film (M13.2: clear error messages)
CREATE OR REPLACE PROCEDURE noter(p_pseudo TEXT, p_titre TEXT, p_note NUMERIC, INOUT p_moyenne NUMERIC DEFAULT NULL)
LANGUAGE plpgsql AS $$
DECLARE v_membre INT; v_film INT;
BEGIN
  IF p_note IS NULL OR p_note < 0.5 OR p_note > 5 OR p_note * 2 <> ROUND(p_note * 2) THEN
    RAISE EXCEPTION 'Note invalide : % (de 0,5 à 5, par demi-point)', p_note;
  END IF;
  SELECT id INTO v_membre FROM utilisateurs WHERE pseudo = p_pseudo;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membre inconnu : %', p_pseudo; END IF;
  SELECT id INTO v_film FROM films WHERE titre = p_titre;
  IF NOT FOUND THEN RAISE EXCEPTION 'Film inconnu : %', p_titre; END IF;

  PERFORM set_config('app.membre_id', v_membre::text, true);  -- lets the journal RLS policy (M16.2) accept the insert

  UPDATE notes SET note = p_note, note_le = CURRENT_DATE WHERE utilisateur_id = v_membre AND film_id = v_film;
  IF NOT FOUND THEN
    INSERT INTO notes (utilisateur_id, film_id, note, note_le) VALUES (v_membre, v_film, p_note, CURRENT_DATE);
  END IF;
  INSERT INTO journal (utilisateur_id, film_id, date_visionnage) VALUES (v_membre, v_film, CURRENT_DATE);
  SELECT ROUND(AVG(note)::numeric, 2) INTO p_moyenne FROM notes WHERE film_id = v_film;
END;
$$;
-- 009_triggers.sql is reserved: M13.3 (recalculer_stats) and M14 need films_stats / audit_notes (filmbox-s4.sql)
