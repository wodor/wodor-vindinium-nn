import React, { useState } from 'react';
import { SavedNN } from '../services/nnStorage';
import { PopulationMember } from '../types';
import SavedNNsWidget from './SavedNNsWidget';

interface SavedNNsPanelProps {
  savedNNs: SavedNN[];
  activeAgent?: PopulationMember | null;
  onLoadToArena: (id: string) => void;
  onLoadToHero?: (heroId: number, id: string) => void;
  onDeleteFromLocalStorage: (id: string) => void;
  onEvaluate: (member: PopulationMember, nnId?: string) => void;
  onToggleStar?: (id: string) => void;
  isEvaluating: boolean;
  evaluationResults: { wins: number; avgFitness?: number } | null;
}

const SavedNNsPanel: React.FC<SavedNNsPanelProps> = ({
  savedNNs,
  activeAgent,
  onLoadToArena,
  onLoadToHero,
  onDeleteFromLocalStorage,
  onEvaluate,
  onToggleStar,
  isEvaluating,
  evaluationResults
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={`fixed right-0 top-[57px] h-[calc(100vh-57px)] z-40 transition-all duration-300 ${isExpanded ? 'translate-x-0' : 'translate-x-[calc(100%-3rem)]'}`}>
      <div className={`bg-slate-900/95 backdrop-blur-xl border-l border-white/5 shadow-2xl flex flex-col h-full transition-all duration-300 ${isExpanded ? 'w-96' : 'w-0'} overflow-hidden relative`}>
        {isExpanded && (
          <>
            <div className="p-4 border-b border-white/5 shrink-0">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Saved Networks ({savedNNs.length})
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
              {savedNNs.length === 0 ? (
                <div className="text-center text-slate-600 text-[9px] font-black uppercase tracking-widest mt-8">
                  No saved networks
                </div>
              ) : (
                <SavedNNsWidget
                  savedNNs={savedNNs}
                  activeAgent={activeAgent}
                  onLoadToArena={onLoadToArena}
                  onLoadToHero={onLoadToHero}
                  onDeleteFromLocalStorage={onDeleteFromLocalStorage}
                  onEvaluate={onEvaluate}
                  onToggleStar={onToggleStar}
                  isEvaluating={isEvaluating}
                  evaluationResults={evaluationResults}
                  gridCols="grid-cols-1"
                  hideHeader={true}
                />
              )}
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-0 right-0 w-12 h-12 bg-slate-900/95 backdrop-blur-xl border-l border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              title="Collapse panel"
            >
              <span className="text-lg">→</span>
            </button>
          </>
        )}
      </div>
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-12 h-12 bg-slate-900/95 backdrop-blur-xl border-l border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          title="Expand panel"
        >
          <span className="text-lg">←</span>
        </button>
      )}
    </div>
  );
};

export default SavedNNsPanel;
