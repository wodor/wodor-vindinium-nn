import { describe, expect, it } from 'vitest';
import { ScenarioInterpreter } from './scenarioInterpreter';

function tileAt(tiles: string, size: number, x: number, y: number): string {
  const start = (y * size + x) * 2;
  return tiles.slice(start, start + 2);
}

describe('ScenarioInterpreter.parse', () => {
  it('parses board size, hero state, and objects into tiles', () => {
    const scenario = `
Given a board of size 5
And Hero 1 is at 1,1 with 15 HP and 5 Gold
And a Tavern is at 3,2
And a Wall is at 2,1
And a neutral Mine is at 0,0
    `.trim();

    const state = ScenarioInterpreter.parse(scenario);

    expect(state.board.size).toBe(5);
    expect(state.board.tiles.length).toBe(5 * 5 * 2);

    const hero1 = state.heroes.find(h => h.id === 1);
    expect(hero1).toBeTruthy();
    expect(hero1?.pos).toEqual({ x: 1, y: 1 });
    expect(hero1?.life).toBe(15);
    expect(hero1?.gold).toBe(5);

    expect(tileAt(state.board.tiles, 5, 0, 0)).toBe('$-');
    expect(tileAt(state.board.tiles, 5, 2, 1)).toBe('##');
    expect(tileAt(state.board.tiles, 5, 3, 2)).toBe('[]');
    expect(tileAt(state.board.tiles, 5, 1, 1)).toBe('@1');
  });

  it('defaults hero HP and gold when omitted', () => {
    const scenario = `
Given a board of size 6
And Hero 1 is at 2,3
    `.trim();

    const state = ScenarioInterpreter.parse(scenario);
    const hero1 = state.heroes.find(h => h.id === 1);

    expect(hero1).toBeTruthy();
    expect(hero1?.life).toBe(100);
    expect(hero1?.gold).toBe(0);
  });

  it('overlays hero tiles on top of objects at the same coordinate', () => {
    const scenario = `
Given a board of size 5
And Hero 1 is at 1,1
And a Wall is at 1,1
    `.trim();

    const state = ScenarioInterpreter.parse(scenario);
    expect(tileAt(state.board.tiles, 5, 1, 1)).toBe('@1');
  });
});

