import { describe, it, expect } from 'vitest';
import { calculateGoldScore } from './goldMetric';
import { Hero } from '../../types';

const createHero = (id: number, gold: number): Hero => ({
  id,
  name: `Hero ${id}`,
  pos: { x: 0, y: 0 },
  spawnPos: { x: 0, y: 0 },
  life: 100,
  gold,
  mineCount: 0,
  crashed: false
});

describe('calculateGoldScore', () => {
  it('returns 0 when total gold is 0', () => {
    const hero = createHero(1, 0);
    const allHeroes = [hero, createHero(2, 0), createHero(3, 0), createHero(4, 0)];
    expect(calculateGoldScore(hero, allHeroes)).toBe(0);
  });

  it('returns 100 when hero has all the gold', () => {
    const hero = createHero(1, 100);
    const allHeroes = [hero, createHero(2, 0), createHero(3, 0), createHero(4, 0)];
    expect(calculateGoldScore(hero, allHeroes)).toBe(100);
  });

  it('returns 50 when hero has half the total gold', () => {
    const hero = createHero(1, 50);
    const allHeroes = [hero, createHero(2, 50), createHero(3, 0), createHero(4, 0)];
    expect(calculateGoldScore(hero, allHeroes)).toBe(50);
  });

  it('returns 25 for fair share (equal distribution)', () => {
    const hero = createHero(1, 100);
    const allHeroes = [hero, createHero(2, 100), createHero(3, 100), createHero(4, 100)];
    expect(calculateGoldScore(hero, allHeroes)).toBe(25);
  });

  it('returns 0 when hero has no gold but others do', () => {
    const hero = createHero(1, 0);
    const allHeroes = [hero, createHero(2, 100), createHero(3, 100), createHero(4, 100)];
    expect(calculateGoldScore(hero, allHeroes)).toBe(0);
  });

  it('caps at 100', () => {
    const hero = createHero(1, 1000);
    const allHeroes = [hero];
    expect(calculateGoldScore(hero, allHeroes)).toBe(100);
  });
});
