
import React from 'react';

interface NeuralNetworkVisProps {
  activations?: number[][];
}

const NeuralNetworkVis: React.FC<NeuralNetworkVisProps> = ({ 
  activations = [] 
}) => {
  const nodesToRender = 10;
  const paddingY = 20;
  const rangeY = 60;

  const getNeuronY = (idx: number, total: number) => {
    const effectiveTotal = Math.min(total, nodesToRender);
    if (effectiveTotal <= 1) return 50;
    return paddingY + (idx * rangeY / (effectiveTotal - 1));
  };

  const getLayerX = (idx: number, totalLayers: number) => {
    return (idx + 1) * 100 / (totalLayers + 2);
  };

  return (
    <div className="w-full h-full relative min-h-[120px] max-h-[220px]">
      <div className="flex justify-between items-center h-full relative">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          
          {activations.length > 0 && (
            <>
              {activations.map((layer, lIdx) => {
                const currentX = getLayerX(lIdx, activations.length);
                const nextX = getLayerX(lIdx + 1, activations.length);
                const currentCount = Math.min(layer.length, nodesToRender);
                const nextCount = (lIdx === activations.length - 1) 
                  ? 5 
                  : Math.min(activations[lIdx + 1].length, nodesToRender);

                return layer.slice(0, nodesToRender).map((val, i) => {
                  const y1 = getNeuronY(i, currentCount);
                  const step = lIdx === activations.length - 1 ? 1 : 2;
                  return Array.from({ length: nextCount }).filter((_, idx) => idx % step === 0).map((_, j) => (
                    <line 
                      key={`${lIdx}-${i}-${j}`}
                      x1={`${currentX}`} y1={`${y1}`} 
                      x2={`${nextX}`} y2={`${getNeuronY(j * step, nextCount)}`}
                      stroke="url(#lineGrad)"
                      strokeWidth={val > 0.3 ? "0.2" : "0.05"}
                      strokeOpacity={val > 0.1 ? 0.3 : 0.05}
                    />
                  ));
                });
              })}
            </>
          )}
        </svg>

        {activations.length > 0 ? (
          activations.map((layer, lIdx) => (
            <div 
              key={lIdx} 
              className="flex flex-col justify-around h-full z-10"
              style={{ width: '12px' }}
            >
              {layer.slice(0, nodesToRender).map((val, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 shadow-glow ${val > 0.5 ? 'bg-cyan-400 scale-125' : val > 0.1 ? 'bg-cyan-700' : 'bg-slate-800'}`}
                  title={`Activation: ${val.toFixed(2)}`}
                />
              ))}
            </div>
          ))
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 gap-2">
             <div className="flex gap-1">
                {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{animationDelay: `${i*0.1}s`}}></div>)}
             </div>
             <span className="text-[8px] font-black uppercase tracking-[0.3em]">Synaptic Static</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NeuralNetworkVis;
