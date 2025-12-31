
import React from 'react';
import { Hero } from '../types';

interface HeroStatsProps {
  heroes: Hero[];
}

const HeroStats: React.FC<HeroStatsProps> = ({ heroes }) => {
  return (
    <div className="grid grid-cols-4 gap-3 w-full">
      {heroes.map((hero) => {
        const colorClass = hero.id === 1 ? 'border-blue-500 bg-blue-500/5' : 
                          hero.id === 2 ? 'border-red-500 bg-red-500/5' : 
                          hero.id === 3 ? 'border-green-500 bg-green-500/5' : 'border-yellow-500 bg-yellow-500/5';
        
        const accentText = hero.id === 1 ? 'text-blue-400' : 
                          hero.id === 2 ? 'text-red-400' : 
                          hero.id === 3 ? 'text-green-400' : 'text-yellow-400';

        return (
          <div 
            key={hero.id} 
            className={`px-4 py-2 rounded-xl border ${colorClass} backdrop-blur-sm transition-all shadow-sm flex flex-col gap-1`}
          >
            <div className="flex justify-between items-center">
              <span className={`text-[8px] font-black uppercase tracking-widest ${accentText}`}>
                {hero.id === 1 ? 'SUBJECT_PROX' : `OPP_${hero.id}`}
              </span>
              <span className="text-[8px] font-mono text-slate-500">
                {hero.pos.x},{hero.pos.y}
              </span>
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
              <div className="flex items-center gap-1 text-amber-400">
                <span className="text-[8px]">💰</span>
                {hero.gold}
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <span className="text-[8px]">⚒️</span>
                {hero.mineCount}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HeroStats;
