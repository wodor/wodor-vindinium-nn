
import React, { useState } from 'react';
import { DEFAULT_SCENARIOS, ScenarioInterpreter } from '../services/scenarioInterpreter';
import { GameState } from '../types';

interface StrategyLabProps {
  onLoadScenario: (state: GameState, gherkin: string) => void;
}

const StrategyLab: React.FC<StrategyLabProps> = ({ onLoadScenario }) => {
  const [text, setText] = useState(DEFAULT_SCENARIOS['Tavern Emergency']);

  const handleApply = () => {
    try {
      const state = ScenarioInterpreter.parse(text);
      onLoadScenario(state, text);
    } catch (e) {
      alert("Parsing error. Check Gherkin syntax.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.keys(DEFAULT_SCENARIOS).map(name => (
          <button
            key={name}
            onClick={() => {
              const script = (DEFAULT_SCENARIOS as any)[name];
              setText(script);
              onLoadScenario(ScenarioInterpreter.parse(script), script);
            }}
            className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-slate-400 font-bold uppercase"
          >
            {name}
          </button>
        ))}
      </div>

      <div className="relative group">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-48 bg-black/40 border border-slate-700 rounded-xl p-4 font-mono text-xs text-emerald-400 focus:outline-none focus:border-emerald-500/50 transition-all no-scrollbar"
          spellCheck={false}
        />
        <div className="absolute top-2 right-2 text-[8px] text-slate-600 font-bold">GHERKIN EDITOR</div>
      </div>

      <button
        onClick={handleApply}
        className="w-full py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
      >
        Compile & Flash Scenario
      </button>
      
      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-[10px] text-slate-500 space-y-1">
        <p className="font-bold text-slate-400">Supported Syntax:</p>
        <p>• Given a board of size [n]</p>
        <p>• And Hero [id] is at [x],[y] with [hp] HP</p>
        <p>• And a [Tavern|Wall|neutral Mine] is at [x],[y]</p>
      </div>
    </div>
  );
};

export default StrategyLab;
