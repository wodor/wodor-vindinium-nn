
import React from 'react';

interface NeuralNetworkVisProps {
  activations?: number[];
  inputSize?: number;
  outputSize?: number;
}

const NeuralNetworkVis: React.FC<NeuralNetworkVisProps> = ({ 
  activations = [], 
  inputSize = 41, 
  outputSize = 5 
}) => {
  // Normalize activations for opacity
  const maxActivation = activations.length > 0 ? Math.max(...activations, 0.001) : 1;

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 p-6 rounded-3xl overflow-hidden relative">
      <div className="absolute top-4 left-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">
        Real-time Layer Activity
      </div>
      
      <div className="flex justify-between items-center h-48 mt-4 relative">
        {/* Simplified Input Indicators */}
        <div className="flex flex-col gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-slate-700/50"></div>
          ))}
          <div className="text-[8px] text-slate-700 font-bold uppercase rotate-90 mt-2">Inputs</div>
        </div>

        {/* Connection Lines (Aesthetic) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          {activations.length > 0 && Array.from({ length: 16 }).map((_, i) => (
             <line 
               key={i}
               x1="10%" y1="50%" x2="50%" y2={`${10 + (i * 80 / 15)}%`}
               stroke="url(#lineGrad)"
               strokeWidth="0.5"
             />
          ))}
          {activations.length > 0 && Array.from({ length: 16 }).map((_, i) => (
             <line 
               key={i}
               x1="50%" y1={`${10 + (i * 80 / 15)}%`} x2="90%" y2="50%"
               stroke="#22d3ee"
               strokeWidth={activations[i] / maxActivation * 1.5}
               opacity={activations[i] / maxActivation}
             />
          ))}
        </svg>

        {/* Hidden Layer Nodes */}
        <div className="flex flex-col justify-between h-full z-10">
          {Array.from({ length: 16 }).map((_, i) => {
            const val = activations[i] || 0;
            const intensity = val / maxActivation;
            return (
              <div 
                key={i} 
                className="w-3 h-3 rounded-full transition-all duration-300 border border-white/5 shadow-inner"
                style={{ 
                  backgroundColor: `rgba(34, 211, 238, ${0.1 + intensity * 0.9})`,
                  boxShadow: intensity > 0.5 ? `0 0 ${intensity * 10}px rgba(34, 211, 238, 0.8)` : 'none'
                }}
              ></div>
            );
          })}
        </div>

        {/* Output Layer Nodes */}
        <div className="flex flex-col gap-4 z-10">
          {Array.from({ length: outputSize }).map((_, i) => (
            <div key={i} className="w-4 h-4 rounded-sm bg-slate-800 border border-slate-700"></div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 flex justify-between text-[10px] font-mono text-slate-500 uppercase">
        <span>Vision / Radar</span>
        <span>Dense Hidden (ReLU)</span>
        <span>Softmax Decision</span>
      </div>
    </div>
  );
};

export default NeuralNetworkVis;
