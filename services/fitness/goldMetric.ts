import { Hero } from '../../types';

/**
 * Calculates gold score as hero's share of total gold (0-100).
 * 0 = no gold collected, 25 = fair share (1/4 of total), 100 = all gold.
 */
export function calculateGoldScore(hero: Hero, allHeroes: Hero[]): number {
  const totalGold = allHeroes.reduce((sum, h) => sum + h.gold, 0);
  if (totalGold === 0) {
    return 0;
  }
  return Math.min(100, Math.floor((hero.gold / totalGold) * 100));
}
