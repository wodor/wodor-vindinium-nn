
import React from 'react';
import { Hero, PopulationMember } from '../types';
import { SavedNN } from '../services/nnStorage';

interface HeroStatsProps {
  heroes: Hero[];
  heroNeuralWeights: Map<number, PopulationMember | null>;
  savedNNs: SavedNN[];
  heroSavedNNIds: Map<number, string>;
  onResetHero: (heroId: number) => void;
  population: PopulationMember[];
  activeNeuralWeights: PopulationMember | null;
  onLoadNNToHero: (heroId: number, nnId: string) => void;
  onLoadCurrentToHero: (heroId: number, member: PopulationMember) => void;
}

const HeroStats: React.FC<HeroStatsProps> = ({ heroes, heroNeuralWeights, savedNNs, heroSavedNNIds, onResetHero, population, activeNeuralWeights, onLoadNNToHero, onLoadCurrentToHero }) => {
  const maxGold = Math.max(...heroes.map(h => h.gold));
  const goldLeader = heroes.find(h => h.gold === maxGold && h.gold > 0);
  
  return (
    <div className="grid grid-cols-4 gap-3 w-full">
      {heroes.map((hero) => {
        const isGoldLeader = goldLeader && hero.id === goldLeader.id;
        const colorClass = hero.id === 1 ? 'border-blue-500 bg-blue-500/5' : 
                          hero.id === 2 ? 'border-red-500 bg-red-500/5' : 
                          hero.id === 3 ? 'border-green-500 bg-green-500/5' : 'border-yellow-500 bg-yellow-500/5';
        
        const accentText = hero.id === 1 ? 'text-blue-400' : 
                          hero.id === 2 ? 'text-red-400' : 
                          hero.id === 3 ? 'text-green-400' : 'text-yellow-400';

        const heroNN = heroNeuralWeights.get(hero.id);
        const hasNN = heroNN !== null && heroNN !== undefined;
        const savedNNId = heroSavedNNIds.get(hero.id);
        const savedNN = savedNNId ? savedNNs.find(nn => nn.id === savedNNId) : null;

        return (
          <div 
            key={hero.id} 
            className={`px-4 py-2 rounded-xl border ${colorClass} ${isGoldLeader ? 'ring-2 ring-amber-400 ring-opacity-60 shadow-lg shadow-amber-500/20' : ''} backdrop-blur-sm transition-all shadow-sm flex flex-col gap-1`}
          >
            <div className="flex justify-between items-center">
              <span className={`text-[8px] font-black uppercase tracking-widest ${accentText}`}>
                {hero.id === 1 ? 'SUBJECT_PROX' : `OPP_${hero.id}`}
              </span>
              <div className="flex items-center gap-1">
                {isGoldLeader && <span className="text-[10px]">👑</span>}
                <span className="text-[8px] font-mono text-slate-500">
                  {hero.pos.x},{hero.pos.y}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-800 rounded-full h-1 overflow-hidden">
                <div 
                  className={`h-full ${hero.life > 30 ? (hero.id === 1 ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-red-500'} transition-all duration-500`} 
                  style={{ width: `${hero.life}%` }}
                />
              </div>
              <span className="text-[9px] font-mono font-black text-white w-6 text-right">{hero.life}</span>
            </div>

            <div className="flex justify-between items-center text-[9px] font-black">
              <div className={`flex items-center gap-1 ${isGoldLeader ? 'text-amber-300' : 'text-amber-400'}`}>
                <span className="text-[8px]">💰</span>
                {hero.gold}
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <span className="text-[8px]">⚒️</span>
                {hero.mineCount}
              </div>
            </div>

            {savedNN && (
              <div className="mt-1 pt-1.5 border-t border-white/5 space-y-1">
                <div className="flex flex-col">
                  <span className="text-[6px] font-black text-slate-600 uppercase tracking-[0.2em] mb-0.5">Loaded NN</span>
                  <span className="text-[9px] font-black text-white leading-tight">{savedNN.name}</span>
                </div>
                {savedNN.fitness !== undefined && (
                  <div className="flex flex-col">
                    <span className="text-[6px] font-black text-slate-600 uppercase tracking-[0.2em]">Fitness</span>
                    <span className="text-[10px] font-mono text-cyan-400 font-black leading-none">{savedNN.fitness.toLocaleString()} PTS</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-1 flex flex-col gap-1">
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => {
                    const newestNN = [...savedNNs].sort((a, b) => b.timestamp - a.timestamp)[0];
                    if (newestNN) {
                      onLoadNNToHero(hero.id, newestNN.id);
                    }
                  }}
                  disabled={savedNNs.length === 0}
                  className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  title="Load Last Saved"
                >
                  Last
                </button>
                <button
                  onClick={() => {
                    const starredNNs = savedNNs.filter(nn => nn.starred).sort((a, b) => b.timestamp - a.timestamp);
                    const newestStarred = starredNNs[0];
                    if (newestStarred) {
                      onLoadNNToHero(hero.id, newestStarred.id);
                    }
                  }}
                  disabled={!savedNNs.some(nn => nn.starred)}
                  className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  title="Load Starred"
                >
                  ⭐
                </button>
                <button
                  onClick={() => {
                    const best = population.length > 0 
                      ? [...population].sort((a, b) => (b.displayFitness ?? b.fitness) - (a.displayFitness ?? a.fitness))[0]
                      : activeNeuralWeights;
                    if (best) {
                      onLoadCurrentToHero(hero.id, best);
                    }
                  }}
                  disabled={population.length === 0 && !activeNeuralWeights}
                  className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  title="Load Current"
                >
                  Current
                </button>
              </div>
              {hasNN && (
                <button
                  onClick={() => onResetHero(hero.id)}
                  className="mt-0.5 py-1 rounded text-[8px] font-black uppercase tracking-widest bg-slate-800/50 border border-slate-700 text-slate-400 hover:bg-slate-700/50 transition-all"
                  title="Reset to Random"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HeroStats;
