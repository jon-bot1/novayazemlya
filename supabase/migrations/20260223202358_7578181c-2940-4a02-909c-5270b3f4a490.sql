
CREATE TABLE public.highscores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL,
  kills INTEGER NOT NULL DEFAULT 0,
  time_seconds NUMERIC NOT NULL DEFAULT 0,
  result TEXT NOT NULL DEFAULT 'failed',
  loot_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.highscores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert highscores"
  ON public.highscores FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read highscores"
  ON public.highscores FOR SELECT USING (true);
