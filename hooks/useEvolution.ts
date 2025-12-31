
import { useState, useCallback, useEffect } from 'react';
// Add Move to the imports to fix 'Cannot find name Move' error on line 77.
import { PopulationMember, SynthesisLog, GameState, Hero, Move } from '../types';
import { NeuralEngine } from '../services/neuralEngine';
import { GameEngine } from '../services/gameEngine';

const createInitialPopulation = (size: number, hiddenSize: number, layers: number, generation: number = 0): PopulationMember[] => 
  Array.from({ length: size }, (_, i) => ({
    id: `G${generation}-M${i}`,
    fitness: 0, 
    accuracy: 0,
    status: 'Awaiting',
    weights: NeuralEngine.createRandomWeights(hiddenSize, layers),
    generation: generation,
    config: { hiddenSize, numLayers: layers },
    fitnessBreakdown: { gold: 0, mines: 0, survival: 0, combat: 0 }
  }));

export function useEvolution() {
  const [hiddenSize, setHiddenSize] = useState(16);
  const [numLayers, setNumLayers] = useState(1);
  const [headlessMode, setHeadlessMode] = useState(false);
  // Default population to 4 to match the 4-hero requirement and improve efficiency
  const [population, setPopulation] = useState<PopulationMember[]>(() => createInitialPopulation(4, 16, 1));
  const [generation, setGeneration] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [isAutoEvolving, setIsAutoEvolving] = useState(true);
  const [isTraining, setIsTraining] = useState(false);
  const [synthesisLogs, setSynthesisLogs] = useState<SynthesisLog[]>([]);
  const [selectedSpecimenId, setSelectedSpecimenId] = useState<string | null>(null);
  const [activeNeuralWeights, setActiveNeuralWeights] = useState<PopulationMember | null>(null);

  const resetEvolution = useCallback((newSize: number, newLayers: number, newPopSize: number = 4) => {
    setHiddenSize(newSize);
    setNumLayers(newLayers);
    setPopulation(createInitialPopulation(newPopSize, newSize, newLayers));
    setGeneration(0);
    setHistory([]);
    setSynthesisLogs([]);
    setSelectedSpecimenId(null);
    setActiveNeuralWeights(null);
  }, []);

  const toggleHeadless = useCallback(() => {
    const nextState = !headlessMode;
    setHeadlessMode(nextState);
    // Standardize population to 4 for actual game competition efficiency
    resetEvolution(hiddenSize, numLayers, 4);
  }, [headlessMode, hiddenSize, numLayers, resetEvolution]);

  const runEvolutionStep = useCallback(async () => {
    if (isTraining || population.length === 0) return;
    setIsTraining(true);
    
    const sortedCurrent = [...population].sort((a, b) => b.fitness - a.fitness);
    const eliteMember = sortedCurrent[0];
    
    let evaluatedPop: PopulationMember[];

    if (headlessMode) {
      // HEADLESS COMPETITION: 4 Neural Agents compete on one board
      const results: {stats: Hero}[] = [];
      let state = GameEngine.createInitialState();
      
      // Simulation Loop: Run full 300 turns
      while (!state.finished) {
        // Hero indices in GameEngine are 1, 2, 3, 4
        const turnHeroId = (state.turn % 4) + 1;
        // Map hero to population member (indices 0, 1, 2, 3)
        const member = population[turnHeroId - 1];
        
        if (member) {
          const decision = await NeuralEngine.getInference(state, turnHeroId, member.weights);
          state = GameEngine.applyMove(state, turnHeroId, decision.move);
        } else {
          // Fallback for safety
          state = GameEngine.applyMove(state, turnHeroId, (Object.values(Move)[Math.floor(Math.random()*5)] as Move));
        }
        
        // Performance yield to avoid browser lockup
        if (state.turn % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      state.heroes.forEach((h) => {
        results.push({ stats: h });
      });

      evaluatedPop = population.map((member, idx) => {
        const gameStats = results[idx]?.stats;
        if (!gameStats) return member;

        // Normalized Fitness Calculation (same weights as heuristic mode for consistency)
        const goldScore = Math.min(100, Math.floor(gameStats.gold / 5)); 
        const mineScore = Math.min(100, gameStats.mineCount * 20);
        const survivalScore = gameStats.life;
        const combatScore = Math.min(100, Math.floor(gameStats.gold / 10)); // Simplified combat proxy

        const fitness = (goldScore * 1.0) + (mineScore * 15.0) + (survivalScore * 0.5) + (combatScore * 4.0);
        
        return { 
          ...member, 
          fitness: Math.floor(fitness), 
          status: 'Simulated', 
          fitnessBreakdown: { gold: goldScore, mines: mineScore, survival: survivalScore, combat: combatScore } 
        };
      });
    } else {
      // HEURISTIC MODE: Estimation for speed
      await new Promise(resolve => setTimeout(resolve, 400));
      const progressFactor = Math.min(2.5, Math.pow(generation / 40, 0.7));
      
      evaluatedPop = population.map((member, idx) => {
        if (member.id === eliteMember.id && generation > 0) return { ...member, status: 'Elite_Specimen' };
        
        const archetype = idx % 4; 
        let goldScore = 0, mineScore = 0, survivalScore = 0, combatScore = 0;
        const baseChance = 0.35 + (progressFactor * 0.25);
        const variance = 0.3 - (Math.min(0.2, generation / 1000));
        
        switch(archetype) {
          case 0: goldScore = Math.floor(70 * baseChance + Math.random() * 30 * variance); mineScore = Math.floor(80 * baseChance + Math.random() * 20 * variance); survivalScore = Math.floor(25 * baseChance + Math.random() * 25 * variance); combatScore = Math.floor(15 * baseChance + Math.random() * 15 * variance); break;
          case 1: goldScore = Math.floor(35 * baseChance + Math.random() * 25 * variance); mineScore = Math.floor(25 * baseChance + Math.random() * 20 * variance); survivalScore = Math.floor(90 * baseChance + Math.random() * 10 * variance); combatScore = Math.floor(15 * baseChance + Math.random() * 15 * variance); break;
          case 2: goldScore = Math.floor(25 * baseChance + Math.random() * 35 * variance); mineScore = Math.floor(35 * baseChance + Math.random() * 30 * variance); survivalScore = Math.floor(35 * baseChance + Math.random() * 35 * variance); combatScore = Math.floor(80 * baseChance + Math.random() * 20 * variance); break;
          default: goldScore = Math.floor(45 * baseChance + Math.random() * 30 * variance); mineScore = Math.floor(45 * baseChance + Math.random() * 30 * variance); survivalScore = Math.floor(45 * baseChance + Math.random() * 30 * variance); combatScore = Math.floor(45 * baseChance + Math.random() * 30 * variance);
        }
        
        const fitness = (goldScore * 1.0) + (mineScore * 15.0) + (survivalScore * 0.5) + (combatScore * 4.0);
        return { ...member, fitness: Math.floor(fitness), status: 'Evaluated', fitnessBreakdown: { gold: goldScore, mines: mineScore, survival: survivalScore, combat: combatScore } };
      });
    }

    const sortedResult = [...evaluatedPop].sort((a, b) => b.fitness - a.fitness);
    const topPerformer = sortedResult[0];
    const fitnessDelta = topPerformer.fitness - (eliteMember?.fitness || 0);
    
    const synthLog: SynthesisLog = {
      generation: generation + 1,
      mutationMagnitude: 0.15 + (Math.random() * 0.1),
      deltas: {
        gold: topPerformer.fitnessBreakdown!.gold - (eliteMember.fitnessBreakdown?.gold || 0),
        mines: topPerformer.fitnessBreakdown!.mines - (eliteMember.fitnessBreakdown?.mines || 0),
        survival: topPerformer.fitnessBreakdown!.survival - (eliteMember.fitnessBreakdown?.survival || 0),
        combat: topPerformer.fitnessBreakdown!.combat - (eliteMember.fitnessBreakdown?.combat || 0),
      },
      totalFitnessDelta: fitnessDelta,
      timestamp: Date.now()
    };

    setSynthesisLogs(prev => [synthLog, ...prev].slice(0, 50));
    setHistory(prev => [...prev, topPerformer.fitness]);
    
    // Create new generation
    const nextGen: PopulationMember[] = sortedResult.map((member, idx) => {
      const nextId = `G${generation + 1}-M${idx}`;
      // Elites keep their fitness for display during the next simulation phase
      if (idx === 0) return { ...member, status: 'Elite_Specimen', id: nextId, generation: generation + 1 };
      
      return { 
        id: nextId, 
        fitness: 0, // Reset for non-elites to show they are fresh
        accuracy: 0, 
        weights: NeuralEngine.mutateWeights(topPerformer.weights, 0.15, 0.08), 
        status: idx === 1 ? 'Direct_Heir' : 'Mutated_Child', 
        generation: generation + 1, 
        config: topPerformer.config,
        fitnessBreakdown: member.fitnessBreakdown // Preserve breakdown visually until next update
      };
    });

    setPopulation(nextGen);
    setGeneration(prev => prev + 1);
    setIsTraining(false);
  }, [population, generation, isTraining, headlessMode]);

  useEffect(() => {
    let timer: any;
    if (isAutoEvolving && !isTraining) {
      // Faster loop for headless as it is more resource intensive and we want higher throughput
      timer = setTimeout(runEvolutionStep, headlessMode ? 50 : 500);
    }
    return () => clearTimeout(timer);
  }, [isAutoEvolving, isTraining, generation, runEvolutionStep, headlessMode]);

  const loadBest = useCallback(() => {
    if (population.length === 0) return;
    const sorted = [...population].sort((a, b) => b.fitness - a.fitness);
    const best = sorted[0];
    setActiveNeuralWeights(best);
    setSelectedSpecimenId(best.id);
  }, [population]);

  const selectSpecimen = useCallback((id: string) => {
    setSelectedSpecimenId(id);
    const specimen = population.find(p => p.id === id);
    if (specimen) setActiveNeuralWeights(specimen);
  }, [population]);

  return {
    hiddenSize, numLayers, population, generation, history, isAutoEvolving, 
    isTraining, synthesisLogs, selectedSpecimenId, activeNeuralWeights,
    headlessMode, toggleHeadless,
    setIsAutoEvolving, resetEvolution, runEvolutionStep, loadBest, selectSpecimen
  };
}
