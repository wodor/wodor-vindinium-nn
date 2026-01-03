
import { GameState, Hero, Pos, Move } from '../types';
import { GAME_RULES } from '../constants';

export class GameEngine {
  private static parseTilesToStringArray(tiles: string): string[] {
    const tilesArr: string[] = [];
    for (let i = 0; i < tiles.length; i += 2) {
      tilesArr.push(tiles.substring(i, i + 2));
    }
    return tilesArr;
  }

  static createInitialState(size: number = 12, maxTurns: number = 300): GameState {
    const heroes: Hero[] = [
      { id: 1, name: "Gemini Hero", pos: { x: 1, y: 1 }, spawnPos: { x: 1, y: 1 }, life: 100, gold: 0, mineCount: 0, crashed: false },
      { id: 2, name: "Bot 2", pos: { x: size - 2, y: 1 }, spawnPos: { x: size - 2, y: 1 }, life: 100, gold: 0, mineCount: 0, crashed: false },
      { id: 3, name: "Bot 3", pos: { x: 1, y: size - 2 }, spawnPos: { x: 1, y: size - 2 }, life: 100, gold: 0, mineCount: 0, crashed: false },
      { id: 4, name: "Bot 4", pos: { x: size - 2, y: size - 2 }, spawnPos: { x: size - 2, y: size - 2 }, life: 100, gold: 0, mineCount: 0, crashed: false }
    ];

    const tiles = Array(size * size).fill('  ');
    for (let i = 0; i < size; i++) {
        tiles[i] = '##';
        tiles[size * (size - 1) + i] = '##';
        tiles[i * size] = '##';
        tiles[i * size + (size - 1)] = '##';
    }
    
    tiles[1 * size + 1] = '@1';
    tiles[1 * size + (size - 2)] = '@2';
    tiles[(size - 2) * size + 1] = '@3';
    tiles[(size - 2) * size + (size - 2)] = '@4';
    
    tiles[3 * size + 3] = '$-';
    tiles[3 * size + 8] = '$-';
    tiles[8 * size + 3] = '$-';
    tiles[8 * size + 8] = '$-';
    tiles[5 * size + 5] = '[]';
    tiles[5 * size + 6] = '[]';

    return {
      id: "local-sim-" + Date.now(),
      turn: 0,
      maxTurns,
      heroes,
      board: {
        size,
        tiles: tiles.join('')
      },
      finished: false
    };
  }

  private static handleDeath(hero: Hero, allHeroes: Hero[], tilesArr: string[]) {
    tilesArr.forEach((t, idx) => {
        if (t === `$${hero.id}`) tilesArr[idx] = '$-';
    });
    hero.mineCount = 0;
    
    const occupant = allHeroes.find(h => 
      h.id !== hero.id && 
      h.pos.x === hero.spawnPos.x && 
      h.pos.y === hero.spawnPos.y
    );
    
    hero.pos = { ...hero.spawnPos };
    hero.life = GAME_RULES.INITIAL_LIFE;

    if (occupant) {
      this.handleDeath(occupant, allHeroes, tilesArr);
    }
  }

  static applyMove(state: GameState, heroId: number, move: Move): GameState {
    const heroIndex = state.heroes.findIndex(h => h.id === heroId);
    
    const newState: GameState = {
      ...state,
      heroes: state.heroes.map((h, idx) => idx === heroIndex ? { ...h } : h),
      board: { ...state.board }
    };
    const hero = newState.heroes[heroIndex];

    const finishTurn = () => {
      newState.turn++;
      if (newState.turn >= newState.maxTurns) newState.finished = true;
    };

    if (hero.crashed) {
      finishTurn();
      return newState;
    }

    if (hero.life <= 0) {
      const tilesArr = this.parseTilesToStringArray(state.board.tiles);
      this.handleDeath(hero, newState.heroes, tilesArr);
      newState.board.tiles = tilesArr.join('');
      finishTurn();
      return newState;
    }

    hero.lastPos = { ...hero.pos };

    const delta = { x: 0, y: 0 };
    if (move === Move.North) delta.y = -1;
    else if (move === Move.South) delta.y = 1;
    else if (move === Move.West) delta.x = -1;
    else if (move === Move.East) delta.x = 1;

    const newPos = { x: hero.pos.x + delta.x, y: hero.pos.y + delta.y };
    
    const tilesArr = this.parseTilesToStringArray(state.board.tiles);

    hero.life = Math.max(1, hero.life - GAME_RULES.MOVE_LIFE_COST);

    if (newPos.x >= 0 && newPos.x < state.board.size && newPos.y >= 0 && newPos.y < state.board.size) {
        const tileIndex = newPos.y * state.board.size + newPos.x;
        const targetTile = tilesArr[tileIndex];

        if (targetTile === '  ') {
            hero.pos = newPos;
        } else if (targetTile === '##') {
        } else if (targetTile === '[]') {
            if (hero.gold >= GAME_RULES.TAVERN_COST) {
                hero.gold -= GAME_RULES.TAVERN_COST;
                hero.life = Math.min(GAME_RULES.INITIAL_LIFE, hero.life + GAME_RULES.TAVERN_HEAL);
            }
        } else if (targetTile && targetTile.startsWith('$')) {
            const owner = targetTile[1];
            if (owner !== String(hero.id)) {
                if (hero.life > GAME_RULES.MINE_LIFE_COST) {
                    hero.life -= GAME_RULES.MINE_LIFE_COST;
                    tilesArr[tileIndex] = `$${hero.id}`;
                    hero.mineCount++;
                    const prevOwnerId = parseInt(owner);
                    if (!isNaN(prevOwnerId)) {
                       const prevHeroIndex = newState.heroes.findIndex(h => h.id === prevOwnerId);
                       if (prevHeroIndex !== -1) {
                         newState.heroes[prevHeroIndex] = { ...newState.heroes[prevHeroIndex], mineCount: newState.heroes[prevHeroIndex].mineCount - 1 };
                       }
                    }
                } else {
                    hero.life = 0;
                    this.handleDeath(hero, newState.heroes, tilesArr);
                }
            }
        } else if (targetTile && targetTile.startsWith('@')) {
            const victimId = parseInt(targetTile[1]);
            const victimIndex = newState.heroes.findIndex(h => h.id === victimId);
            if (victimIndex !== -1 && newState.heroes[victimIndex].id !== hero.id) {
                const victim = newState.heroes[victimIndex];
                const newLife = victim.life - GAME_RULES.ATTACK_DAMAGE;
                newState.heroes[victimIndex] = { ...victim, life: newLife };
                if (newLife <= 0) {
                    this.handleDeath(newState.heroes[victimIndex], newState.heroes, tilesArr);
                }
            }
        }
    }

    hero.gold += hero.mineCount * GAME_RULES.MINE_GOLD_PER_TURN;

    tilesArr.forEach((t, idx) => {
        if (t && t.startsWith('@')) tilesArr[idx] = '  ';
    });
    newState.heroes.forEach(h => {
        const hIdx = h.pos.y * state.board.size + h.pos.x;
        tilesArr[hIdx] = `@${h.id}`;
    });

    newState.board.tiles = tilesArr.join('');
    finishTurn();

    return newState;
  }
}
