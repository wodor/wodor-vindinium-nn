
import { GameState, Hero, Move } from '../types';

export const DEFAULT_SCENARIOS = {
  'Tavern Emergency': `
Given a board of size 10
And Hero 1 is at 2,2 with 15 HP and 5 Gold
And a Tavern is at 3,2
And a Wall is at 2,1
And a Wall is at 2,3
  `.trim(),
  'Mine Capture': `
Given a board of size 10
And Hero 1 is at 5,5 with 100 HP and 0 Gold
And a neutral Mine is at 5,6
And a neutral Mine is at 6,5
  `.trim(),
  'Combat Risk': `
Given a board of size 8
And Hero 1 is at 3,3 with 40 HP and 20 Gold
And Hero 2 is at 4,3 with 10 HP and 0 Gold
And a Tavern is at 1,1
  `.trim()
};

export class ScenarioInterpreter {
  static parse(gherkin: string): GameState {
    const lines = gherkin.split('\n').map(l => l.trim());
    let size = 12;
    const heroes: Hero[] = [
      { id: 1, name: "Subject A", pos: { x: 1, y: 1 }, spawnPos: { x: 1, y: 1 }, life: 100, gold: 0, mineCount: 0, crashed: false },
      { id: 2, name: "Bot B", pos: { x: 10, y: 1 }, spawnPos: { x: 10, y: 1 }, life: 100, gold: 0, mineCount: 0, crashed: false },
      { id: 3, name: "Bot C", pos: { x: 1, y: 10 }, spawnPos: { x: 1, y: 10 }, life: 100, gold: 0, mineCount: 0, crashed: false },
      { id: 4, name: "Bot D", pos: { x: 10, y: 10 }, spawnPos: { x: 10, y: 10 }, life: 100, gold: 0, mineCount: 0, crashed: false }
    ];

    const tiles: string[] = [];

    const updateTiles = (s: number) => {
      tiles.length = 0;
      for (let i = 0; i < s * s; i++) tiles.push('  ');
    };
    updateTiles(size);

    lines.forEach(line => {
      const sizeMatch = line.match(/board of size (\d+)/i);
      if (sizeMatch) {
        size = parseInt(sizeMatch[1]);
        updateTiles(size);
      }

      const heroMatch = line.match(/Hero (\d+) is at (\d+),(\d+)(?: with (\d+) HP)?(?: and (\d+) Gold)?/i);
      if (heroMatch) {
        const id = parseInt(heroMatch[1]);
        const x = parseInt(heroMatch[2]);
        const y = parseInt(heroMatch[3]);
        const hp = heroMatch[4] ? parseInt(heroMatch[4]) : 100;
        const gold = heroMatch[5] ? parseInt(heroMatch[5]) : 0;
        
        const h = heroes.find(h => h.id === id);
        if (h) {
          h.pos = { x, y };
          h.life = hp;
          h.gold = gold;
        }
      }

      const objMatch = line.match(/a (Tavern|neutral Mine|Wall) is at (\d+),(\d+)/i);
      if (objMatch) {
        const type = objMatch[1].toLowerCase();
        const x = parseInt(objMatch[2]);
        const y = parseInt(objMatch[3]);
        const idx = y * size + x;
        if (type === 'tavern') tiles[idx] = '[]';
        else if (type === 'neutral mine') tiles[idx] = '$-';
        else if (type === 'wall') tiles[idx] = '##';
      }
    });

    heroes.forEach(h => {
        const idx = h.pos.y * size + h.pos.x;
        if (idx < tiles.length) tiles[idx] = `@${h.id}`;
    });

    return {
      id: "scenario-" + Date.now(),
      turn: 0,
      maxTurns: 300,
      heroes,
      board: { size, tiles: tiles.join('') },
      finished: false
    };
  }
}
