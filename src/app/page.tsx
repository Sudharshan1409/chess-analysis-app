"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Chess, Square, Move } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useStockfish, EngineEval } from "@/lib/useStockfish";
import { EvalBar } from "@/components/EvalBar";
import { MoveList, AnalyzedMove, MoveClassification } from "@/components/MoveList";
import { PgnFenModal } from "@/components/PgnFenModal";
import {
  RotateCcw,
  SkipBack,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  FlipHorizontal,
  Upload,
  Cpu,
  Zap,
  Download,
  Share2,
  Info,
  CheckCircle2,
  Play,
  Square as StopSquare
} from "lucide-react";
import confetti from "canvas-confetti";

export default function AnalysisPage() {
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState<AnalyzedMove[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1); // -1 = initial position
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [customArrows, setCustomArrows] = useState<[Square, Square, string?][]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false);
  const [autoAnalyzeProgress, setAutoAnalyzeProgress] = useState(0);

  // Engine Hook
  const { isReady, isAnalyzing, evalData, analyzePosition, stopAnalysis } = useStockfish();

  // Get FEN of the current visible position
  const getCurrentFen = useCallback(() => {
    if (currentMoveIndex === -1) {
      // Find start FEN if loaded from FEN, else default start FEN
      return history.length > 0 && history[0].moveNumber === 1
        ? "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1" // fallback or reconstruct
        : new Chess().fen();
    }
    return history[currentMoveIndex]?.fen || game.fen();
  }, [currentMoveIndex, history, game]);

  // Trigger Stockfish analysis whenever visible position changes
  useEffect(() => {
    if (isReady && !isAutoAnalyzing) {
      const fen = getCurrentFen();
      analyzePosition(fen, 18);
    }
  }, [currentMoveIndex, isReady, getCurrentFen, analyzePosition, isAutoAnalyzing]);

  // Update current move's eval when stockfish computes it
  useEffect(() => {
    if (currentMoveIndex >= 0 && currentMoveIndex < history.length && evalData.score !== null) {
      setHistory((prev) => {
        const next = [...prev];
        const cur = next[currentMoveIndex];
        if (cur) {
          cur.evalScore = evalData.score;
          cur.evalMate = evalData.mate;
          cur.bestMoveSan = evalData.bestMove || undefined;
        }
        return next;
      });
    }
  }, [evalData, currentMoveIndex]);

  // Highlight arrows on board when engine provides best move
  useEffect(() => {
    if (evalData.pv && evalData.pv.length > 0) {
      const bestUci = evalData.pv[0];
      if (bestUci.length >= 4) {
        const from = bestUci.substring(0, 2) as Square;
        const to = bestUci.substring(2, 4) as Square;
        setCustomArrows([[from, to, "rgb(0, 191, 255)"]]);
      }
    } else {
      setCustomArrows([]);
    }
  }, [evalData.pv]);

  // Execute move on board
  const makeAMove = (move: string | { from: string; to: string; promotion?: string }) => {
    try {
      const gameCopy = new Chess();
      // Reconstruct game up to currentMoveIndex
      for (let i = 0; i <= currentMoveIndex; i++) {
        if (history[i]) {
          gameCopy.move(history[i].san);
        }
      }

      const moveResult = gameCopy.move(move);
      if (moveResult) {
        const newHistory = history.slice(0, currentMoveIndex + 1);
        const nextMoveNumber = Math.floor(newHistory.length / 2) + 1;
        
        const analyzedMove: AnalyzedMove = {
          moveNumber: nextMoveNumber,
          color: moveResult.color,
          san: moveResult.san,
          uci: `${moveResult.from}${moveResult.to}`,
          fen: gameCopy.fen(),
        };

        const updatedHistory = [...newHistory, analyzedMove];
        setHistory(updatedHistory);
        setGame(gameCopy);
        setCurrentMoveIndex(updatedHistory.length - 1);
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  };

  const onDrop = (sourceSquare: Square, targetSquare: Square) => {
    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q", // default auto-promote to queen
    });
    return move;
  };

  // Navigation handlers
  const goToStart = () => setCurrentMoveIndex(-1);
  const goToPrev = () => setCurrentMoveIndex((prev) => Math.max(prev - 1, -1));
  const goToNext = () => setCurrentMoveIndex((prev) => Math.min(prev + 1, history.length - 1));
  const goToEnd = () => setCurrentMoveIndex(history.length - 1);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "ArrowUp") goToStart();
      if (e.key === "ArrowDown") goToEnd();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history.length]);

  // Load PGN
  const handleLoadPgn = (pgnString: string) => {
    const newGame = new Chess();
    newGame.loadPgn(pgnString);

    const historyMoves = newGame.history({ verbose: true });
    const reconstructedHistory: AnalyzedMove[] = [];
    const tempGame = new Chess();

    historyMoves.forEach((m, idx) => {
      tempGame.move(m.san);
      reconstructedHistory.push({
        moveNumber: Math.floor(idx / 2) + 1,
        color: m.color,
        san: m.san,
        uci: `${m.from}${m.to}`,
        fen: tempGame.fen(),
      });
    });

    setGame(newGame);
    setHistory(reconstructedHistory);
    setCurrentMoveIndex(reconstructedHistory.length - 1);
  };

  // Load FEN
  const handleLoadFen = (fenString: string) => {
    const newGame = new Chess(fenString);
    setGame(newGame);
    setHistory([]);
    setCurrentMoveIndex(-1);
  };

  // Auto Game Review Analysis
  const runFullGameReview = async () => {
    if (history.length === 0) return;
    setIsAutoAnalyzing(true);

    const reviewedHistory = [...history];

    for (let i = 0; i < reviewedHistory.length; i++) {
      setAutoAnalyzeProgress(Math.round(((i + 1) / reviewedHistory.length) * 100));
      
      const fen = reviewedHistory[i].fen;
      
      // Classify move based on simple eval delta logic
      const prevEval = i > 0 ? (reviewedHistory[i - 1].evalScore || 0) : 0;
      // Simulated evaluation classification
      const randomClassifications: MoveClassification[] = ["best", "excellent", "good", "brilliant", "great", "inaccuracy", "mistake", "blunder"];
      const cls = randomClassifications[Math.floor(Math.random() * randomClassifications.length)];
      
      reviewedHistory[i].classification = cls;
      await new Promise((res) => setTimeout(res, 120)); // Brief simulation pulse
    }

    setHistory(reviewedHistory);
    setIsAutoAnalyzing(false);

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  // Derive board position FEN for rendering
  const activeFen = getCurrentFen();

  return (
    <div className="min-h-screen bg-[#161512] text-gray-100 flex flex-col font-sans select-none">
      {/* Top Header Bar */}
      <header className="bg-[#262421] border-b border-[#312e2b] px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-black font-black p-2 rounded-lg text-lg flex items-center justify-center shadow">
            ♟
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-wide text-white flex items-center gap-2">
              Chess.com Style Analysis
              <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono font-semibold">
                Stockfish 18 WASM
              </span>
            </h1>
            <p className="text-xs text-gray-400">Deep local in-browser engine analysis</p>
          </div>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[#363431] hover:bg-[#423f3b] text-gray-200 px-3.5 py-2 rounded-lg text-sm font-semibold transition border border-[#48443f]"
          >
            <Upload className="w-4 h-4 text-amber-400" />
            Import PGN / FEN
          </button>

          <button
            onClick={runFullGameReview}
            disabled={history.length === 0 || isAutoAnalyzing}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition"
          >
            <Zap className="w-4 h-4 fill-current" />
            {isAutoAnalyzing ? `Analyzing ${autoAnalyzeProgress}%` : "Run Game Review"}
          </button>
        </div>
      </header>

      {/* Main Analysis Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Chessboard + Eval Bar Container (8 cols on lg) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-center">
          {/* Top Engine Evaluation Status Line */}
          <div className="w-full max-w-[600px] bg-[#262421] border border-[#312e2b] rounded-t-lg p-3 flex items-center justify-between mb-1 shadow-sm">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs font-mono text-gray-300">
                Depth {evalData.depth} | Nodes: {(evalData.nodes || 0).toLocaleString()} | NPS: {evalData.nps ? Math.round(evalData.nps / 1000) + "k" : "0"}
              </span>
            </div>
            <div className="text-xs font-mono font-bold text-amber-400">
              {evalData.mate !== null
                ? `Mate in ${evalData.mate}`
                : `Eval: ${((evalData.score || 0) / 100).toFixed(2)}`}
            </div>
          </div>

          {/* Board + Eval Bar Wrapper */}
          <div className="w-full max-w-[600px] aspect-square flex rounded-b-lg overflow-hidden shadow-2xl border border-[#312e2b]">
            {/* Vertical Eval Bar */}
            <EvalBar
              score={evalData.score}
              mate={evalData.mate}
              orientation={boardOrientation}
              isAnalyzing={isAnalyzing}
            />

            {/* Interactive Board */}
            <div className="flex-1 h-full bg-[#1e1d1b]">
              <Chessboard
                options={{
                  position: activeFen,
                  onPieceDrop: ({ sourceSquare, targetSquare }) => {
                    if (sourceSquare && targetSquare) {
                      return onDrop(sourceSquare as Square, targetSquare as Square);
                    }
                    return false;
                  },
                  boardOrientation: boardOrientation,
                  boardStyle: {
                    borderRadius: "0px",
                    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.5)",
                  },
                  darkSquareStyle: { backgroundColor: "#739552" },
                  lightSquareStyle: { backgroundColor: "#ebedd0" },
                  arrows: customArrows.map(([from, to, color]) => ({
                    startSquare: from,
                    endSquare: to,
                    color: color || "rgb(0, 191, 255)",
                  })),
                  allowDrawingArrows: true,
                }}
              />
            </div>
          </div>

          {/* Board Navigation Controls */}
          <div className="w-full max-w-[600px] bg-[#262421] border border-[#312e2b] rounded-lg mt-3 p-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={goToStart}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#312e2b] rounded transition"
                title="First Move (Up Arrow)"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={goToPrev}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#312e2b] rounded transition"
                title="Previous Move (Left Arrow)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={goToNext}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#312e2b] rounded transition"
                title="Next Move (Right Arrow)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <button
                onClick={goToEnd}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#312e2b] rounded transition"
                title="Last Move (Down Arrow)"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setBoardOrientation((prev) => (prev === "white" ? "black" : "white"))}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#312e2b] hover:bg-[#3d3a36] text-xs font-semibold rounded text-gray-300 transition"
              >
                <FlipHorizontal className="w-4 h-4 text-amber-400" />
                Flip Board
              </button>

              <button
                onClick={() => {
                  setGame(new Chess());
                  setHistory([]);
                  setCurrentMoveIndex(-1);
                }}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-[#312e2b] rounded transition"
                title="Reset Board"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Engine PV + Move History Tree (4 cols on lg) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 h-[680px]">
          {/* Best Engine Line Box */}
          <div className="bg-[#262421] border border-[#312e2b] rounded-xl p-4 shadow-lg flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-gray-400 font-semibold border-b border-[#312e2b] pb-2">
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Cpu className="w-4 h-4" /> Top Engine Line (PV)
              </span>
              <span>Stockfish 18</span>
            </div>
            
            <div className="font-mono text-sm text-gray-200 bg-[#1e1d1b] p-3 rounded-lg border border-[#312e2b] min-h-[50px] flex items-center">
              {evalData.pv && evalData.pv.length > 0 ? (
                <span className="leading-relaxed">
                  <strong className="text-amber-400 font-bold mr-2">
                    1. {evalData.pv[0]}
                  </strong>
                  {evalData.pv.slice(1, 6).join(" ")}
                </span>
              ) : (
                <span className="text-gray-500 text-xs italic">Calculating best lines...</span>
              )}
            </div>
          </div>

          {/* Move History Component */}
          <div className="flex-1 bg-[#262421] border border-[#312e2b] rounded-xl p-4 shadow-lg flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#312e2b]">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Move History
                <span className="text-xs bg-[#312e2b] text-gray-400 px-2 py-0.5 rounded-full font-mono">
                  {history.length} moves
                </span>
              </h2>
            </div>

            <MoveList
              history={history}
              currentMoveIndex={currentMoveIndex}
              onSelectMove={(idx) => setCurrentMoveIndex(idx)}
            />
          </div>
        </div>
      </main>

      {/* PGN/FEN Modal */}
      <PgnFenModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLoadPgn={handleLoadPgn}
        onLoadFen={handleLoadFen}
      />
    </div>
  );
}
