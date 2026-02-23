
CREATE TABLE public.tester_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tester_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (anonymous testers)
CREATE POLICY "Anyone can submit feedback"
  ON public.tester_feedback
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to read feedback (for admin viewing later)
CREATE POLICY "Anyone can read feedback"
  ON public.tester_feedback
  FOR SELECT
  USING (true);
