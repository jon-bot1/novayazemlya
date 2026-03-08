import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackWidgetProps {
  playerName?: string;
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ playerName }) => {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    if (playerName && (playerName.trim().toLowerCase() === 'test123' || playerName.trim().toLowerCase() === 'test3')) { setSubmitted(true); return; }
    setSubmitting(true);
    try {
      await (supabase as any).from('tester_feedback').insert({
        rating,
        comment: comment.trim() || null,
        player_name: playerName === '__anonymous__' ? 'Anonymous' : (playerName || null),
      });
      setSubmitted(true);
    } catch {
      // silent fail
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="mt-4 p-3 border border-border rounded bg-card/80 text-center">
        <p className="text-sm font-mono text-accent">✓ Thanks for your feedback!</p>
      </div>
    );
  }

  return (
    <div className="mt-4 p-3 border border-border rounded bg-card/80">
      <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">Rate the game</p>
      <div className="flex gap-1 justify-center mb-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            className="text-2xl transition-transform hover:scale-125 focus:outline-none"
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            onClick={() => setRating(star)}
          >
            {star <= (hoveredStar || rating) ? '⭐' : '☆'}
          </button>
        ))}
      </div>
      <textarea
        className="w-full bg-background border border-border rounded p-2 text-xs font-mono text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
        rows={2}
        maxLength={500}
        placeholder="Optional comment..."
        value={comment}
        onChange={e => setComment(e.target.value)}
      />
      <button
        className="mt-2 w-full px-3 py-1.5 bg-primary text-primary-foreground text-xs font-mono uppercase tracking-wider rounded hover:bg-primary/80 transition-colors disabled:opacity-50"
        onClick={handleSubmit}
        disabled={rating === 0 || submitting}
      >
        {submitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </div>
  );
};
