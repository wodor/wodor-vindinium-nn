
import { useState, useCallback, useEffect } from 'react';
import { PopulationMember, SynthesisLog, GameState, Hero, Move } from '../types';
import { NeuralEngine } from '../services/neuralEngine';
import { GameEngine } from '../services/gameEngine';

type FitnessWeights = {
  gold: number;
  mine: number;
  survival: number;
  combat: number;
};

const AUTO_EVOLVE_DELAY_MS = 1;
const AUTO_EVOLVE_HEADLESS_DELAY_MS = 1;
const DEFAULT_POPULATION_SIZE = 4;
const HEADLESS_POPULATION_SIZE = 16;
const DEFAULT_WEIGHTS: FitnessWeights = { gold: 3, mine: 1, survival: 1, combat: 1 };

const createInitialPopulation = (size: number, hiddenSize: number, layers: number, generation: number = 0): PopulationMember[] => 
  Array.from({ length: size }, (_, i) => ({
    id: `G${generation}-M${i}`,
    fitness: 0, 
    accuracy: 0,
    status: 'Awaiting',
    weights: NeuralEngine.createRandomWeights(hiddenSize, layers),
    generation: generation,
    config: { hiddenSize, numLayers: layers },
    fitnessBreakdown: { gold: 0, mines: 0, survival: 0, combat: 0 },
    displayFitness: 0,
    displayBreakdown: { gold: 0, mines: 0, survival: 0, combat: 0 }
  }));

const calculateFitness = (
  goldScore: number,
  mineScore: number,
  survivalScore: number,
  combatScore: number,
  weights: FitnessWeights
): number => {
  return (goldScore * weights.gold) + (mineScore * weights.mine) + (survivalScore * weights.survival) + (combatScore * weights.combat);
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
  const [population, setPopulation] = useState<PopulationMember[]>(() => createInitialPopulation(DEFAULT_POPULATION_SIZE, 16, 1));
  const [generation, setGeneration] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [isAutoEvolving, setIsAutoEvolving] = useState(true);
  const [isTraining, setIsTraining] = useState(false);
  const [synthesisLogs, setSynthesisLogs] = useState<SynthesisLog[]>([]);
  const [selectedSpecimenId, setSelectedSpecimenId] = useState<string | null>(null);
  const [activeNeuralWeights, setActiveNeuralWeights] = useState<PopulationMember | null>(null);
  const [fitnessWeights, setFitnessWeights] = useState<FitnessWeights>(DEFAULT_WEIGHTS);

  const resetEvolution = useCallback((newSize: number, newLayers: number, newPopSize: number = DEFAULT_POPULATION_SIZE) => {
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
    resetEvolution(hiddenSize, numLayers, nextState ? HEADLESS_POPULATION_SIZE : DEFAULT_POPULATION_SIZE);
  }, [headlessMode, hiddenSize, numLayers, resetEvolution]);

  useEffect(() => {
    if (headlessMode && population.length !== HEADLESS_POPULATION_SIZE) {
      resetEvolution(hiddenSize, numLayers, HEADLESS_POPULATION_SIZE);
    }
  }, [headlessMode, population.length, hiddenSize, numLayers, resetEvolution]);

  const updateFitnessWeights = useCallback((partial: Partial<FitnessWeights>) => {
    setFitnessWeights(prev => ({ ...prev, ...partial }));
  }, []);

  const runEvolutionStep = useCallback(async () => {
    if (isTraining || population.length === 0) return;
    setIsTraining(true);
    
    const sortedCurrent = [...population].sort((a, b) => b.fitness - a.fitness);
    const eliteMember = sortedCurrent[0];
    
    let evaluatedPop: PopulationMember[];

    if (headlessMode) {
      const HEROES_PER_GAME = 4;
      const SIMULATIONS_PER_MEMBER = 4;
      const allFitnessScores: number[][] = Array.from({ length: population.length }, () => []);
      
      const allBreakdowns: Array<{gold: number, mines: number, survival: number, combat: number}[]> = 
        Array.from({ length: population.length }, () => []);
      
      for (let groupStart = 0; groupStart < population.length; groupStart += HEROES_PER_GAME) {
        for (let sim = 0; sim < SIMULATIONS_PER_MEMBER; sim++) {
          let state = GameEngine.createInitialState();
          const groupMembers = population.slice(groupStart, groupStart + HEROES_PER_GAME);
          
          while (!state.finished) {
            const turnHeroId = (state.turn % 4) + 1;
            const groupIdx = turnHeroId - 1;
            
            if (groupIdx < groupMembers.length) {
              const member = groupMembers[groupIdx];
              const decision = await NeuralEngine.getInference(state, turnHeroId, member.weights);
              state = GameEngine.applyMove(state, turnHeroId, decision.move);
            } else {
              state = GameEngine.applyMove(state, turnHeroId, (Object.values(Move)[Math.floor(Math.random()*5)] as Move));
            }
            
            if (state.turn % 100 === 0) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }
          
          state.heroes.forEach((h, heroIdx) => {
            const popIdx = groupStart + heroIdx;
            if (popIdx < population.length) {
              const goldScore = Math.min(100, Math.floor(h.gold / 5)); 
              const mineScore = Math.min(100, h.mineCount * 20);
              const survivalScore = h.life;
              const combatScore = Math.min(100, Math.floor(h.gold / 10));
              const fitness = calculateFitness(goldScore, mineScore, survivalScore, combatScore, fitnessWeights);
              allFitnessScores[popIdx].push(fitness);
              allBreakdowns[popIdx].push({ gold: goldScore, mines: mineScore, survival: survivalScore, combat: combatScore });
            }
          });
        }
      }

      evaluatedPop = population.map((member, idx) => {
        const fitnessValues = allFitnessScores[idx];
        if (fitnessValues.length === 0) return member;
        
        const avgFitness = fitnessValues.reduce((sum, f) => sum + f, 0) / fitnessValues.length;
        const breakdowns = allBreakdowns[idx];
        const avgBreakdown = {
          gold: Math.floor(breakdowns.reduce((sum, b) => sum + b.gold, 0) / breakdowns.length),
          mines: Math.floor(breakdowns.reduce((sum, b) => sum + b.mines, 0) / breakdowns.length),
          survival: Math.floor(breakdowns.reduce((sum, b) => sum + b.survival, 0) / breakdowns.length),
          combat: Math.floor(breakdowns.reduce((sum, b) => sum + b.combat, 0) / breakdowns.length)
        };
        
        return { 
          ...member, 
          fitness: Math.floor(avgFitness), 
          status: 'Simulated', 
          fitnessBreakdown: avgBreakdown,
          displayFitness: Math.floor(avgFitness),
          displayBreakdown: avgBreakdown
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
        
        const fitness = calculateFitness(goldScore, mineScore, survivalScore, combatScore, fitnessWeights);
        const fitnessBreakdown = { gold: goldScore, mines: mineScore, survival: survivalScore, combat: combatScore };
        return { 
          ...member, 
          fitness: Math.floor(fitness), 
          status: 'Evaluated', 
          fitnessBreakdown,
          displayFitness: Math.floor(fitness),
          displayBreakdown: fitnessBreakdown
        };
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
    
    const adaptiveMutationRate = headlessMode 
      ? Math.max(0.05, 0.25 - (generation / 500) * 0.2)
      : 0.15;
    const adaptiveSigma = headlessMode
      ? Math.max(0.03, 0.12 - (generation / 500) * 0.09)
      : 0.08;
    
    let nextGen: PopulationMember[];
    
    if (headlessMode) {
      const displayLookup = new Map<string, { fitness: number; breakdown?: { gold: number; mines: number; survival: number; combat: number } }>(
        evaluatedPop.map(m => [m.id, { fitness: m.fitness, breakdown: m.fitnessBreakdown }])
      );
      const eliteCount = 4;
      const elites = sortedResult.slice(0, eliteCount);
      const children: PopulationMember[] = [];
      
      for (let i = 0; i < population.length - eliteCount; i++) {
        const parent1 = elites[Math.floor(Math.random() * eliteCount)];
        const parent2 = elites[Math.floor(Math.random() * eliteCount)];
        
        let childWeights = NeuralEngine.crossover(parent1.weights, parent2.weights, 0.5);
        childWeights = NeuralEngine.mutateWeights(childWeights, adaptiveMutationRate, adaptiveSigma);
        const parentDisplayA = displayLookup.get(parent1.id);
        const parentDisplayB = displayLookup.get(parent2.id);
        const averagedDisplayFitness = Math.floor(((parentDisplayA?.fitness || 0) + (parentDisplayB?.fitness || 0)) / 2);
        
        children.push({
          id: `G${generation + 1}-M${eliteCount + i}`,
          fitness: 0,
          accuracy: 0,
          weights: childWeights,
          status: 'Mutated_Child',
          generation: generation + 1,
          config: parent1.config,
          fitnessBreakdown: { gold: 0, mines: 0, survival: 0, combat: 0 },
          displayFitness: averagedDisplayFitness,
          displayBreakdown: parentDisplayA?.breakdown || parentDisplayB?.breakdown
        });
      }
      
      nextGen = [
        ...elites.map((member, idx) => {
          const snapshot = displayLookup.get(member.id);
          return {
            ...member,
            id: `G${generation + 1}-M${idx}`,
            status: idx === 0 ? 'Elite_Specimen' : (idx === 1 ? 'Direct_Heir' : 'Elite_Child'),
            generation: generation + 1,
            displayFitness: snapshot?.fitness ?? member.fitness,
            displayBreakdown: snapshot?.breakdown ?? member.fitnessBreakdown
          };
        }),
        ...children
      ];
    } else {
      nextGen = sortedResult.map((member, idx) => {
        const nextId = `G${generation + 1}-M${idx}`;
        if (idx === 0) return { ...member, status: 'Elite_Specimen', id: nextId, generation: generation + 1, displayFitness: member.displayFitness ?? member.fitness, displayBreakdown: member.displayBreakdown ?? member.fitnessBreakdown };
        
        return { 
          id: nextId, 
          fitness: 0,
          accuracy: 0, 
          weights: NeuralEngine.mutateWeights(topPerformer.weights, adaptiveMutationRate, adaptiveSigma), 
          status: idx === 1 ? 'Direct_Heir' : 'Mutated_Child', 
          generation: generation + 1, 
          config: topPerformer.config,
          fitnessBreakdown: member.fitnessBreakdown,
          displayFitness: member.displayFitness ?? member.fitness,
          displayBreakdown: member.displayBreakdown ?? member.fitnessBreakdown
        };
      });
    }

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
    headlessMode, toggleHeadless, fitnessWeights, updateFitnessWeights,
    setIsAutoEvolving, resetEvolution, runEvolutionStep, loadBest, selectSpecimen
  };
}
