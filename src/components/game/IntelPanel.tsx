import React from 'react';
import { LoreDocument, LORE_DOCUMENTS, SECRET_CODES } from '../../game/lore';

interface IntelPanelProps {
  open: boolean;
  onClose: () => void;
  documentsRead: string[];
  codesFound: string[];
  onReadDocument: (doc: LoreDocument) => void;
}

export const IntelPanel: React.FC<IntelPanelProps> = ({ open, onClose, documentsRead, codesFound, onReadDocument }) => {
  if (!open) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-auto z-20">
      <div className="w-[90vw] max-w-md max-h-[80vh] bg-card border border-border rounded overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-display text-lg text-foreground tracking-wider">📂 РАЗВЕДДАННЫЕ</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs font-mono">[✕]</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Documents section */}
          <div className="p-3">
            <h3 className="text-xs font-display text-accent uppercase tracking-wider mb-2">
              ДОКУМЕНТЫ ({documentsRead.length}/{LORE_DOCUMENTS.length})
            </h3>
            <div className="flex flex-col gap-1">
              {LORE_DOCUMENTS.map(doc => {
                const found = documentsRead.includes(doc.id);
                return (
                  <button
                    key={doc.id}
                    className={`flex items-center gap-2 px-2 py-2 rounded-sm text-left transition-colors ${
                      found ? 'hover:bg-secondary/50 cursor-pointer' : 'opacity-40 cursor-default'
                    }`}
                    onClick={() => found && onReadDocument(doc)}
                    disabled={!found}
                  >
                    <span className="text-sm">{found ? '📄' : '❓'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono text-foreground truncate">
                        {found ? doc.title : '???'}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {found ? `${doc.author} — ${doc.date}` : 'Не найден'}
                      </div>
                    </div>
                    {found && doc.hasCode && (
                      <span className="text-[10px] font-mono text-warning">☢</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Codes section */}
          <div className="p-3 border-t border-border">
            <h3 className="text-xs font-display text-warning uppercase tracking-wider mb-2">
              ☢ КОДЫ ({codesFound.length}/{Object.keys(SECRET_CODES).length})
            </h3>
            <div className="flex flex-col gap-1">
              {Object.entries(SECRET_CODES).map(([code, desc]) => {
                const found = codesFound.includes(code);
                return (
                  <div
                    key={code}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-sm ${found ? '' : 'opacity-30'}`}
                  >
                    <span className="text-sm">{found ? '🔓' : '🔒'}</span>
                    <div className="flex-1">
                      <div className={`text-xs font-display tracking-wider ${found ? 'text-warning text-glow-amber' : 'text-muted-foreground'}`}>
                        {found ? code : '?????'}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {found ? desc : '???'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
