# Code Review: Cleanup Opportunities & Test Recommendations

## Cleanup Opportunities

### 1. Type Safety Issues

**Location**: `App.tsx:36`
```typescript
const handleScenarioLoad = (state: any) => {
```
**Issue**: Using `any` type instead of proper `GameState` type
**Fix**: Replace with `GameState`

**Location**: `hooks/useGameLoop.ts:66`, `hooks/useEvolution.ts:179`
```typescript
let interval: any;
let timer: any;
```
**Issue**: Using `any` for timer types
**Fix**: Use `NodeJS.Timeout` or `number` (browser) or `ReturnType<typeof setTimeout>`

### 2. Unused/Dead Code

**Location**: `App.tsx:21`
```typescript
const [priorities] = useState<StrategyPriorities>(INITIAL_PRIORITIES);
```
**Issue**: `priorities` is never updated, only read. Consider making it a constant or removing the setter.

**Location**: `hooks/useGameLoop.ts:15`
```typescript
const [useNeuralAgent, setUseNeuralAgent] = useState(true);
```
**Issue**: `setUseNeuralAgent` is never used in the component. Either remove it or expose it if needed.

### 3. Error Handling

**Location**: `services/geminiService.ts:140`
```typescript
} catch (error) {
  console.error("AI Decision failed:", error);
  return { move: Move.Stay, reasoning: "...", confidence: 0 };
}
```
**Issue**: Error is logged but not typed. Consider proper error typing and potentially re-throwing for critical errors.

**Location**: `hooks/useGameLoop.ts:58-60`
```typescript
} catch (error) { 
  console.error(error); 
}
```
**Issue**: Generic error handling without user feedback or recovery mechanism.

### 4. Magic Numbers & Constants

**Location**: `services/neuralEngine.ts:12`
```typescript
return x > 0 ? x : 0.01 * x; // Leaky ReLU
```
**Issue**: Magic number `0.01` should be a named constant (e.g., `LEAKY_RELU_ALPHA`)

**Location**: `hooks/useEvolution.ts:96-101`
```typescript
const goldScore = Math.min(100, Math.floor(gameStats.gold / 5)); 
const mineScore = Math.min(100, gameStats.mineCount * 20);
const survivalScore = gameStats.life;
const combatScore = Math.min(100, Math.floor(gameStats.gold / 10));
```
**Issue**: Magic numbers (`5`, `20`, `10`, `100`) should be extracted to constants with meaningful names.

**Location**: `hooks/useEvolution.ts:101`
```typescript
const fitness = (goldScore * 1.0) + (mineScore * 15.0) + (survivalScore * 0.5) + (combatScore * 4.0);
```
**Issue**: Fitness weights should be constants (e.g., `FITNESS_WEIGHTS`)

### 5. Code Duplication

**Location**: `services/gameEngine.ts:95-98`, `services/gameEngine.ts:115-118`
```typescript
const tilesArr = [];
for (let i = 0; i < state.board.tiles.length; i += 2) {
  tilesArr.push(state.board.tiles.substring(i, i + 2));
}
```
**Issue**: Tile array parsing is duplicated. Extract to a helper method.

**Location**: `hooks/useEvolution.ts:124-128`
**Issue**: Repeated archetype scoring logic with similar patterns. Consider extracting to a function.

### 6. Performance Issues

**Location**: `services/gameEngine.ts:79`
```typescript
const newState = JSON.parse(JSON.stringify(state)) as GameState;
```
**Issue**: Deep cloning entire state on every move. Consider immutable update patterns or shallow cloning where possible.

**Location**: `App.tsx:171`
```typescript
{logs.filter(l => l.heroId === 1).map((log, i) => (
```
**Issue**: Filtering on every render. Consider memoization or filtering in state.

### 7. Inconsistent Patterns

**Location**: `services/geminiService.ts:9`
```typescript
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
```
**Issue**: Environment variable access in browser code. `process.env` may not work in Vite without proper configuration. Should use `import.meta.env` for Vite.

**Location**: `services/neuralEngine.ts:188`
```typescript
const z = Math.sqrt(-2.0 * Math.log(u1 || 0.001)) * Math.cos(2.0 * Math.PI * u2);
```
**Issue**: Fallback `0.001` for `u1` could cause issues if `u1` is actually `0`. Consider proper validation.

### 8. Missing Input Validation

**Location**: `services/scenarioInterpreter.ts:54`
```typescript
const heroMatch = line.match(/Hero (\d+) is at (\d+),(\d+)(?: with (\d+) HP)?(?: and (\d+) Gold)?/i);
```
**Issue**: No validation that parsed coordinates are within board bounds.

**Location**: `services/gameEngine.ts:78`
```typescript
static applyMove(state: GameState, heroId: number, move: Move): GameState {
```
**Issue**: No validation that `heroId` exists in state.

### 9. Comment Cleanup

**Location**: `hooks/useEvolution.ts:3`
```typescript
// Add Move to the imports to fix 'Cannot find name Move' error on line 77.
```
**Issue**: Comment references old fix. Should be removed or updated.

**Location**: `services/scenarioInterpreter.ts:64`
```typescript
// Reverted bug: x + 1 -> x
```
**Issue**: Comment about reverted bug should be removed if no longer relevant.

### 10. Accessibility & UX

**Location**: `App.tsx:61`
```typescript
alert("Imported: " + data.member.id + ". (Weights available in logs if active)");
```
**Issue**: Using `alert()` is poor UX. Consider toast notifications or inline feedback.

## Test Recommendations

### Unit Tests (High Priority)

#### 1. `GameEngine` Tests
- **`createInitialState`**: Verify board size, hero positions, initial tiles placement
- **`applyMove`**: 
  - Movement in all directions
  - Wall collision
  - Tavern healing (with/without gold)
  - Mine capture (neutral, enemy-owned)
  - Mine capture death (insufficient HP)
  - Hero attack
  - Hero death and respawn
  - Telefrag (respawn on occupied tile)
  - Turn progression
  - Game finish condition
  - Income generation from mines
- **`handleDeath`**: 
  - Mine reset
  - Gold preservation
  - Respawn logic
  - Telefrag handling

#### 2. `NeuralEngine` Tests
- **`getInference`**:
  - Input vector construction (48 elements)
  - Vision grid encoding (5x5)
  - Hero stats encoding
  - Radar features (nearest tavern, mine, enemy)
  - Forward pass through network
  - Output move selection (argmax)
  - Activations array structure
  - Confidence calculation
  - Reasoning generation
- **`createRandomWeights`**:
  - Correct matrix dimensions
  - Weight initialization (Xavier)
  - Network topology (input → hidden → output)
- **`mutateWeights`**:
  - Mutation rate application
  - Weight distribution changes
  - Matrix structure preservation

#### 3. `ScenarioInterpreter` Tests
- **`parse`**:
  - Board size parsing
  - Hero position parsing
  - Hero HP/Gold parsing
  - Object placement (tavern, mine, wall)
  - Multiple heroes
  - Edge cases (invalid coordinates, missing data)

#### 4. `geminiService` Tests
- **`getAI`**:
  - API key initialization
  - Missing API key handling
  - Error handling
- **`getAIDecision`**:
  - Prompt construction
  - API call with schema
  - Response parsing
  - Fallback on error
  - Dilemma generation flag

### Integration Tests (Medium Priority)

#### 5. `useEvolution` Hook Tests
- Population initialization
- Evolution step (heuristic mode)
- Evolution step (headless mode)
- Auto-evolution toggle
- Generation progression
- Fitness calculation
- Weight mutation
- Elite preservation
- Population reset
- Specimen selection

#### 6. `useGameLoop` Hook Tests
- Game state initialization
- Step execution (neural agent)
- Step execution (Gemini agent)
- Auto-play loop
- Game reset
- Log accumulation
- Dilemma handling
- Loading states

#### 7. Game Flow Integration Tests
- Full game simulation (300 turns)
- Multiple heroes interaction
- Win condition
- Death/respawn cycles
- Mine ownership changes

### Component Tests (Lower Priority)

#### 8. React Component Tests
- **`Board`**: Tile rendering, state updates
- **`HeroStats`**: Hero data display
- **`StrategyLab`**: Scenario loading
- **`NeuralTraining`**: Population visualization
- **`App`**: Tab switching, state management

### Test Infrastructure Needed

1. **Testing Framework**: Add Vitest (recommended for Vite projects)
   ```json
   "devDependencies": {
     "vitest": "^1.0.0",
     "@testing-library/react": "^14.0.0",
     "@testing-library/jest-dom": "^6.0.0"
   }
   ```

2. **Test Utilities**:
   - Mock `@google/genai` for Gemini service tests
   - Helper functions for creating test game states
   - Fixtures for common scenarios

3. **Test Coverage Goals**:
   - Core services: 80%+
   - Hooks: 70%+
   - Components: 60%+

### Specific Test Scenarios

#### Critical Path Tests
1. **Mine Capture Flow**: Hero moves to neutral mine → pays HP → captures → generates income
2. **Death/Respawn Flow**: Hero dies → loses mines → respawns → keeps gold
3. **Neural Inference Flow**: State → input vector → network → move decision
4. **Evolution Flow**: Population → evaluation → mutation → next generation

#### Edge Cases
1. Hero at board boundaries
2. Multiple heroes on same tile
3. Hero with 0 HP attempting move
4. Hero with insufficient gold for tavern
5. Empty population in evolution
6. Invalid move in game engine
7. Network with 0 layers
8. Scenario with invalid coordinates

#### Performance Tests
1. Large population evolution (100+ members)
2. Long game simulation (1000+ turns)
3. Rapid auto-play (stress test)
4. Memory leak detection (component unmounting)

