export type { FitnessWeights, HeroStats, FitnessBreakdown } from './types';
export { DEFAULT_FITNESS_WEIGHTS } from './types';
export { calculateGoldScore } from './goldMetric';
export { calculateMineScore } from './mineMetric';
export { calculateSurvivalScore } from './survivalMetric';
export { calculateExplorationScore } from './explorationMetric';
export { calculateFitness, calculateFitnessFromGame } from './combinedFitness';
export { initializeStats, updateStatsAfterTurn } from './heroStats';
