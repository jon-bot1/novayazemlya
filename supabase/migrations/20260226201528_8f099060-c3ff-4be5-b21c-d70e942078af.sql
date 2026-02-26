
-- Player progress table for persistent meta-game loop
CREATE TABLE public.player_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name text NOT NULL UNIQUE,
  rubles integer NOT NULL DEFAULT 0,
  raid_count integer NOT NULL DEFAULT 0,
  extraction_count integer NOT NULL DEFAULT 0,
  stash_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  upgrades jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS: anyone can read/write by player_name (no auth required for this game)
ALTER TABLE public.player_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read player progress"
  ON public.player_progress FOR SELECT USING (true);

CREATE POLICY "Anyone can insert player progress"
  ON public.player_progress FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update player progress"
  ON public.player_progress FOR UPDATE USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_player_progress_updated_at
  BEFORE UPDATE ON public.player_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
