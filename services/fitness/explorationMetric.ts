import { HeroStats } from './types';

/**
 * Calculates exploration score based on unique tiles visited (0-100).
 * +3 points per unique tile, -2 penalty per turn stayed still.
 */
export function calculateExplorationScore(heroStats: HeroStats): number {
  const uniqueTilesVisited = heroStats.exploration.uniqueTiles.size;
  const stayStillPenalty = heroStats.exploration.turnsStayedStill * 2;
  return Math.max(0, Math.min(100, (uniqueTilesVisited * 3) - stayStillPenalty));
}
