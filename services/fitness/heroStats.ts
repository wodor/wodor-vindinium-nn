import { Hero } from '../../types';
import { HeroStats } from './types';

/**
 * Creates initial empty stats map for all heroes.
 */
export function initializeStats(heroIds: number[]): Map<number, HeroStats> {
  const stats = new Map<number, HeroStats>();
  heroIds.forEach(id => {
    stats.set(id, {
      combat: { attacks: 0, kills: 0, minesStolen: 0 },
      resilience: { healthRecovered: 0, deaths: 0, totalHP: 0, turnCount: 0 },
      exploration: { uniqueTiles: new Set<string>(), turnsStayedStill: 0 },
      mineAcquisitionTurns: []
    });
  });
  return stats;
}

/**
 * Updates hero stats after a turn is processed.
 */
export function updateStatsAfterTurn(
  heroesBeforeMove: Hero[],
  heroesAfterMove: Hero[],
  mineCountsBeforeMove: Map<number, number>,
  initialMineCounts: Map<number, number>,
  stats: Map<number, HeroStats>,
  currentTurn: number,
  activeHeroId: number
): void {
  heroesBeforeMove.forEach(heroBeforeMove => {
    const heroAfterMove = heroesAfterMove.find(h => h.id === heroBeforeMove.id);
    if (!heroAfterMove) return;
    
    const heroStats = stats.get(heroBeforeMove.id)!;
    
    if (heroBeforeMove.life > 0 && heroAfterMove.life <= 0) {
      heroStats.resilience.deaths++;
      const attacker = heroesAfterMove.find(h => 
        h.id !== heroBeforeMove.id && 
        h.pos.x === heroBeforeMove.pos.x && 
        h.pos.y === heroBeforeMove.pos.y &&
        heroesBeforeMove.find(before => before.id === h.id)?.life > 0
      );
      if (attacker) {
        const attackerStats = stats.get(attacker.id);
        if (attackerStats) {
          attackerStats.combat.kills++;
          attackerStats.combat.attacks++;
        }
      }
    }
    
    if (heroAfterMove.life > heroBeforeMove.life && heroBeforeMove.life < 100) {
      const healthGained = heroAfterMove.life - heroBeforeMove.life;
      heroStats.resilience.healthRecovered += healthGained;
    }
    
    if (heroAfterMove.life > 0) {
      heroStats.resilience.totalHP += heroAfterMove.life;
      heroStats.resilience.turnCount++;
    }
    
    const mineCountBefore = mineCountsBeforeMove.get(heroBeforeMove.id) || 0;
    if (heroAfterMove.mineCount > mineCountBefore) {
      const initialMines = initialMineCounts.get(heroBeforeMove.id) || 0;
      const newMines = heroAfterMove.mineCount - mineCountBefore;
      if (mineCountBefore <= initialMines) {
        heroStats.combat.minesStolen += newMines;
      }
      for (let i = 0; i < newMines; i++) {
        heroStats.mineAcquisitionTurns.push(currentTurn);
      }
    }
    
    if (heroBeforeMove.id === activeHeroId) {
      const posKey = `${heroAfterMove.pos.x},${heroAfterMove.pos.y}`;
      heroStats.exploration.uniqueTiles.add(posKey);
      if (heroBeforeMove.pos.x === heroAfterMove.pos.x && 
          heroBeforeMove.pos.y === heroAfterMove.pos.y) {
        heroStats.exploration.turnsStayedStill++;
      }
    }
  });
}
