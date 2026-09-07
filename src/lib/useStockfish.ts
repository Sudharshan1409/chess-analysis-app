"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Chess } from "chess.js";

export interface EngineEval {
  score: number | null; // Centipawns relative to side to move
  mate: number | null;  // Moves to mate
  depth: number;
  pv: string[];         // Best move sequence in UCI format e.g. ["e2e4", "e7e5"]
  pvSan: string[];      // Best move sequence converted to SAN notation e.g. ["e4", "e5", "Nf3"]
  bestMove: string | null;
  bestMoveSan?: string;
  nodes?: number;
  nps?: number;
}

export function useStockfish() {
  const workerRef = useRef<Worker | null>(null);
  const currentFenRef = useRef<string>("");
  const [isReady, setIsReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [evalData, setEvalData] = useState<EngineEval>({
    score: 0,
    mate: null,
    depth: 0,
    pv: [],
    pvSan: [],
    bestMove: null,
  });

  useEffect(() => {
    const worker = new Worker("/stockfish/stockfish-18-lite-single.js");
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === "string" ? e.data : "";
      
      if (line === "uciok" || line === "readyok") {
        setIsReady(true);
      }

      if (line.startsWith("info depth")) {
        const parsed = parseStockfishOutput(line, currentFenRef.current);
        if (parsed) {
          setEvalData((prev) => ({ ...prev, ...parsed }));
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

  const analyzePosition = useCallback((fen: string, depth: number = 18) => {
    if (!workerRef.current) return;
    currentFenRef.current = fen;
    
    workerRef.current.postMessage("stop");
    setIsAnalyzing(true);
    setEvalData({
      score: null,
      mate: null,
      depth: 0,
      pv: [],
      pvSan: [],
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
  };
}

function parseStockfishOutput(line: string, fen: string): Partial<EngineEval> | null {
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
  let pvSan: string[] = [];
  const pvIndex = line.indexOf(" pv ");
  if (pvIndex !== -1) {
    pv = line.substring(pvIndex + 4).trim().split(/\s+/);
    
    // Convert UCI PV moves to SAN moves using chess.js
    if (fen && pv.length > 0) {
      try {
        const chess = new Chess(fen);
        for (const uci of pv) {
          if (uci.length >= 4) {
            const from = uci.substring(0, 2);
            const to = uci.substring(2, 4);
            const promotion = uci.length > 4 ? uci.substring(4, 5) : undefined;
            const move = chess.move({ from, to, promotion });
            if (move) {
              pvSan.push(move.san);
            } else {
              break;
            }
          }
        }
      } catch (e) {
        // Fallback
      }
    }
  }

  const nodesMatch = line.match(/\bnodes (\d+)/);
  const npsMatch = line.match(/\bnps (\d+)/);

  return {
    depth,
    score,
    mate,
    pv,
    pvSan,
    nodes: nodesMatch ? parseInt(nodesMatch[1], 10) : undefined,
    nps: npsMatch ? parseInt(npsMatch[1], 10) : undefined,
  };
}
