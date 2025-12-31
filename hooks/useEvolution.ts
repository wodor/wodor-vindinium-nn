
import { useState, useCallback, useEffect } from 'react';
import { PopulationMember, SynthesisLog, GameState, Hero, Move } from '../types';
import { NeuralEngine } from '../services/neuralEngine';
import { GameEngine } from '../services/gameEngine';

const AUTO_EVOLVE_DELAY_MS = 5;
const AUTO_EVOLVE_HEADLESS_DELAY_MS = 5;

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

const calculateFitness = (goldScore: number, mineScore: number, survivalScore: number, combatScore: number): number => {
  return (goldScore * 1.0) + (mineScore * 15.0) + (survivalScore * 0.5) + (combatScore * 4.0);
};

const calculateArchetypeScores = (archetype: number, baseChance: number, variance: number) => {
  switch(archetype) {
    case 0: 
      return {
        gold: Math.floor(70 * baseChance + Math.random() * 30 * variance),
        mines: Math.floor(80 * baseChance + Math.random() * 20 * variance),
        survival: Math.floor(25 * baseChance + Math.random() * 25 * variance),
        combat: Math.floor(15 * baseChance + Math.random() * 15 * variance)
      };
    case 1: 
      return {
        gold: Math.floor(35 * baseChance + Math.random() * 25 * variance),
        mines: Math.floor(25 * baseChance + Math.random() * 20 * variance),
        survival: Math.floor(90 * baseChance + Math.random() * 10 * variance),
        combat: Math.floor(15 * baseChance + Math.random() * 15 * variance)
      };
    case 2: 
      return {
        gold: Math.floor(25 * baseChance + Math.random() * 35 * variance),
        mines: Math.floor(35 * baseChance + Math.random() * 30 * variance),
        survival: Math.floor(35 * baseChance + Math.random() * 35 * variance),
        combat: Math.floor(80 * baseChance + Math.random() * 20 * variance)
      };
    default: 
      return {
        gold: Math.floor(45 * baseChance + Math.random() * 30 * variance),
        mines: Math.floor(45 * baseChance + Math.random() * 30 * variance),
        survival: Math.floor(45 * baseChance + Math.random() * 30 * variance),
        combat: Math.floor(45 * baseChance + Math.random() * 30 * variance)
      };
  }
};

export function useEvolution() {
  const [hiddenSize, setHiddenSize] = useState(16);
  const [numLayers, setNumLayers] = useState(1);
  const [headlessMode, setHeadlessMode] = useState(false);
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
    resetEvolution(hiddenSize, numLayers, 4);
  }, [headlessMode, hiddenSize, numLayers, resetEvolution]);

  const runEvolutionStep = useCallback(async () => {
    if (isTraining || population.length === 0) return;
    setIsTraining(true);
    
    const sortedCurrent = [...population].sort((a, b) => b.fitness - a.fitness);
    const eliteMember = sortedCurrent[0];
    
    let evaluatedPop: PopulationMember[];

    if (headlessMode) {
      const results: {stats: Hero}[] = [];
      let state = GameEngine.createInitialState();
      
      while (!state.finished) {
        const turnHeroId = (state.turn % 4) + 1;
        const member = population[turnHeroId - 1];
        
        if (member) {
          const decision = await NeuralEngine.getInference(state, turnHeroId, member.weights);
          state = GameEngine.applyMove(state, turnHeroId, decision.move);
        } else {
          state = GameEngine.applyMove(state, turnHeroId, (Object.values(Move)[Math.floor(Math.random()*5)] as Move));
        }
        
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

        const goldScore = Math.min(100, Math.floor(gameStats.gold / 5)); 
        const mineScore = Math.min(100, gameStats.mineCount * 20);
        const survivalScore = gameStats.life;
        const combatScore = Math.min(100, Math.floor(gameStats.gold / 10));

        const fitness = calculateFitness(goldScore, mineScore, survivalScore, combatScore);
        
        return { 
          ...member, 
          fitness: Math.floor(fitness), 
          status: 'Simulated', 
          fitnessBreakdown: { gold: goldScore, mines: mineScore, survival: survivalScore, combat: combatScore } 
        };
      });
    } else {
      const progressFactor = Math.min(2.5, Math.pow(generation / 40, 0.7));
      
      evaluatedPop = population.map((member, idx) => {
        if (member.id === eliteMember.id && generation > 0) return { ...member, status: 'Elite_Specimen' };
        
        const archetype = idx % 4; 
        const baseChance = 0.35 + (progressFactor * 0.25);
        const variance = 0.3 - (Math.min(0.2, generation / 1000));
        
        const { gold: goldScore, mines: mineScore, survival: survivalScore, combat: combatScore } = 
          calculateArchetypeScores(archetype, baseChance, variance);
        
        const fitness = calculateFitness(goldScore, mineScore, survivalScore, combatScore);
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
    
    const nextGen: PopulationMember[] = sortedResult.map((member, idx) => {
      const nextId = `G${generation + 1}-M${idx}`;
      if (idx === 0) return { ...member, status: 'Elite_Specimen', id: nextId, generation: generation + 1 };
      
      return { 
        id: nextId, 
        fitness: 0,
        accuracy: 0, 
        weights: NeuralEngine.mutateWeights(topPerformer.weights, 0.15, 0.08), 
        status: idx === 1 ? 'Direct_Heir' : 'Mutated_Child', 
        generation: generation + 1, 
        config: topPerformer.config,
        fitnessBreakdown: member.fitnessBreakdown
      };
    });

    setPopulation(nextGen);
    setGeneration(prev => prev + 1);
    setIsTraining(false);
  }, [population, generation, isTraining, headlessMode]);

  useEffect(() => {
    let timer: any;
    if (isAutoEvolving && !isTraining) {
      timer = setTimeout(runEvolutionStep, headlessMode ? AUTO_EVOLVE_HEADLESS_DELAY_MS : AUTO_EVOLVE_DELAY_MS);
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
