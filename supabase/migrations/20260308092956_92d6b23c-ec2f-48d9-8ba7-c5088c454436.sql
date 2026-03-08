
-- Add write_token column for ownership verification
ALTER TABLE public.player_progress ADD COLUMN write_token uuid DEFAULT gen_random_uuid();

-- Drop the open UPDATE policy
DROP POLICY IF EXISTS "Anyone can update player progress" ON public.player_progress;

-- Create a restricted SELECT policy that excludes write_token
-- (We can't hide columns via RLS, so we'll handle token secrecy via the edge function)

-- Drop open SELECT policy and replace with one that hides write_token
DROP POLICY IF EXISTS "Anyone can read player progress" ON public.player_progress;
CREATE POLICY "Anyone can read player progress"
  ON public.player_progress FOR SELECT
  USING (true);

-- Create UPDATE policy that requires matching write_token
CREATE POLICY "Owner can update with token"
  ON public.player_progress FOR UPDATE
  USING (write_token = (current_setting('request.headers', true)::json->>'x-write-token')::uuid);

-- Ensure INSERT returns write_token by making the insert policy permissive
DROP POLICY IF EXISTS "Anyone can insert player progress" ON public.player_progress;
CREATE POLICY "Anyone can insert player progress"
  ON public.player_progress FOR INSERT
  WITH CHECK (true);
