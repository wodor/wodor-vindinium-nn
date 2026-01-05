import { Hero } from '../../types';
import { FitnessWeights, HeroStats, FitnessBreakdown } from './types';
import { calculateGoldScore } from './goldMetric';
import { calculateMineScore } from './mineMetric';
import { calculateSurvivalScore } from './survivalMetric';
import { calculateExplorationScore } from './explorationMetric';

/**
 * Calculates weighted average fitness from individual metric scores.
 */
export function calculateFitness(
  goldScore: number,
  mineScore: number,
  survivalScore: number,
  explorationScore: number,
  weights: FitnessWeights
): number {
  const weightedSum = 
    (goldScore * weights.gold) + 
    (mineScore * weights.mine) + 
    (survivalScore * weights.survival) + 
    (explorationScore * weights.exploration);
  const weightSum = weights.gold + weights.mine + weights.survival + weights.exploration;
  return weightSum > 0 ? weightedSum / weightSum : 0;
}

/**
 * Calculates all fitness metrics for a hero after a game.
 */
export function calculateFitnessFromGame(
  hero: Hero,
  heroStats: HeroStats,
  allHeroes: Hero[],
  weights: FitnessWeights
): { fitness: number; breakdown: FitnessBreakdown } {
  const goldScore = calculateGoldScore(hero, allHeroes);
  const mineScore = calculateMineScore(hero);
  const survivalScore = calculateSurvivalScore(heroStats);
  const explorationScore = calculateExplorationScore(heroStats);
  const fitness = calculateFitness(goldScore, mineScore, survivalScore, explorationScore, weights);
  
  return {
    fitness,
    breakdown: { 
      gold: goldScore, 
      mines: mineScore, 
      survival: survivalScore, 
      exploration: explorationScore 
    }
  };
}
