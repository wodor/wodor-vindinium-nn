import React from 'react';
import { SavedNN } from '../services/nnStorage';
import { PopulationMember } from '../types';

const calculateTrainingCost = (member: PopulationMember): number => {
  const games = member.gamesPlayed ?? 0;
  const config = member.config;
  if (!config) return 0;
  const nodes = config.hiddenSize ?? 0;
  const layers = config.numLayers ?? 0;
  return games * nodes * layers;
};

interface SavedNNsWidgetProps {
  savedNNs: SavedNN[];
  activeAgent?: PopulationMember | null;
  onLoadToArena: (id: string) => void;
  onLoadToHero?: (heroId: number, id: string) => void;
  onDeleteFromLocalStorage: (id: string) => void;
  onEvaluate: (member: PopulationMember, nnId?: string) => void;
  onLoadToTraining?: (id: string) => void;
  onToggleStar?: (id: string) => void;
  isEvaluating: boolean;
  evaluationResults: { wins: number; avgFitness?: number } | null;
  gridCols?: string;
  hideHeader?: boolean;
}

const SavedNNsWidget: React.FC<SavedNNsWidgetProps> = ({
  savedNNs,
  activeAgent,
  onLoadToArena,
  onLoadToHero,
  onDeleteFromLocalStorage,
  onEvaluate,
  onLoadToTraining,
  onToggleStar,
  isEvaluating,
  evaluationResults,
  gridCols = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  hideHeader = false
}) => {
  if (savedNNs.length === 0) return null;

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-4">
          Saved Neural Networks ({savedNNs.length})
          <div className="h-px flex-1 bg-white/5"></div>
        </h3>
      )}
      <div className={`grid gap-3 ${gridCols}`}>
        {[...savedNNs].sort((a, b) => b.timestamp - a.timestamp).map((nn) => (
          <div 
            key={nn.id}
            className={`p-2.5 rounded-xl border flex flex-col gap-1 ${
              activeAgent?.id === nn.member.id 
                ? 'border-cyan-500/60 bg-cyan-500/5' 
                : 'border-white/5 bg-slate-900/40'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  {onToggleStar && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar(nn.id);
                      }}
                      className={`text-[14px] transition-all ${
                        nn.starred 
                          ? 'text-yellow-400' 
                          : 'text-slate-600 hover:text-yellow-400/60'
                      }`}
                      title={nn.starred ? 'Unstar' : 'Star'}
                    >
                      ★
                    </button>
                  )}
                  <div className="text-[12px] font-black text-white mb-0.5">{nn.name}</div>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {new Date(nn.timestamp).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => onDeleteFromLocalStorage(nn.id)}
                className="text-[12px] text-red-400 hover:text-red-300 px-1"
                title="Delete"
              >
                ×
              </button>
            </div>
            {nn.fitness != null && (
              <div className="text-[13px] font-mono text-cyan-400 font-bold">
                {nn.fitness.toLocaleString()} PTS
              </div>
            )}
            {nn.member.gamesPlayed != null && nn.member.gamesPlayed > 0 && (
              <div className="text-[10px] font-mono text-slate-500">
                {nn.member.gamesPlayed.toLocaleString()} games
              </div>
            )}
            {(() => {
              const cost = calculateTrainingCost(nn.member);
              return cost > 0 ? (
                <div className="text-[10px] font-mono text-slate-400">
                  {cost.toLocaleString()} cost (nodes×layers×games)
                </div>
              ) : null;
            })()}
            {nn.fitnessWeights && (
              <div className="text-[10px] text-slate-400">
                <div className="font-black text-slate-500 uppercase mb-0.5">Weights:</div>
                <div className="font-mono flex gap-3">
                  <span>G: {nn.fitnessWeights.gold}</span>
                  <span>M: {nn.fitnessWeights.mine}</span>
                  <span>S: {nn.fitnessWeights.survival}</span>
                  <span>E: {nn.fitnessWeights.exploration}</span>
                </div>
              </div>
            )}
            {nn.evaluations && nn.evaluations.length > 0 && (
              <div className="text-[9px] text-slate-500">
                <div className="font-black text-slate-400 uppercase">Evals: {nn.evaluations.length}</div>
                <div className="font-mono text-cyan-400 font-bold">
                  Avg: {(nn.evaluations.reduce((sum, e) => sum + e.wins, 0) / nn.evaluations.length).toFixed(1)}/100 wins
                </div>
                {nn.evaluations.slice(-3).map((evalResult, i) => (
                  <div key={i} className="font-mono">
                    {evalResult.wins}/100 wins{evalResult.avgFitness !== undefined ? `, ${evalResult.avgFitness.toFixed(0)} avg` : ''}
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2 mt-1">
              {onLoadToHero && (
                <div className="grid grid-cols-4 gap-1">
                  <button
                    onClick={() => onLoadToHero(1, nn.id)}
                    className="py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-all"
                    title="Load to Hero 1 (Blue)"
                  >
                    1
                  </button>
                  <button
                    onClick={() => onLoadToHero(2, nn.id)}
                    className="py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
                    title="Load to Hero 2 (Red)"
                  >
                    2
                  </button>
                  <button
                    onClick={() => onLoadToHero(3, nn.id)}
                    className="py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-all"
                    title="Load to Hero 3 (Green)"
                  >
                    3
                  </button>
                  <button
                    onClick={() => onLoadToHero(4, nn.id)}
                    className="py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 transition-all"
                    title="Load to Hero 4 (Yellow)"
                  >
                    4
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => onEvaluate(nn.member, nn.id)}
                  disabled={isEvaluating}
                  className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    isEvaluating 
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                      : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  {isEvaluating ? '...' : 'Eval'}
                </button>
                {onLoadToTraining && (
                  <button
                    onClick={() => onLoadToTraining(nn.id)}
                    className="py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                  >
                    Train
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {evaluationResults && (
        <div className="p-4 bg-black/40 border border-white/5 rounded-xl text-[9px]">
          <div className="text-emerald-400 font-black mb-1">Evaluation Results</div>
          <div className="text-cyan-400 font-mono">Wins: {evaluationResults.wins}/100</div>
          {evaluationResults.avgFitness !== undefined && (
            <div className="text-cyan-400 font-mono">Avg Fitness: {evaluationResults.avgFitness.toFixed(1)}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SavedNNsWidget;
