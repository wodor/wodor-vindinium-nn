
import React from 'react';
import { AIDecision } from '../types';

interface InferenceDataViewProps {
  decision: AIDecision;
}

const InferenceDataView: React.FC<InferenceDataViewProps> = ({ decision }) => {
  const inputs = decision.inputs || [];
  const outputs = decision.activations ? decision.activations[decision.activations.length - 1] : [];
  
  const vision = inputs.slice(0, 25);
  const hp = inputs.slice(25, 29);
  const gld = inputs.slice(29, 33);
  const mine = inputs.slice(33, 37);
  const tavern = inputs.slice(37, 39);
  const neutralMine = inputs.slice(39, 41);
  const hero = inputs.slice(43, 45);
  const progress = inputs[47] || 0;

  const getTileChar = (val: number) => {
    if (val === -1) return 'X';
    if (val === -0.8) return '#';
    if (val === 1.0) return 'T';
    if (val === 0.7 || val === 0.9) return '$';
    if (val === -0.9) return 'H';
    return '.';
  };

  const getTileClass = (val: number) => {
    if (val === -1) return 'text-slate-600';
    if (val === -0.8) return 'text-slate-500';
    if (val === 1.0) return 'text-amber-500';
    if (val === 0.7 || val === 0.9) return 'text-emerald-500';
    if (val === -0.9) return 'text-red-500';
    if (val === 0.3) return 'text-cyan-400';
    return 'text-slate-800';
  };

  return (
    <div className="space-y-4 font-mono select-none">
      <div className="flex flex-col items-center">
        <span className="text-[7px] font-black text-slate-600 uppercase mb-2 tracking-widest">Full Synaptic Input (48)</span>
        <div className="grid grid-cols-5 gap-1 bg-black/20 p-2 rounded-lg border border-white/5">
          {vision.map((v, i) => (
            <div key={i} className={`w-4 h-4 flex items-center justify-center text-[10px] font-bold bg-white/5 rounded-sm ${getTileClass(v)}`}>
              {i === 12 ? <span className="text-cyan-400">H</span> : getTileChar(v)}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1 text-[8px]">
        <div className="flex justify-between items-center text-slate-500">
          <span>UNIT 25-28 (HP):</span>
          <span className="text-white font-bold">{hp.map(v => v.toFixed(2)).join(' ')}</span>
        </div>
        <div className="flex justify-between items-center text-slate-500">
          <span>UNIT 29-32 (GLD):</span>
          <span className="text-white font-bold">{gld.map(v => v.toFixed(2)).join(' ')}</span>
        </div>
        <div className="flex justify-between items-center text-slate-500">
          <span>UNIT 33-36 (MINE):</span>
          <span className="text-white font-bold">{mine.map(v => v.toFixed(2)).join(' ')}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[8px] pt-1 border-t border-white/5">
        <div className="flex justify-between">
          <span className="text-slate-600 uppercase">Tavern:</span>
          <span className="text-amber-400 font-bold">{tavern.map(v => v.toFixed(2)).join(', ')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600 uppercase">Mine:</span>
          <span className="text-emerald-400 font-bold">{neutralMine.map(v => v.toFixed(2)).join(', ')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600 uppercase">Hero:</span>
          <span className="text-red-400 font-bold">{hero.map(v => v.toFixed(2)).join(', ')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600 uppercase">Prog:</span>
          <span className="text-cyan-400 font-bold">{(progress * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="pt-2 border-t border-white/5">
        <span className="text-[7px] font-black text-slate-600 uppercase block mb-2 tracking-widest text-center">Policy Distribution</span>
        <div className="flex justify-between items-end h-8 gap-1.5 px-2">
          {['N', 'S', 'E', 'W', 'H'].map((label, i) => {
            const val = outputs[i] || 0;
            const height = Math.max(10, (val + 1) * 50);
            return (
              <div key={label} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="w-full bg-slate-800 rounded-t-sm relative flex items-end overflow-hidden" style={{ height: '24px' }}>
                   <div 
                    className={`w-full transition-all duration-300 ${val > 0.4 ? 'bg-cyan-400' : 'bg-slate-600'}`} 
                    style={{ height: `${height}%` }}
                   ></div>
                </div>
                <span className="text-[7px] font-black text-slate-600 group-hover:text-cyan-400">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InferenceDataView;
