
import React from 'react';
import { PopulationMember } from '../types';

interface NeuralTrainingProps {
  population: PopulationMember[];
  generation: number;
  history: number[];
  isAutoEvolving: boolean;
  isTraining: boolean;
  onToggleAutoEvolve: () => void;
  onManualStep: () => void;
}

const NeuralTraining: React.FC<NeuralTrainingProps> = ({ 
  population, 
  generation, 
  history, 
  isAutoEvolving, 
  isTraining,
  onToggleAutoEvolve,
  onManualStep
}) => {
  // Enhanced chart height calculation to ensure visibility even for low fitness values
  const maxHistoryValue = Math.max(...history, 1);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end bg-slate-900/40 p-10 rounded-[2.5rem] border border-slate-800/50 backdrop-blur-sm shadow-2xl gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-3 h-3 rounded-full ${isAutoEvolving ? 'bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.8)]' : 'bg-slate-700'}`}></span>
            <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase">Neural_Evolver</h2>
          </div>
          <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-md">
            Background synthesis is {isAutoEvolving ? 'active' : 'on standby'}. 
            Propagating 41-16-5 decision matrices through persistent genetic mutation loops.
          </p>
        </div>

        <div className="flex gap-4 items-center">
            <button 
                onClick={onToggleAutoEvolve}
                className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all font-black uppercase tracking-widest text-[10px] ${
                    isAutoEvolving 
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]' 
                    : 'bg-slate-800/50 border-slate-700 text-slate-500'
                }`}
            >
                {isAutoEvolving ? '⏸ PAUSE AUTO-EVOLVE' : '▶ RESUME AUTO-EVOLVE'}
            </button>

            <div className="flex gap-8 items-center bg-black/30 p-6 rounded-3xl border border-white/5">
                <div className="text-right">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Current_Gen</div>
                    <div className="text-5xl font-mono text-cyan-400 font-black tracking-tighter">{generation}</div>
                </div>
            </div>
        </div>
      </div>

      {/* History Sparkline - Persistent Data Flow */}
      <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800/50 relative overflow-hidden">
        <div className="flex justify-between items-center mb-4">
            <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Fitness Progression Loop (Last 60 Gen)</div>
            {isTraining && <span className="text-[8px] font-mono text-cyan-500 animate-pulse">OPTIMIZING_WEIGHTS...</span>}
        </div>
        <div className="flex items-end gap-1 h-32 px-2">
          {history.length === 0 && (
            <div className="text-slate-800 font-mono text-[9px] w-full text-center py-12 uppercase tracking-widest border border-dashed border-slate-800/50 rounded-2xl">
              Waiting for neural engine to establish baseline metrics...
            </div>
          )}
          {history.map((val, i) => {
            // Calculate height as percentage, min 2% to ensure visibility
            const h = (val / maxHistoryValue) * 100;
            return (
              <div 
                key={i} 
                title={`Fitness: ${val.toFixed(2)}`}
                className="flex-1 bg-cyan-500/20 hover:bg-cyan-400 transition-all rounded-t-sm" 
                style={{ height: `${Math.max(2, h)}%` }}
              ></div>
            );
          })}
        </div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
      </div>

      {/* Population Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {population.map((member) => {
          const isElite = member.status === 'Elite_Specimen';
          return (
            <div key={member.id} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/50 space-y-4 relative overflow-hidden group hover:bg-slate-900/80 hover:border-cyan-500/40 transition-all duration-500 shadow-xl">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono text-slate-500 font-bold">{member.id}</span>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                  isElite 
                    ? 'bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {member.status.replace('_', ' ')}
                </span>
              </div>
              
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Raw_Fitness</div>
                <div className="text-3xl font-mono text-white font-black">{member.fitness}</div>
              </div>

              <div className="space-y-1">
                  <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ease-out ${
                        isElite ? 'bg-cyan-400' : 'bg-slate-600'
                      }`} 
                      style={{ width: `${Math.min(100, (member.fitness / (Math.max(...population.map(p => p.fitness), 1))) * 100)}%` }}
                    ></div>
                  </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isAutoEvolving && (
        <button
            onClick={onManualStep}
            disabled={isTraining}
            className="group w-full py-8 bg-white text-slate-950 font-black rounded-[2.5rem] shadow-2xl hover:bg-cyan-400 transition-all active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-4 overflow-hidden"
        >
            {isTraining ? (
            <>
                <div className="w-6 h-6 border-4 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                <span className="uppercase tracking-[0.3em] text-lg italic">Processing Mutation Chain...</span>
            </>
            ) : (
            <>
                <span className="uppercase tracking-[0.3em] text-lg italic">Trigger Manual Propagation</span>
            </>
            )}
        </button>
      )}

      {/* Network Schema */}
      <div className="p-10 rounded-[3rem] bg-slate-950/50 border border-slate-800/80 border-dashed backdrop-blur-md">
        <div className="flex items-center gap-4 mb-8">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Synaptic Topology</h4>
          <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div className="p-8 rounded-3xl bg-slate-900/30 border border-white/5 group hover:border-cyan-500/20 transition-all">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3">Input_Array</div>
            <div className="text-5xl font-mono font-black text-white group-hover:text-cyan-400 transition-colors">41</div>
            <p className="text-[9px] text-slate-600 mt-2 italic">Vision / Stats / Radar</p>
          </div>
          <div className="p-8 rounded-3xl bg-slate-900/30 border border-white/5 group hover:border-cyan-500/20 transition-all">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3">Latent_Space</div>
            <div className="text-5xl font-mono font-black text-white group-hover:text-cyan-400 transition-colors">16</div>
            <p className="text-[9px] text-slate-600 mt-2 italic">Non-Linear Transformation</p>
          </div>
          <div className="p-8 rounded-3xl bg-slate-900/30 border border-white/5 group hover:border-cyan-500/20 transition-all">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3">Control_Policy</div>
            <div className="text-5xl font-mono font-black text-white group-hover:text-cyan-400 transition-colors">05</div>
            <p className="text-[9px] text-slate-600 mt-2 italic">N / S / E / W / Stay</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NeuralTraining;
