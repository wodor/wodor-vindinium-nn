import { describe, it, expect } from 'vitest';
import { calculateMineScore } from './mineMetric';
import { Hero } from '../../types';

const createHero = (mineCount: number): Hero => ({
  id: 1,
  name: 'Hero 1',
  pos: { x: 0, y: 0 },
  spawnPos: { x: 0, y: 0 },
  life: 100,
  gold: 0,
  mineCount,
  crashed: false
});

describe('calculateMineScore', () => {
  it('returns 0 for 0 mines', () => {
    expect(calculateMineScore(createHero(0))).toBe(0);
  });

  it('returns 25 for 1 mine', () => {
    expect(calculateMineScore(createHero(1))).toBe(25);
  });

  it('returns 50 for 2 mines', () => {
    expect(calculateMineScore(createHero(2))).toBe(50);
  });

  it('returns 75 for 3 mines', () => {
    expect(calculateMineScore(createHero(3))).toBe(75);
  });

  it('returns 100 for 4 mines', () => {
    expect(calculateMineScore(createHero(4))).toBe(100);
  });

  it('caps at 100 for more than 4 mines', () => {
    expect(calculateMineScore(createHero(5))).toBe(100);
  });
});
