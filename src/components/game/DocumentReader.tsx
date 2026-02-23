import React from 'react';
import { LoreDocument } from '../../game/lore';

interface DocumentReaderProps {
  document: LoreDocument | null;
  onClose: () => void;
}

export const DocumentReader: React.FC<DocumentReaderProps> = ({ document, onClose }) => {
  if (!document) return null;

  const classColors = {
    'OPEN': 'text-foreground/60 border-border',
    'SECRET': 'text-warning border-warning/40',
    'TOP SECRET': 'text-danger border-danger/40',
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/85 backdrop-blur-sm pointer-events-auto z-30">
      <div className="w-[90vw] max-w-lg max-h-[85vh] bg-card border border-border rounded overflow-hidden flex flex-col">
        <div className="flex items-start justify-between px-4 py-3 border-b border-border bg-secondary/30">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-mono px-1.5 py-0.5 border rounded-sm ${classColors[document.classification]}`}>
                {document.classification}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">{document.date}</span>
            </div>
            <h2 className="font-display text-base text-foreground tracking-wider leading-tight">
              {document.title}
            </h2>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
              Author: {document.author}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs font-mono ml-3 mt-1">[✕]</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <pre className="text-xs font-mono text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {document.content}
          </pre>
        </div>

        {document.hasCode && document.code && (
          <div className="px-4 py-2.5 border-t border-border bg-secondary/20">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-warning font-mono">☢ CODE FOUND:</span>
              <span className="text-sm font-display text-warning text-glow-amber tracking-wider">
                {document.code}
              </span>
            </div>
            {document.codeHint && (
              <p className="text-[10px] text-muted-foreground font-mono mt-1 italic">
                {document.codeHint}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
