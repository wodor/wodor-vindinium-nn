
import React from 'react';

interface NeuralNetworkVisProps {
  activations?: number[][];
}

const NeuralNetworkVis: React.FC<NeuralNetworkVisProps> = ({ 
  activations = [] 
}) => {
  // Find global max across all activations for visualization scaling
  const maxActivation = activations.length > 0 
    ? Math.max(...activations.flat(), 0.001) 
    : 1;

  // Configuration for node display
  const nodesToRender = 16;
  const paddingY = 10; // %
  const rangeY = 80; // %

  const getNeuronY = (idx: number, total: number) => {
    const effectiveTotal = Math.min(total, nodesToRender);
    if (effectiveTotal <= 1) return 50;
    return paddingY + (idx * rangeY / (effectiveTotal - 1));
  };

  const getLayerX = (idx: number, totalLayers: number) => {
    // Total columns = activations.length + 2 (input stub, hidden layers, output stub)
    return (idx + 1) * 100 / (totalLayers + 2);
  };

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 p-6 rounded-3xl overflow-hidden relative">
      <div className="absolute top-4 left-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">
        Synaptic Activity Loop
      </div>
      
      <div className="flex justify-between items-center h-48 mt-4 relative px-10">
        {/* Connection Overlay */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          
          {activations.length > 0 && (
            <>
              {/* Input stub connections - fanning out to first hidden layer */}
              {Array.from({ length: 6 }).map((_, i) => {
                const x1 = getLayerX(-1, activations.length);
                const y1 = 10 + (i * 80 / 5);
                const x2 = getLayerX(0, activations.length);
                const nextCount = Math.min(activations[0].length, nodesToRender);
                
                return Array.from({ length: Math.min(nextCount, 4) }).map((_, j) => {
                  const targetIdx = Math.floor(j * nextCount / Math.min(nextCount, 4));
                  return (
                    <line 
                      key={`in-${i}-${j}`}
                      x1={`${x1}`} y1={`${y1}`} 
                      x2={`${x2}`} y2={`${getNeuronY(targetIdx, nextCount)}`}
                      stroke="#334155"
                      strokeWidth="0.1"
                    />
                  );
                });
              })}

              {/* Layer-to-layer connections */}
              {activations.map((layer, lIdx) => {
                const currentX = getLayerX(lIdx, activations.length);
                const nextX = getLayerX(lIdx + 1, activations.length);
                const currentCount = Math.min(layer.length, nodesToRender);
                const nextCount = (lIdx === activations.length - 1) 
                  ? 5 
                  : Math.min(activations[lIdx + 1].length, nodesToRender);

                // For each neuron in current layer, connect to a subset of neurons in next layer
                return layer.slice(0, nodesToRender).map((val, i) => {
                  const y1 = getNeuronY(i, currentCount);
                  // Determine how many connections to draw for this neuron
                  const step = lIdx === activations.length - 1 ? 1 : 4;
                  return Array.from({ length: nextCount }).filter((_, idx) => idx % step === 0).map((_, j) => (
                    <line 
                      key={`${lIdx}-${i}-${j}`}
                      x1={`${currentX}`} y1={`${y1}`} 
                      x2={`${nextX}`} y2={`${getNeuronY(j * step, nextCount)}`}
                      stroke="url(#lineGrad)"
                      strokeWidth={val > 0.3 ? "0.15" : "0.05"}
                      strokeOpacity={Math.max(0.1, val)}
                    />
                  ));
                });
              })}
            </>
          )}
        </svg>

        {/* Input Stub Nodes */}
        <div className="flex flex-col gap-1 z-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
          ))}
          <div className="text-[7px] text-slate-700 font-bold uppercase rotate-90 mt-2">INPUT</div>
        </div>

        {/* Dynamic Hidden Layers Nodes */}
        {activations.length > 0 ? (
          activations.map((layer, lIdx) => (
            <div key={lIdx} className="flex flex-col justify-between h-full z-10">
              {layer.slice(0, nodesToRender).map((val, i) => {
                const intensity = val / maxActivation;
                return (
                  <div 
                    key={i} 
                    className="w-2.5 h-2.5 rounded-full transition-all duration-300 border border-white/5"
                    style={{ 
                      backgroundColor: `rgba(34, 211, 238, ${0.05 + Math.min(0.95, intensity)})`,
                      boxShadow: intensity > 0.6 ? `0 0 ${intensity * 8}px rgba(34, 211, 238, 0.6)` : 'none'
                    }}
                  ></div>
                );
              })}
              {layer.length > nodesToRender && <div className="text-[6px] text-slate-700 text-center">...</div>}
            </div>
          ))
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest animate-pulse">Awaiting Inference Signal</span>
          </div>
        )}

        {/* Action Stub Nodes */}
        <div className="flex flex-col justify-between h-full z-10">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-3 h-3 rounded-sm bg-slate-800 border border-slate-700"></div>
          ))}
          <div className="text-[7px] text-slate-700 font-bold uppercase rotate-90 mt-2">POLICY</div>
        </div>
      </div>
      
      <div className="mt-4 flex justify-between text-[10px] font-mono text-slate-600 uppercase">
        <span>Static_Buffer</span>
        <span>{activations.length}x Latent_Space</span>
        <span>Policy_Out</span>
      </div>
    </div>
  );
};

export default NeuralNetworkVis;
