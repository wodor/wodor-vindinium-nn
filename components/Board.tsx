
import React from 'react';
import { GameState } from '../types';

interface BoardProps {
  state: GameState;
  isTurbo?: boolean;
}

const Board: React.FC<BoardProps> = ({ state, isTurbo = false }) => {
  const { size, tiles } = state.board;
  
  const renderTile = (content: string, index: number) => {
    let bgColor = 'bg-slate-800/20';
    let icon = '';
    let label = '';
    let extraClasses = '';

    if (!content) content = '  ';

    if (content === '##') {
      bgColor = 'bg-slate-900';
      icon = '🪨';
      extraClasses = 'grayscale opacity-60';
    } else if (content === '[]') {
      bgColor = isTurbo ? 'bg-amber-500/10' : 'bg-amber-900/10';
      icon = '🍺';
      label = 'T';
      if (isTurbo) extraClasses = 'shadow-[inset_0_0_20px_rgba(245,158,11,0.1)]';
    } else if (content.startsWith('$')) {
      const owner = content[1];
      bgColor = owner === '-' ? 'bg-slate-800/40' : 
                owner === '1' ? 'bg-blue-500/20' : 
                owner === '2' ? 'bg-red-500/20' : 
                owner === '3' ? 'bg-green-500/20' : 'bg-yellow-500/20';
      icon = '💰';
      label = owner === '-' ? '' : owner;
      if (owner !== '-') extraClasses = 'ring-1 ring-white/10';
    } else if (content.startsWith('@')) {
      const id = content[1];
      bgColor = id === '1' ? 'bg-blue-600' : 
                id === '2' ? 'bg-red-600' : 
                id === '3' ? 'bg-green-600' : 'bg-yellow-600';
      icon = '⚔️';
      label = id;
      extraClasses = 'z-20 scale-105 shadow-xl ring-1 ring-white/50';
      if (isTurbo) extraClasses += ` ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.5)] scale-110`;
    }

    return (
      <div 
        key={index}
        className={`w-full h-full flex items-center justify-center rounded-md transition-all duration-300 border border-slate-800/50 relative overflow-hidden group ${bgColor} ${extraClasses}`}
      >
        <span className={`text-lg md:text-xl z-10 select-none ${isTurbo && content.startsWith('@') ? 'animate-bounce' : ''}`}>{icon}</span>
        {label && (
          <span className="absolute top-0 left-0 text-[8px] font-black px-1 bg-black/40 rounded-br-md text-white/80">
            {label}
          </span>
        )}
        {isTurbo && !content.startsWith('@') && content !== '  ' && (
           <div className="absolute inset-0 bg-cyan-400/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        )}
      </div>
    );
  };

  const tilesArray: string[] = [];
  for (let i = 0; i < tiles.length; i += 2) {
    tilesArray.push(tiles.substring(i, i + 2));
  }

  return (
    <div 
      className={`grid gap-1 p-3 rounded-2xl shadow-2xl border transition-all duration-700 ${isTurbo ? 'bg-cyan-950/20 border-cyan-500/40' : 'bg-slate-900 border-slate-800'}`}
      style={{ 
        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        aspectRatio: '1/1',
        width: 'min(75vh, 75vw)',
        maxWidth: '800px'
      }}
    >
      {tilesArray.map((tile, i) => renderTile(tile, i))}
    </div>
  );
};

export default Board;
