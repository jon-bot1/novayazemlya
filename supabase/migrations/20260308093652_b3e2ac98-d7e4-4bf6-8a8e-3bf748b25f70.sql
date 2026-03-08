
-- Use validation trigger instead of CHECK constraints for flexibility
CREATE OR REPLACE FUNCTION public.validate_player_progress()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.rubles < 0 OR NEW.rubles > 500000 THEN
    RAISE EXCEPTION 'rubles out of range: %', NEW.rubles;
  END IF;
  IF NEW.xp < 0 OR NEW.xp > 100000 THEN
    RAISE EXCEPTION 'xp out of range: %', NEW.xp;
  END IF;
  IF NEW.level < 1 OR NEW.level > 50 THEN
    RAISE EXCEPTION 'level out of range: %', NEW.level;
  END IF;
  IF NEW.raid_count < 0 OR NEW.raid_count > 10000 THEN
    RAISE EXCEPTION 'raid_count out of range: %', NEW.raid_count;
  END IF;
  IF NEW.extraction_count < 0 OR NEW.extraction_count > 10000 THEN
    RAISE EXCEPTION 'extraction_count out of range: %', NEW.extraction_count;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_player_progress
  BEFORE INSERT OR UPDATE ON public.player_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_player_progress();
