
CREATE TABLE public.login_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL UNIQUE,
  current_streak integer NOT NULL DEFAULT 1,
  longest_streak integer NOT NULL DEFAULT 1,
  last_login_date date NOT NULL DEFAULT CURRENT_DATE,
  total_bonus_earned integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read login streaks" ON public.login_streaks FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert login streaks" ON public.login_streaks FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update login streaks" ON public.login_streaks FOR UPDATE TO public USING (true);
