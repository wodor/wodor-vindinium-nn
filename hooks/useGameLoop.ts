
import { useState, useCallback, useEffect } from 'react';
import { GameState, Move, GameLog, AIDecision, StrategyPriorities, PopulationMember } from '../types';
import { GameEngine } from '../services/gameEngine';
import { NeuralEngine } from '../services/neuralEngine';

export function useGameLoop(heroNeuralWeights: Map<number, PopulationMember | null>, priorities: StrategyPriorities) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false); 
  const [lastDilemma, setLastDilemma] = useState<AIDecision['dilemma'] | null>(null);
  const [lastActivations, setLastActivations] = useState<number[][] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const useNeuralAgent = true;

  useEffect(() => {
    setGameState(GameEngine.createInitialState(12, 1200));
  }, []);

  const resetGame = useCallback(() => {
    setGameState(GameEngine.createInitialState(12, 1200));
    setLogs([]);
    setLastDilemma(null);
    setLastActivations(undefined);
    setIsAutoPlaying(false);
  }, []);

  const step = useCallback(async (isManual: boolean = false) => {
    if (!gameState || gameState.finished || loading) return;
    setLoading(true);
    try {
      let currentState = gameState;
      const heroId = (currentState.turn % 4) + 1;
      let decision: AIDecision;
      
      const heroNN = heroNeuralWeights.get(heroId);
      
      if (heroNN && useNeuralAgent) {
        decision = await NeuralEngine.getInference(currentState, heroId, heroNN.weights);
        if (heroId === 1) {
          setLastActivations(decision.activations);
        }
      } else {
        const moves = [Move.North, Move.South, Move.East, Move.West, Move.Stay];
        decision = { move: moves[Math.floor(Math.random() * moves.length)], reasoning: "Random Logic active.", confidence: 0.5 };
      }
      
      const prevTurn = currentState.turn;
      const nextState = GameEngine.applyMove(currentState, heroId, decision.move);
      
      setGameState(nextState);
      setLogs(prev => [{ turn: prevTurn, heroId, decision, timestamp: Date.now(), isManual: isManual && heroId === 1 }, ...prev].slice(0, 100));
    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
    }
  }, [gameState, priorities, loading, useNeuralAgent, heroNeuralWeights]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const runStep = async () => {
      if (isAutoPlaying && gameState && !gameState.finished && !loading && !lastDilemma) {
        await step(false);
        if (isAutoPlaying && gameState && !gameState.finished && !loading && !lastDilemma) {
          timeoutId = setTimeout(runStep, 1);
        }
      }
    };
    if (isAutoPlaying && gameState && !gameState.finished && !loading && !lastDilemma) {
      timeoutId = setTimeout(runStep, 1);
    }
    return () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [isAutoPlaying, gameState, loading, step, lastDilemma, useNeuralAgent]);

  return {
    gameState, setGameState, logs, setLogs, isAutoPlaying, setIsAutoPlaying, 
    lastDilemma, setLastDilemma, lastActivations, loading, useNeuralAgent,
    resetGame, step
  };
}
