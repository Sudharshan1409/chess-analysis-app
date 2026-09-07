"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Chess } from "chess.js";

export interface PVLine {
  cp: number | null;
  mate: number | null;
  pvUci: string[];
  pvSan: string[];
}

export interface EngineEval {
  depth: number;
  nodes?: number;
  nps?: number;
  lines: PVLine[];
}

export function useStockfish() {
  const workerRef = useRef<Worker | null>(null);
  const currentFenRef = useRef<string>("");
  const isPendingRef = useRef<boolean>(false);
  const nextFenRef = useRef<string | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [evalData, setEvalData] = useState<EngineEval>({
    depth: 0,
    lines: [],
  });

  const initWorker = useCallback(() => {
    if (workerRef.current) {
      try {
        workerRef.current.terminate();
      } catch (e) {
        // ignore
      }
    }

    const worker = new Worker("/stockfish/stockfish-18-lite-single.js");
    workerRef.current = worker;
    isPendingRef.current = false;

    worker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === "string" ? e.data : "";

      if (line === "uciok" || line === "readyok") {
        setIsReady(true);
        worker.postMessage("setoption name MultiPV value 3");
      }

      if (line.startsWith("info depth")) {
        const parsed = parseStockfishOutput(line, currentFenRef.current);
        if (parsed) {
          setEvalData((prev) => {
            const nextLines = [...prev.lines];
            if (parsed.multipvIndex !== undefined && parsed.line) {
              nextLines[parsed.multipvIndex] = parsed.line;
            }
            return {
              depth: parsed.depth !== undefined ? parsed.depth : prev.depth,
              nodes: parsed.nodes ?? prev.nodes,
              nps: parsed.nps ?? prev.nps,
              lines: nextLines,
            };
          });
        }
      }

      if (line.startsWith("bestmove")) {
        setIsAnalyzing(false);
        isPendingRef.current = false;

        // If a newer FEN was queued while evaluating, send it now
        if (nextFenRef.current && nextFenRef.current !== currentFenRef.current) {
          const nextFen = nextFenRef.current;
          nextFenRef.current = null;
          
          isPendingRef.current = true;
          currentFenRef.current = nextFen;
          setIsAnalyzing(true);
          setEvalData({ depth: 0, lines: [] });
          
          worker.postMessage(`position fen ${nextFen}`);
          worker.postMessage(`go depth 18`);
        }
      }
    };

    worker.onerror = (err) => {
      console.warn("Stockfish worker encountered an error:", err);
      // Removed initWorker() to prevent infinite restart loop on initialization failure
    };

    worker.postMessage("uci");
    worker.postMessage("isready");
  }, []);

  useEffect(() => {
    initWorker();
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [initWorker]);

  const analyzePosition = useCallback((fen: string, depth: number = 18) => {
    if (!workerRef.current) return;

    if (isPendingRef.current) {
      // Queue request if another search is in progress
      nextFenRef.current = fen;
      workerRef.current.postMessage("stop");
      return;
    }

    isPendingRef.current = true;
    currentFenRef.current = fen;
    setIsAnalyzing(true);
    setEvalData({ depth: 0, lines: [] });

    workerRef.current.postMessage(`position fen ${fen}`);
    workerRef.current.postMessage(`go depth ${depth}`);
  }, []);

  return {
    isReady,
    isAnalyzing,
    evalData,
    analyzePosition,
  };
}

function parseStockfishOutput(
  line: string,
  fen: string
): {
  depth?: number;
  multipvIndex?: number;
  nodes?: number;
  nps?: number;
  line?: PVLine;
} | null {
  const depthMatch = line.match(/\bdepth (\d+)/);
  if (!depthMatch) return null;

  const depth = parseInt(depthMatch[1], 10);
  const multipvMatch = line.match(/\bmultipv (\d+)/);
  const multipvIndex = multipvMatch ? parseInt(multipvMatch[1], 10) - 1 : 0;

  let cp: number | null = null;
  let mate: number | null = null;

  const cpMatch = line.match(/\bscore cp (-?\d+)/);
  if (cpMatch) cp = parseInt(cpMatch[1], 10);

  const mateMatch = line.match(/\bscore mate (-?\d+)/);
  if (mateMatch) mate = parseInt(mateMatch[1], 10);

  let pvUci: string[] = [];
  let pvSan: string[] = [];
  const pvIndex = line.indexOf(" pv ");
  if (pvIndex !== -1) {
    pvUci = line.substring(pvIndex + 4).trim().split(/\s+/);
    if (fen && pvUci.length > 0) {
      try {
        const chess = new Chess(fen);
        for (const uci of pvUci) {
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
        // ignore
      }
    }
  }

  const nodesMatch = line.match(/\bnodes (\d+)/);
  const npsMatch = line.match(/\bnps (\d+)/);

  return {
    depth,
    multipvIndex,
    nodes: nodesMatch ? parseInt(nodesMatch[1], 10) : undefined,
    nps: npsMatch ? parseInt(npsMatch[1], 10) : undefined,
    line: {
      cp,
      mate,
      pvUci,
      pvSan,
    },
  };
}
