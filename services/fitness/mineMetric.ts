import { Hero } from '../../types';

const TOTAL_MINES = 4;

/**
 * Calculates mine score based on current mine ownership (0-100).
 * 0 mines = 0, 1 mine = 25, 2 mines = 50, 4 mines = 100.
 */
export function calculateMineScore(hero: Hero): number {
  return Math.min(100, Math.floor((hero.mineCount / TOTAL_MINES) * 100));
}
