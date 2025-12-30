
export const GAME_RULES = {
  INITIAL_LIFE: 100,
  MOVE_LIFE_COST: 1,
  TAVERN_HEAL: 50,
  TAVERN_COST: 2,
  MINE_LIFE_COST: 20,
  ATTACK_DAMAGE: 20,
  MINE_GOLD_PER_TURN: 1,
  BOARD_SIZE_DEFAULT: 12
};

export const TILE_SIZE = 48; // px

export const TILE_MAP: Record<string, string> = {
  '  ': 'Empty',
  '##': 'Wall',
  '[]': 'Tavern',
  '$-': 'MineNeutral',
  '$1': 'MineP1',
  '$2': 'MineP2',
  '$3': 'MineP3',
  '$4': 'MineP4',
  '@1': 'HeroP1',
  '@2': 'HeroP2',
  '@3': 'HeroP3',
  '@4': 'HeroP4'
};
