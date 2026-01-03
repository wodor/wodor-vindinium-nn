
import React, { useState } from 'react';
import { DEFAULT_SCENARIOS, ScenarioInterpreter } from '../services/scenarioInterpreter';
import { TestRunner } from '../services/testRunner';
import { GameState, TestResult, PopulationMember } from '../types';

interface StrategyLabProps {
  onLoadScenario: (state: GameState, gherkin: string) => void;
  activeAgent: PopulationMember | null;
}

const StrategyLab: React.FC<StrategyLabProps> = ({ 
  onLoadScenario, 
  activeAgent
}) => {
  const [text, setText] = useState(DEFAULT_SCENARIOS['Tavern Emergency']);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const handleApply = () => {
    try {
      const state = ScenarioInterpreter.parse(text);
      onLoadScenario(state, text);
    } catch (e) {
      alert("Parsing error. Check Gherkin syntax.");
    }
  };

  const handleRunDiagnostics = async () => {
    setIsRunningTests(true);
    const results = await TestRunner.runDiagnostics(activeAgent);
    setTestResults(results);
    setIsRunningTests(false);
  };

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleApply}
            className="py-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
          >
            Compile Scenario
          </button>
          <button
            onClick={handleRunDiagnostics}
            disabled={isRunningTests}
            className="py-3 bg-cyan-500/10 text-cyan-500 border border-cyan-500/30 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-2"
          >
            {isRunningTests ? 'Running...' : 'Run Diagnostics'}
          </button>
      </div>

      {testResults.length > 0 && (
          <div className="p-6 bg-black/40 border border-white/5 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="flex justify-between items-center mb-2">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Logic Validation Results</h4>
                <button onClick={() => setTestResults([])} className="text-[8px] text-slate-600 hover:text-white font-bold uppercase underline">Clear</button>
             </div>
             {testResults.map((res, i) => (
                 <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                    <div className="flex items-center gap-3">
                        <span className={res.passed ? 'text-emerald-400' : 'text-red-400'}>{res.passed ? '✓' : '✗'}</span>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-white tracking-tight">{res.name}</span>
                            <span className="text-[9px] text-slate-500 font-mono">Expected: {res.expected}</span>
                        </div>
                    </div>
                    <div className="text-right">
                         <span className={`text-[10px] font-mono font-bold ${res.passed ? 'text-emerald-500' : 'text-red-500'}`}>
                             {res.actual}
                         </span>
                    </div>
                 </div>
             ))}
          </div>
      )}
      
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
