
import { useState, useCallback, useEffect } from 'react';
import { GameState, Move, GameLog, AIDecision, StrategyPriorities, PopulationMember } from '../types';
import { GameEngine } from '../services/gameEngine';
import { NeuralEngine } from '../services/neuralEngine';

export function useGameLoop(activeNeuralWeights: PopulationMember | null, priorities: StrategyPriorities) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false); 
  const [lastDilemma, setLastDilemma] = useState<AIDecision['dilemma'] | null>(null);
  const [lastActivations, setLastActivations] = useState<number[][] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const useNeuralAgent = true;

  useEffect(() => {
    setGameState(GameEngine.createInitialState());
  }, []);

  const resetGame = useCallback(() => {
    setGameState(GameEngine.createInitialState());
    setLogs([]);
    setLastDilemma(null);
    setLastActivations(undefined);
    setIsAutoPlaying(false);
  }, []);

  const step = useCallback(async (isManual: boolean = false) => {
    if (!gameState || gameState.finished || loading || !activeNeuralWeights) return;
    setLoading(true);
    try {
      let currentState = gameState;
      const heroId = (currentState.turn % 4) + 1;
      let decision: AIDecision;
      
      if (heroId === 1) {
        if (useNeuralAgent && activeNeuralWeights) {
            decision = await NeuralEngine.getInference(currentState, heroId, activeNeuralWeights.weights);
        } else {
            const { getAIDecision } = await import('../services/geminiService');
            decision = await getAIDecision(currentState, heroId, priorities, Math.random() > 0.85);
            if (decision.dilemma) { 
              setLastDilemma(decision.dilemma); 
              setIsAutoPlaying(false); 
            }
        }
        setLastActivations(decision.activations);
      } else {
        const moves = [Move.North, Move.South, Move.East, Move.West, Move.Stay];
        decision = { move: moves[Math.floor(Math.random() * moves.length)], reasoning: "NPC Logic active.", confidence: 0.5 };
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
  }, [gameState, priorities, loading, useNeuralAgent, activeNeuralWeights]);

  useEffect(() => {
    let interval: ReturnType<typeof setTimeout> | undefined;
    if (isAutoPlaying && gameState && !gameState.finished && !loading && !lastDilemma && activeNeuralWeights) {
      interval = setTimeout(() => step(false), useNeuralAgent ? 60 : 600);
    }
    return () => {
      if (interval) clearTimeout(interval);
    };
  }, [isAutoPlaying, gameState, loading, step, lastDilemma, useNeuralAgent, activeNeuralWeights]);

  return {
    gameState, setGameState, logs, setLogs, isAutoPlaying, setIsAutoPlaying, 
    lastDilemma, setLastDilemma, lastActivations, loading, useNeuralAgent,
    resetGame, step
  };
}
