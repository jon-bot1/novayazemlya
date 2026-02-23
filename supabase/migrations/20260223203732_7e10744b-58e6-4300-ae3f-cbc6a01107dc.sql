
-- Fix 1: Add length constraint on feedback comments
ALTER TABLE public.tester_feedback ADD CONSTRAINT comment_length_check CHECK (length(comment) <= 500);

-- Fix 2: Drop overly permissive read policy, restrict to no public reads
-- Feedback is only needed for admin review, not public display
DROP POLICY "Anyone can read feedback" ON public.tester_feedback;
