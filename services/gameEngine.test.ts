import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from './gameEngine';
import { GameState, Move, Hero } from '../types';
import { GAME_RULES } from '../constants';

function createTestState(size: number = 12): GameState {
  const tiles = Array(size * size).fill('  ');
  for (let i = 0; i < size; i++) {
    tiles[i] = '##';
    tiles[size * (size - 1) + i] = '##';
    tiles[i * size] = '##';
    tiles[i * size + (size - 1)] = '##';
  }

  const heroes: Hero[] = [
    { id: 1, name: "Hero 1", pos: { x: 5, y: 5 }, spawnPos: { x: 1, y: 1 }, life: 100, gold: 0, mineCount: 0, crashed: false },
    { id: 2, name: "Hero 2", pos: { x: 6, y: 6 }, spawnPos: { x: 10, y: 10 }, life: 100, gold: 0, mineCount: 0, crashed: false },
    { id: 3, name: "Hero 3", pos: { x: 7, y: 7 }, spawnPos: { x: 1, y: 10 }, life: 100, gold: 0, mineCount: 0, crashed: false },
    { id: 4, name: "Hero 4", pos: { x: 8, y: 8 }, spawnPos: { x: 10, y: 1 }, life: 100, gold: 0, mineCount: 0, crashed: false }
  ];

  heroes.forEach(h => {
    const idx = h.pos.y * size + h.pos.x;
    tiles[idx] = `@${h.id}`;
  });

  return {
    id: "test-state",
    turn: 0,
    maxTurns: 300,
    heroes,
    board: { size, tiles: tiles.join('') },
    finished: false
  };
}

describe('GameEngine', () => {
  describe('createInitialState', () => {
    it('should create initial state with correct board size', () => {
      const state = GameEngine.createInitialState(12);
      
      expect(state.board.size).toBe(12);
      expect(state.turn).toBe(0);
      expect(state.maxTurns).toBe(300);
      expect(state.finished).toBe(false);
    });

    it('should create 4 heroes at correct spawn positions', () => {
      const state = GameEngine.createInitialState(12);
      
      expect(state.heroes).toHaveLength(4);
      
      expect(state.heroes[0]).toMatchObject({
        id: 1,
        name: 'Gemini Hero',
        pos: { x: 1, y: 1 },
        spawnPos: { x: 1, y: 1 },
        life: GAME_RULES.INITIAL_LIFE,
        gold: 0,
        mineCount: 0,
        crashed: false
      });
      
      expect(state.heroes[1]).toMatchObject({
        id: 2,
        pos: { x: 10, y: 1 },
        spawnPos: { x: 10, y: 1 }
      });
      
      expect(state.heroes[2]).toMatchObject({
        id: 3,
        pos: { x: 1, y: 10 },
        spawnPos: { x: 1, y: 10 }
      });
      
      expect(state.heroes[3]).toMatchObject({
        id: 4,
        pos: { x: 10, y: 10 },
        spawnPos: { x: 10, y: 10 }
      });
    });

    it('should place heroes on board tiles correctly', () => {
      const state = GameEngine.createInitialState(12);
      const tiles = state.board.tiles;
      
      const hero1Tile = tiles.substring((1 * 12 + 1) * 2, (1 * 12 + 1) * 2 + 2);
      const hero2Tile = tiles.substring((1 * 12 + 10) * 2, (1 * 12 + 10) * 2 + 2);
      const hero3Tile = tiles.substring((10 * 12 + 1) * 2, (10 * 12 + 1) * 2 + 2);
      const hero4Tile = tiles.substring((10 * 12 + 10) * 2, (10 * 12 + 10) * 2 + 2);
      
      expect(hero1Tile).toBe('@1');
      expect(hero2Tile).toBe('@2');
      expect(hero3Tile).toBe('@3');
      expect(hero4Tile).toBe('@4');
    });

    it('should place initial mines and taverns', () => {
      const state = GameEngine.createInitialState(12);
      const tiles = state.board.tiles;
      
      const mineTile = tiles.substring((3 * 12 + 3) * 2, (3 * 12 + 3) * 2 + 2);
      const tavernTile = tiles.substring((5 * 12 + 5) * 2, (5 * 12 + 5) * 2 + 2);
      
      expect(mineTile).toBe('$-');
      expect(tavernTile).toBe('[]');
    });
  });

  describe('applyMove', () => {
    describe('Movement in all directions', () => {
      it('should move hero north', () => {
        const state = createTestState();
        const heroId = 1;
        const initialPos = { ...state.heroes[0].pos };
        
        const newState = GameEngine.applyMove(state, heroId, Move.North);
        
        expect(newState.heroes[0].pos.y).toBe(initialPos.y - 1);
        expect(newState.heroes[0].pos.x).toBe(initialPos.x);
      });

      it('should move hero south', () => {
        const state = createTestState();
        const heroId = 1;
        const initialPos = { ...state.heroes[0].pos };
        
        const newState = GameEngine.applyMove(state, heroId, Move.South);
        
        expect(newState.heroes[0].pos.y).toBe(initialPos.y + 1);
        expect(newState.heroes[0].pos.x).toBe(initialPos.x);
      });

      it('should move hero east', () => {
        const state = createTestState();
        const heroId = 1;
        const initialPos = { ...state.heroes[0].pos };
        
        const newState = GameEngine.applyMove(state, heroId, Move.East);
        
        expect(newState.heroes[0].pos.x).toBe(initialPos.x + 1);
        expect(newState.heroes[0].pos.y).toBe(initialPos.y);
      });

      it('should move hero west', () => {
        const state = createTestState();
        const heroId = 1;
        const initialPos = { ...state.heroes[0].pos };
        
        const newState = GameEngine.applyMove(state, heroId, Move.West);
        
        expect(newState.heroes[0].pos.x).toBe(initialPos.x - 1);
        expect(newState.heroes[0].pos.y).toBe(initialPos.y);
      });

      it('should handle Stay move', () => {
        const state = createTestState();
        const heroId = 1;
        const initialPos = { ...state.heroes[0].pos };
        const initialLife = state.heroes[0].life;
        
        const newState = GameEngine.applyMove(state, heroId, Move.Stay);
        
        expect(newState.heroes[0].pos.x).toBe(initialPos.x);
        expect(newState.heroes[0].pos.y).toBe(initialPos.y);
        expect(newState.heroes[0].life).toBe(initialLife - GAME_RULES.MOVE_LIFE_COST);
      });
    });

    describe('Wall collision', () => {
      it('should not move hero into wall', () => {
        const state = GameEngine.createInitialState(12);
        const heroId = 1;
        
        const newState = GameEngine.applyMove(state, heroId, Move.West);
        
        expect(newState.heroes[0].pos.x).toBe(1);
        expect(newState.heroes[0].pos.y).toBe(1);
      });

      it('should reduce life even when hitting wall', () => {
        const state = GameEngine.createInitialState(12);
        const heroId = 1;
        const initialLife = state.heroes[0].life;
        
        const newState = GameEngine.applyMove(state, heroId, Move.West);
        
        expect(newState.heroes[0].life).toBe(initialLife - GAME_RULES.MOVE_LIFE_COST);
      });
    });

    describe('Tavern healing', () => {
      it('should heal hero when entering tavern with sufficient gold', () => {
        const state = createTestState();
        const heroId = 1;
        state.heroes[0].gold = GAME_RULES.TAVERN_COST;
        state.heroes[0].life = 50;
        
        const tiles = state.board.tiles.split('');
        const heroPos = state.heroes[0].pos;
        const tavernPos = { x: heroPos.x + 1, y: heroPos.y };
        const tavernIdx = tavernPos.y * state.board.size + tavernPos.x;
        tiles[tavernIdx * 2] = '[';
        tiles[tavernIdx * 2 + 1] = ']';
        state.board.tiles = tiles.join('');
        
        const newState = GameEngine.applyMove(state, heroId, Move.East);
        
        expect(newState.heroes[0].gold).toBe(0);
        expect(newState.heroes[0].life).toBe(50 + GAME_RULES.TAVERN_HEAL - GAME_RULES.MOVE_LIFE_COST);
      });

      it('should not heal hero when entering tavern without sufficient gold', () => {
        const state = createTestState();
        const heroId = 1;
        state.heroes[0].gold = GAME_RULES.TAVERN_COST - 1;
        state.heroes[0].life = 50;
        const initialLife = state.heroes[0].life;
        
        const tiles = state.board.tiles.split('');
        const heroPos = state.heroes[0].pos;
        const tavernPos = { x: heroPos.x + 1, y: heroPos.y };
        const tavernIdx = tavernPos.y * state.board.size + tavernPos.x;
        tiles[tavernIdx * 2] = '[';
        tiles[tavernIdx * 2 + 1] = ']';
        state.board.tiles = tiles.join('');
        
        const newState = GameEngine.applyMove(state, heroId, Move.East);
        
        expect(newState.heroes[0].gold).toBe(GAME_RULES.TAVERN_COST - 1);
        expect(newState.heroes[0].life).toBe(initialLife - GAME_RULES.MOVE_LIFE_COST);
      });

      it('should cap healing at initial life', () => {
        const state = createTestState();
        const heroId = 1;
        state.heroes[0].gold = GAME_RULES.TAVERN_COST;
        state.heroes[0].life = 95;
        
        const tiles = state.board.tiles.split('');
        const heroPos = state.heroes[0].pos;
        const tavernPos = { x: heroPos.x + 1, y: heroPos.y };
        const tavernIdx = tavernPos.y * state.board.size + tavernPos.x;
        tiles[tavernIdx * 2] = '[';
        tiles[tavernIdx * 2 + 1] = ']';
        state.board.tiles = tiles.join('');
        
        const newState = GameEngine.applyMove(state, heroId, Move.East);
        
        expect(newState.heroes[0].life).toBeLessThanOrEqual(GAME_RULES.INITIAL_LIFE);
      });
    });

    describe('Mine capture', () => {
      it('should capture neutral mine', () => {
        const state = createTestState();
        const heroId = 1;
        state.heroes[0].life = 50;
        
        const tiles = state.board.tiles.split('');
        const heroPos = state.heroes[0].pos;
        const minePos = { x: heroPos.x + 1, y: heroPos.y };
        const mineIdx = minePos.y * state.board.size + minePos.x;
        tiles[mineIdx * 2] = '$';
        tiles[mineIdx * 2 + 1] = '-';
        state.board.tiles = tiles.join('');
        
        const newState = GameEngine.applyMove(state, heroId, Move.East);
        
        expect(newState.heroes[0].mineCount).toBe(1);
        expect(newState.heroes[0].life).toBe(50 - GAME_RULES.MINE_LIFE_COST - GAME_RULES.MOVE_LIFE_COST);
        
        const newTiles = newState.board.tiles.split('');
        expect(newTiles[mineIdx * 2]).toBe('$');
        expect(newTiles[mineIdx * 2 + 1]).toBe('1');
      });

      it('should capture enemy-owned mine', () => {
        const state = createTestState();
        const heroId = 1;
        state.heroes[0].life = 50;
        state.heroes[1].mineCount = 1;
        
        const tiles = state.board.tiles.split('');
        const heroPos = state.heroes[0].pos;
        const minePos = { x: heroPos.x + 1, y: heroPos.y };
        const mineIdx = minePos.y * state.board.size + minePos.x;
        tiles[mineIdx * 2] = '$';
        tiles[mineIdx * 2 + 1] = '2';
        state.board.tiles = tiles.join('');
        
        const newState = GameEngine.applyMove(state, heroId, Move.East);
        
        expect(newState.heroes[0].mineCount).toBe(1);
        expect(newState.heroes[1].mineCount).toBe(0);
        expect(newState.heroes[0].life).toBe(50 - GAME_RULES.MINE_LIFE_COST - GAME_RULES.MOVE_LIFE_COST);
      });

      it('should not capture own mine', () => {
        const state = createTestState();
        const heroId = 1;
        state.heroes[0].mineCount = 1;
        
        const tiles = state.board.tiles.split('');
        const heroPos = state.heroes[0].pos;
        const minePos = { x: heroPos.x + 1, y: heroPos.y };
        const mineIdx = minePos.y * state.board.size + minePos.x;
        tiles[mineIdx * 2] = '$';
        tiles[mineIdx * 2 + 1] = '1';
        state.board.tiles = tiles.join('');
        
        const newState = GameEngine.applyMove(state, heroId, Move.East);
        
        expect(newState.heroes[0].mineCount).toBe(1);
      });

      it('should kill hero when capturing mine with insufficient HP', () => {
        const state = createTestState();
        const heroId = 1;
        state.heroes[0].life = GAME_RULES.MINE_LIFE_COST;
        
        const tiles = state.board.tiles.split('');
        const heroPos = state.heroes[0].pos;
        const minePos = { x: heroPos.x + 1, y: heroPos.y };
        const mineIdx = minePos.y * state.board.size + minePos.x;
        tiles[mineIdx * 2] = '$';
        tiles[mineIdx * 2 + 1] = '-';
        state.board.tiles = tiles.join('');
        
        const newState = GameEngine.applyMove(state, heroId, Move.East);
        
        expect(newState.heroes[0].life).toBe(GAME_RULES.INITIAL_LIFE);
        expect(newState.heroes[0].pos).toEqual(newState.heroes[0].spawnPos);
        expect(newState.heroes[0].mineCount).toBe(0);
      });
    });

    describe('Hero attack', () => {
      it('should attack enemy hero on same tile', () => {
        const state = createTestState();
        const heroId = 1;
        const victimId = 2;
        state.heroes[0].pos = { x: 6, y: 6 };
        state.heroes[1].life = 50;
        
        const tiles = state.board.tiles.split('');
        const attackPos = state.heroes[0].pos;
        const attackIdx = attackPos.y * state.board.size + attackPos.x;
        tiles[attackIdx * 2] = '@';
        tiles[attackIdx * 2 + 1] = '2';
        state.board.tiles = tiles.join('');
        
        const newState = GameEngine.applyMove(state, heroId, Move.Stay);
        
        const victim = newState.heroes.find(h => h.id === victimId);
        expect(victim?.life).toBe(50 - GAME_RULES.ATTACK_DAMAGE);
      });

      it('should kill victim when attack reduces HP to 0 or below', () => {
        const state = createTestState();
        const heroId = 1;
        const victimId = 2;
        state.heroes[0].pos = { x: 6, y: 6 };
        state.heroes[1].life = GAME_RULES.ATTACK_DAMAGE;
        state.heroes[1].mineCount = 2;
        
        const tiles = state.board.tiles.split('');
        const attackPos = state.heroes[0].pos;
        const attackIdx = attackPos.y * state.board.size + attackPos.x;
        tiles[attackIdx * 2] = '@';
        tiles[attackIdx * 2 + 1] = '2';
        state.board.tiles = tiles.join('');
        
        const newState = GameEngine.applyMove(state, heroId, Move.Stay);
        
        const victim = newState.heroes.find(h => h.id === victimId);
        expect(victim?.life).toBe(GAME_RULES.INITIAL_LIFE);
        expect(victim?.mineCount).toBe(0);
        expect(victim?.pos).toEqual(victim?.spawnPos);
      });

      it('should not attack self', () => {
        const state = createTestState();
        const heroId = 1;
        const initialLife = state.heroes[0].life;
        
        const newState = GameEngine.applyMove(state, heroId, Move.Stay);
        
        expect(newState.heroes[0].life).toBe(initialLife - GAME_RULES.MOVE_LIFE_COST);
      });
    });

    describe('Hero death and respawn', () => {
      it('should respawn hero at spawn position when life reaches 0', () => {
        const state = createTestState();
        const heroId = 1;
        state.heroes[0].life = 0;
        
        const newState = GameEngine.applyMove(state, heroId, Move.Stay);
        
        expect(newState.heroes[0].life).toBe(GAME_RULES.INITIAL_LIFE);
        expect(newState.heroes[0].pos).toEqual(newState.heroes[0].spawnPos);
      });

      it('should reset mines when hero dies', () => {
        const state = createTestState();
        const heroId = 1;
        state.heroes[0].life = 0;
        state.heroes[0].mineCount = 3;
        
        const tiles = state.board.tiles.split('');
        for (let i = 0; i < tiles.length; i += 2) {
          if (tiles[i] === '$' && tiles[i + 1] === '1') {
            tiles[i] = '$';
            tiles[i + 1] = '-';
          }
        }
        state.board.tiles = tiles.join('');
        
        const newState = GameEngine.applyMove(state, heroId, Move.Stay);
        
        expect(newState.heroes[0].mineCount).toBe(0);
      });

      it('should preserve gold when hero dies', () => {
        const state = createTestState();
        const heroId = 1;
        state.heroes[0].life = 0;
        state.heroes[0].gold = 100;
        
        const newState = GameEngine.applyMove(state, heroId, Move.Stay);
        
        expect(newState.heroes[0].gold).toBe(100);
      });

      it('should handle telefrag when respawning on occupied tile', () => {
        const state = createTestState();
        const heroId = 1;
        state.heroes[0].life = 0;
        state.heroes[0].spawnPos = { x: 6, y: 6 };
        state.heroes[1].pos = { x: 6, y: 6 };
        state.heroes[1].life = 50;
        
        const newState = GameEngine.applyMove(state, heroId, Move.Stay);
        
        expect(newState.heroes[0].pos).toEqual(newState.heroes[0].spawnPos);
        expect(newState.heroes[1].life).toBe(GAME_RULES.INITIAL_LIFE);
        expect(newState.heroes[1].pos).toEqual(newState.heroes[1].spawnPos);
      });
    });

    describe('Turn progression', () => {
      it('should increment turn after move', () => {
        const state = createTestState();
        const initialTurn = state.turn;
        
        const newState = GameEngine.applyMove(state, 1, Move.Stay);
        
        expect(newState.turn).toBe(initialTurn + 1);
      });

      it('should finish game when max turns reached', () => {
        const state = createTestState();
        state.turn = state.maxTurns - 1;
        
        const newState = GameEngine.applyMove(state, 1, Move.Stay);
        
        expect(newState.turn).toBe(state.maxTurns);
        expect(newState.finished).toBe(true);
      });
    });

    describe('Income generation from mines', () => {
      it('should generate gold from owned mines each turn', () => {
        const state = createTestState();
        const heroId = 1;
        state.heroes[0].gold = 0;
        state.heroes[0].mineCount = 3;
        
        const newState = GameEngine.applyMove(state, heroId, Move.Stay);
        
        expect(newState.heroes[0].gold).toBe(3 * GAME_RULES.MINE_GOLD_PER_TURN);
      });

      it('should generate gold even when hero does not move', () => {
        const state = createTestState();
        const heroId = 1;
        state.heroes[0].gold = 10;
        state.heroes[0].mineCount = 2;
        
        const newState = GameEngine.applyMove(state, heroId, Move.Stay);
        
        expect(newState.heroes[0].gold).toBe(10 + 2 * GAME_RULES.MINE_GOLD_PER_TURN);
      });
    });

    describe('Life cost', () => {
      it('should reduce life by MOVE_LIFE_COST on each move', () => {
        const state = createTestState();
        const heroId = 1;
        const initialLife = state.heroes[0].life;
        
        const newState = GameEngine.applyMove(state, heroId, Move.Stay);
        
        expect(newState.heroes[0].life).toBe(initialLife - GAME_RULES.MOVE_LIFE_COST);
      });

      it('should keep life at minimum 1 when moving', () => {
        const state = createTestState();
        const heroId = 1;
        state.heroes[0].life = 1;
        
        const newState = GameEngine.applyMove(state, heroId, Move.Stay);
        
        expect(newState.heroes[0].life).toBe(1);
      });
    });

    describe('Crashed hero', () => {
      it('should skip move for crashed hero', () => {
        const state = createTestState();
        const heroId = 1;
        state.heroes[0].crashed = true;
        const initialPos = { ...state.heroes[0].pos };
        const initialLife = state.heroes[0].life;
        
        const newState = GameEngine.applyMove(state, heroId, Move.North);
        
        expect(newState.heroes[0].pos).toEqual(initialPos);
        expect(newState.heroes[0].life).toBe(initialLife);
        expect(newState.turn).toBe(state.turn + 1);
      });
    });

    describe('Tile updates', () => {
      it('should update hero positions on board tiles', () => {
        const state = createTestState();
        const heroId = 1;
        const initialPos = state.heroes[0].pos;
        
        const newState = GameEngine.applyMove(state, heroId, Move.South);
        
        const tiles = newState.board.tiles;
        const newPos = newState.heroes[0].pos;
        const newTileIdx = newPos.y * newState.board.size + newPos.x;
        const newTile = tiles.substring(newTileIdx * 2, newTileIdx * 2 + 2);
        
        expect(newTile).toBe('@1');
        
        const oldTileIdx = initialPos.y * newState.board.size + initialPos.x;
        const oldTile = tiles.substring(oldTileIdx * 2, oldTileIdx * 2 + 2);
        expect(oldTile).not.toBe('@1');
      });
    });
  });
});

