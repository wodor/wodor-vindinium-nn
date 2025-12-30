
import React from 'react';
import { Hero } from '../types';

interface HeroStatsProps {
  heroes: Hero[];
}

const HeroStats: React.FC<HeroStatsProps> = ({ heroes }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-400 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        Active Heroes
      </h2>
      <div className="grid grid-cols-1 gap-3">
        {heroes.map((hero) => {
          const colorClass = hero.id === 1 ? 'border-blue-500' : 
                            hero.id === 2 ? 'border-red-500' : 
                            hero.id === 3 ? 'border-green-500' : 'border-yellow-500';
          
          return (
            <div 
              key={hero.id} 
              className={`p-4 rounded-xl bg-slate-800/40 border-l-4 ${colorClass} backdrop-blur-sm`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-lg">Hero #{hero.id}</div>
                <div className="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">
                  {hero.pos.x}, {hero.pos.y}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-red-400">❤️</span>
                  <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-red-500 h-full" 
                      style={{ width: `${hero.life}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-slate-400">HP</span>
                  <span className="font-mono font-bold">{hero.life}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">💰</span>
                  <span className="font-bold">{hero.gold}</span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-cyan-400">⚒️</span>
                  <span className="font-bold">{hero.mineCount}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HeroStats;
