
CREATE TABLE public.active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL,
  map_id text NOT NULL DEFAULT 'objekt47',
  hp integer NOT NULL DEFAULT 100,
  max_hp integer NOT NULL DEFAULT 100,
  kills integer NOT NULL DEFAULT 0,
  rubles integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  position_x real NOT NULL DEFAULT 0,
  position_y real NOT NULL DEFAULT 0,
  enemies_alive integer NOT NULL DEFAULT 0,
  time_elapsed real NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'playing',
  last_heartbeat timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(player_name)
);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active sessions" ON public.active_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert active sessions" ON public.active_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update active sessions" ON public.active_sessions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete active sessions" ON public.active_sessions FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;
