
ALTER TABLE public.player_progress
ADD COLUMN xp integer NOT NULL DEFAULT 0,
ADD COLUMN level integer NOT NULL DEFAULT 1;
