import { HeroStats } from './types';

/**
 * Calculates survival score based on average HP and death count (0-100).
 * Factors: 70% average HP, 30% death penalty (25 points per death).
 */
export function calculateSurvivalScore(heroStats: HeroStats): number {
  const avgHP = heroStats.resilience.turnCount > 0 
    ? heroStats.resilience.totalHP / heroStats.resilience.turnCount 
    : 0;
  const deathPenalty = heroStats.resilience.deaths * 25;
  return Math.max(0, Math.min(100, (avgHP * 0.7) + ((100 - deathPenalty) * 0.3)));
}
