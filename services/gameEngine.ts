
// Fix: Remove non-existent TileType export from types
import { GameState, Hero, Pos, Move } from '../types';
import { GAME_RULES } from '../constants';

const DEFAULT_TILES = 
  "####      ####" +
  "##  $-    ##" +
  "    []      " +
  "            " +
  "@1      @2  " +
  "    $-      " +
  "      $-    " +
  "            " +
  "@3      @4  " +
  "    []      " +
  "##  $-    ##" +
  "####      ####";

export class GameEngine {
  static createInitialState(size: number = 12): GameState {
    const heroes: Hero[] = [
      { id: 1, name: "Gemini Hero", pos: { x: 1, y: 1 }, spawnPos: { x: 1, y: 1 }, life: 100, gold: 0, mineCount: 0, crashed: false },
      { id: 2, name: "Bot 2", pos: { x: size - 2, y: 1 }, spawnPos: { x: size - 2, y: 1 }, life: 100, gold: 0, mineCount: 0, crashed: false },
      { id: 3, name: "Bot 3", pos: { x: 1, y: size - 2 }, spawnPos: { x: 1, y: size - 2 }, life: 100, gold: 0, mineCount: 0, crashed: false },
      { id: 4, name: "Bot 4", pos: { x: size - 2, y: size - 2 }, spawnPos: { x: size - 2, y: size - 2 }, life: 100, gold: 0, mineCount: 0, crashed: false }
    ];

    // Simple procedural-ish map or static one
    // Each tile is 2 characters
    const tiles = Array(size * size).fill('  ');
    // Add walls
    for (let i = 0; i < size; i++) {
        tiles[i] = '##';
        tiles[size * (size - 1) + i] = '##';
        tiles[i * size] = '##';
        tiles[i * size + (size - 1)] = '##';
    }
    
    // Setup Hero Spawns
    tiles[1 * size + 1] = '@1';
    tiles[1 * size + (size - 2)] = '@2';
    tiles[(size - 2) * size + 1] = '@3';
    tiles[(size - 2) * size + (size - 2)] = '@4';
    
    // Random elements
    tiles[3 * size + 3] = '$-';
    tiles[3 * size + 8] = '$-';
    tiles[8 * size + 3] = '$-';
    tiles[8 * size + 8] = '$-';
    tiles[5 * size + 5] = '[]';
    tiles[5 * size + 6] = '[]';

    return {
      id: "local-sim-" + Date.now(),
      turn: 0,
      maxTurns: 300,
      heroes,
      board: {
        size,
        tiles: tiles.join('')
      },
      finished: false
    };
  }

  static applyMove(state: GameState, heroId: number, move: Move): GameState {
    const newState = JSON.parse(JSON.stringify(state)) as GameState;
    const heroIndex = newState.heroes.findIndex(h => h.id === heroId);
    const hero = newState.heroes[heroIndex];

    if (hero.life <= 0 || hero.crashed) return newState;

    const delta = { x: 0, y: 0 };
    if (move === Move.North) delta.y = -1;
    else if (move === Move.South) delta.y = 1;
    else if (move === Move.West) delta.x = -1;
    else if (move === Move.East) delta.x = 1;

    const newPos = { x: hero.pos.x + delta.x, y: hero.pos.y + delta.y };
    const tileIndex = newPos.y * state.board.size + newPos.x;
    const tilesArr = [];
    for (let i = 0; i < state.board.tiles.length; i += 2) {
      tilesArr.push(state.board.tiles.substring(i, i + 2));
    }
    const targetTile = tilesArr[tileIndex];

    // Interaction logic
    if (targetTile === '  ') {
        // Move
        hero.pos = newPos;
    } else if (targetTile === '##') {
        // Wall - stay
    } else if (targetTile === '[]') {
        // Tavern
        if (hero.gold >= GAME_RULES.TAVERN_COST) {
            hero.gold -= GAME_RULES.TAVERN_COST;
            hero.life = Math.min(GAME_RULES.INITIAL_LIFE, hero.life + GAME_RULES.TAVERN_HEAL);
        }
    } else if (targetTile.startsWith('$')) {
        // Mine
        const owner = targetTile[1];
        if (owner !== String(hero.id)) {
            if (hero.life > GAME_RULES.MINE_LIFE_COST) {
                hero.life -= GAME_RULES.MINE_LIFE_COST;
                // Capture
                tilesArr[tileIndex] = `$${hero.id}`;
                hero.mineCount++;
                // If it belonged to another hero, decrease their count
                const prevOwnerId = parseInt(owner);
                if (!isNaN(prevOwnerId)) {
                   const prevHero = newState.heroes.find(h => h.id === prevOwnerId);
                   if (prevHero) prevHero.mineCount--;
                }
            } else {
                hero.life = 1; // Almost dead
            }
        }
    } else if (targetTile.startsWith('@')) {
        // Hero attack
        const victimId = parseInt(targetTile[1]);
        const victim = newState.heroes.find(h => h.id === victimId);
        if (victim && victim.id !== hero.id) {
            victim.life -= GAME_RULES.ATTACK_DAMAGE;
            if (victim.life <= 0) {
                // Respawn logic simplified: clear mines
                tilesArr.forEach((t, idx) => {
                   if (t === `$${victim.id}`) tilesArr[idx] = '$-';
                });
                victim.mineCount = 0;
                victim.life = GAME_RULES.INITIAL_LIFE;
                victim.pos = { ...victim.spawnPos };
            }
        }
    }

    // Apply basic costs
    hero.life = Math.max(0, hero.life - GAME_RULES.MOVE_LIFE_COST);
    
    // Passive gold
    hero.gold += hero.mineCount * GAME_RULES.MINE_GOLD_PER_TURN;

    // Redraw map with current hero positions
    // Clear all hero tiles first
    tilesArr.forEach((t, idx) => {
        if (t.startsWith('@')) tilesArr[idx] = '  ';
    });
    // Add back all heroes
    newState.heroes.forEach(h => {
        const hIdx = h.pos.y * state.board.size + h.pos.x;
        tilesArr[hIdx] = `@${h.id}`;
    });

    newState.board.tiles = tilesArr.join('');
    newState.turn++;
    if (newState.turn >= newState.maxTurns) newState.finished = true;

    return newState;
  }
}
