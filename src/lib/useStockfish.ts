"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface EngineEval {
  score: number | null; // Centipawns relative to side to move (or converted to white perspective)
  mate: number | null;  // Moves to mate
  depth: number;
  pv: string[];         // Best move sequence in UCI format e.g. ["e2e4", "e7e5"]
  bestMove: string | null;
  bestMoveSan?: string;
  pvSan?: string[];
  nodes?: number;
  nps?: number;
}

export function useStockfish() {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [evalData, setEvalData] = useState<EngineEval>({
    score: 0,
    mate: null,
    depth: 0,
    pv: [],
    bestMove: null,
  });

  const onEvalUpdateRef = useRef<((evalData: EngineEval) => void) | null>(null);

  useEffect(() => {
    // Create stockfish worker from public JS file
    const worker = new Worker("/stockfish/stockfish-18-lite-single.js");
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === "string" ? e.data : "";
      
      if (line === "uciok" || line === "readyok") {
        setIsReady(true);
      }

      if (line.startsWith("info depth")) {
        const parsed = parseStockfishOutput(line);
        if (parsed) {
          setEvalData((prev) => {
            const nextData = { ...prev, ...parsed };
            if (onEvalUpdateRef.current) {
              onEvalUpdateRef.current(nextData);
            }
            return nextData;
          });
        }
      }

      if (line.startsWith("bestmove")) {
        const parts = line.split(" ");
        const bestMove = parts[1] || null;
        setIsAnalyzing(false);
        setEvalData((prev) => ({ ...prev, bestMove }));
      }
    };

    worker.postMessage("uci");
    worker.postMessage("isready");

    return () => {
      worker.terminate();
    };
  }, []);

  const analyzePosition = useCallback((fen: string, depth: number = 20) => {
    if (!workerRef.current) return;
    
    // Stop previous analysis
    workerRef.current.postMessage("stop");
    setIsAnalyzing(true);
    setEvalData({
      score: null,
      mate: null,
      depth: 0,
      pv: [],
      bestMove: null,
    });

    workerRef.current.postMessage(`position fen ${fen}`);
    workerRef.current.postMessage(`go depth ${depth}`);
  }, []);

  const stopAnalysis = useCallback(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage("stop");
    setIsAnalyzing(false);
  }, []);

  return {
    isReady,
    isAnalyzing,
    evalData,
    analyzePosition,
    stopAnalysis,
    setOnEvalUpdate: (fn: (evalData: EngineEval) => void) => {
      onEvalUpdateRef.current = fn;
    }
  };
}

function parseStockfishOutput(line: string): Partial<EngineEval> | null {
  const depthMatch = line.match(/\bdepth (\d+)/);
  if (!depthMatch) return null;

  const depth = parseInt(depthMatch[1], 10);
  
  let score: number | null = null;
  let mate: number | null = null;

  const cpMatch = line.match(/\bscore cp (-?\d+)/);
  if (cpMatch) {
    score = parseInt(cpMatch[1], 10);
  }

  const mateMatch = line.match(/\bscore mate (-?\d+)/);
  if (mateMatch) {
    mate = parseInt(mateMatch[1], 10);
  }

  let pv: string[] = [];
  const pvIndex = line.indexOf(" pv ");
  if (pvIndex !== -1) {
    pv = line.substring(pvIndex + 4).trim().split(/\s+/);
  }

  const nodesMatch = line.match(/\bnodes (\d+)/);
  const npsMatch = line.match(/\bnps (\d+)/);

  return {
    depth,
    score,
    mate,
    pv,
    nodes: nodesMatch ? parseInt(nodesMatch[1], 10) : undefined,
    nps: npsMatch ? parseInt(npsMatch[1], 10) : undefined,
  };
}
