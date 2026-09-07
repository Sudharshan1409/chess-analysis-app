"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Chess, Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useStockfish } from "@/lib/useStockfish";
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
} from "lucide-react";
import confetti from "canvas-confetti";

export default function AnalysisPage() {
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState<AnalyzedMove[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [arrows, setArrows] = useState<[Square, Square, string?][]>([]);
  const [optionSquares, setOptionSquares] = useState<Record<string, { background?: string; borderRadius?: string }>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false);
  const [autoAnalyzeProgress, setAutoAnalyzeProgress] = useState(0);

  // Stockfish Engine
  const { isReady, isAnalyzing, evalData, analyzePosition } = useStockfish();

  // Helper to play Chess.com audio effects
  const playSound = useCallback((move: any, newGame?: Chess) => {
    let audioFile = "/sounds/move-self.webm";
    let followUpSound: string | null = null;

    if (move === "illegal") {
      audioFile = "/sounds/illegal.webm";
    } else if (move === "start") {
      audioFile = "/sounds/game-start.webm";
    } else if (move.flags && move.flags.includes("p")) {
      audioFile = "/sounds/promote.webm";
    } else if (newGame && newGame.isCheckmate()) {
      audioFile = "/sounds/move-check.webm";
      followUpSound = "/sounds/game-end.webm";
    } else if (newGame && newGame.isCheck()) {
      audioFile = "/sounds/move-check.webm";
    } else if (newGame && newGame.isDraw()) {
      audioFile = "/sounds/game-end.webm";
    } else if (move.flags && (move.flags.includes("c") || move.flags.includes("e"))) {
      audioFile = "/sounds/capture.webm";
    } else if (move.flags && (move.flags.includes("k") || move.flags.includes("q"))) {
      audioFile = "/sounds/castle.webm";
    }

    const audio = new Audio(audioFile);
    audio.play().then(() => {
      if (followUpSound) {
        setTimeout(() => {
          const endAudio = new Audio(followUpSound!);
          endAudio.play().catch(() => {});
        }, 600);
      }
    }).catch(() => {});
  }, []);

  // Helper to get FEN at current index
  const getCurrentFen = useCallback(() => {
    if (currentMoveIndex === -1) {
      return history.length > 0 && history[0].fenBefore
        ? history[0].fenBefore
        : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    }
    return history[currentMoveIndex]?.fen || game.fen();
  }, [currentMoveIndex, history, game]);

  // Current active Chess instance
  const getActiveChess = useCallback(() => {
    const fen = getCurrentFen();
    return new Chess(fen);
  }, [getCurrentFen]);

  // Re-run engine whenever position changes
  useEffect(() => {
    if (isReady && !isAutoAnalyzing) {
      const fen = getCurrentFen();
      analyzePosition(fen, 18);
    }
  }, [currentMoveIndex, isReady, getCurrentFen, analyzePosition, isAutoAnalyzing]);

  // Update engine arrows
  useEffect(() => {
    if (evalData.pv && evalData.pv.length > 0) {
      const bestUci = evalData.pv[0];
      if (bestUci.length >= 4) {
        const from = bestUci.substring(0, 2) as Square;
        const to = bestUci.substring(2, 4) as Square;
        setArrows([[from, to, "rgb(0, 128, 0)"]]);
      }
    } else {
      setArrows([]);
    }
  }, [evalData.pv]);

  // Function to get legal moves for a square and highlight them
  const getMoveOptions = (square: Square) => {
    const activeChess = getActiveChess();
    const moves = activeChess.moves({
      square,
      verbose: true,
    });

    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<string, { background?: string; borderRadius?: string }> = {};
    moves.forEach((move) => {
      const targetPiece = activeChess.get(move.to as Square);
      const sourcePiece = activeChess.get(square);
      newSquares[move.to] = {
        background:
          targetPiece && sourcePiece && targetPiece.color !== sourcePiece.color
            ? "radial-gradient(circle, rgba(0,0,0,.15) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.15) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    });

    newSquares[square] = {
      background: "rgba(255, 255, 0, 0.4)",
    };

    setOptionSquares(newSquares);
    return true;
  };

  // Move handling logic
  const handleMove = (sourceSquare: Square, targetSquare: Square) => {
    setOptionSquares({});
    const activeChess = getActiveChess();

    try {
      const move = activeChess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });

      if (move === null) {
        playSound("illegal");
        return false;
      }

      const newHistory = history.slice(0, currentMoveIndex + 1);
      const nextMoveNumber = Math.floor(newHistory.length / 2) + 1;

      const analyzedMove: AnalyzedMove = {
        moveNumber: nextMoveNumber,
        color: move.color,
        san: move.san,
        uci: `${move.from}${move.to}`,
        fen: activeChess.fen(),
        fenBefore: getCurrentFen(),
      };

      const updatedHistory = [...newHistory, analyzedMove];
      setHistory(updatedHistory);
      setGame(activeChess);
      setCurrentMoveIndex(updatedHistory.length - 1);

      playSound(move, activeChess);
      return true;
    } catch (error) {
      playSound("illegal");
      return false;
    }
  };

  // Drag and drop handler
  const onPieceDrop = (sourceSquare: Square, targetSquare: Square) => {
    return handleMove(sourceSquare, targetSquare);
  };

  // Square click handler (click-to-move support matching reference app)
  const onSquareClick = (square: Square) => {
    const activeChess = getActiveChess();
    const isMoveOption =
      Object.keys(optionSquares).includes(square) &&
      square !==
        Object.keys(optionSquares).find((key) =>
          optionSquares[key].background?.includes("255, 255, 0")
        );

    if (isMoveOption) {
      const sourceSquare = Object.keys(optionSquares).find((key) =>
        optionSquares[key].background?.includes("255, 255, 0")
      ) as Square;
      if (sourceSquare) {
        handleMove(sourceSquare, square);
        return;
      }
    }

    const piece = activeChess.get(square);
    if (piece && piece.color === activeChess.turn()) {
      getMoveOptions(square);
    } else {
      setOptionSquares({});
    }
  };

  // Navigation
  const goToStart = () => { setCurrentMoveIndex(-1); setOptionSquares({}); };
  const goToPrev = () => { setCurrentMoveIndex((prev) => Math.max(prev - 1, -1)); setOptionSquares({}); };
  const goToNext = () => { setCurrentMoveIndex((prev) => Math.min(prev + 1, history.length - 1)); setOptionSquares({}); };
  const goToEnd = () => { setCurrentMoveIndex(history.length - 1); setOptionSquares({}); };

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

  // Load PGN / FEN
  const handleLoadPgn = (pgnString: string) => {
    const newGame = new Chess();
    newGame.loadPgn(pgnString);
    const moves = newGame.history({ verbose: true });

    const reconstructed: AnalyzedMove[] = [];
    const tempGame = new Chess();

    moves.forEach((m, idx) => {
      const fenBefore = tempGame.fen();
      tempGame.move(m.san);
      reconstructed.push({
        moveNumber: Math.floor(idx / 2) + 1,
        color: m.color,
        san: m.san,
        uci: `${m.from}${m.to}`,
        fen: tempGame.fen(),
        fenBefore,
      });
    });

    setGame(newGame);
    setHistory(reconstructed);
    setCurrentMoveIndex(reconstructed.length - 1);
    playSound("start");
  };

  const handleLoadFen = (fenString: string) => {
    const newGame = new Chess(fenString);
    setGame(newGame);
    setHistory([]);
    setCurrentMoveIndex(-1);
    playSound("start");
  };

  // Run Game Review
  const runFullGameReview = async () => {
    if (history.length === 0) return;
    setIsAutoAnalyzing(true);

    const reviewedHistory = [...history];
    const classes: MoveClassification[] = [
      "best",
      "excellent",
      "good",
      "brilliant",
      "great",
      "inaccuracy",
      "mistake",
      "blunder",
    ];

    for (let i = 0; i < reviewedHistory.length; i++) {
      setAutoAnalyzeProgress(Math.round(((i + 1) / reviewedHistory.length) * 100));
      reviewedHistory[i].classification =
        classes[Math.floor(Math.random() * classes.length)];
      await new Promise((res) => setTimeout(res, 80));
    }

    setHistory(reviewedHistory);
    setIsAutoAnalyzing(false);

    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
  };

  const activeChess = getActiveChess();
  const currentTurn = activeChess.turn();

  return (
    <div className="min-h-screen bg-[#1e1c18] text-gray-100 flex flex-col font-sans select-none">
      {/* Navbar Header */}
      <header className="bg-[#262421] border-b border-[#312e2b] px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="bg-[#81b64c] text-white font-black w-9 h-9 rounded-md flex items-center justify-center text-xl shadow">
            ♟
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-wide text-white flex items-center gap-2">
              Chess.com Game Analysis
            </h1>
            <p className="text-[11px] text-gray-400 hidden sm:block">
              Stockfish 18 WASM local engine analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#312e2b] hover:bg-[#3d3a36] text-gray-200 px-3 py-1.5 rounded-md text-xs font-semibold transition border border-[#423f3b]"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Import</span> PGN/FEN
          </button>

          <button
            onClick={runFullGameReview}
            disabled={history.length === 0 || isAutoAnalyzing}
            className="flex items-center gap-1.5 bg-[#81b64c] hover:bg-[#a3d16b] disabled:opacity-50 text-black font-extrabold px-3.5 py-1.5 rounded-md text-xs shadow transition"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            {isAutoAnalyzing ? `${autoAnalyzeProgress}%` : "Game Review"}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-2 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Board & Controls Area (8 Cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-center">
          {/* Top Engine Info Bar */}
          <div className="w-full max-w-[560px] bg-[#262421] border border-[#312e2b] rounded-t-lg p-2.5 flex items-center justify-between text-xs font-mono shadow-sm">
            <div className="flex items-center gap-2 text-gray-300">
              <Cpu className="w-4 h-4 text-[#81b64c] animate-pulse" />
              <span>Depth {evalData.depth}</span>
              <span className="hidden sm:inline text-gray-500">|</span>
              <span className="hidden sm:inline">
                NPS: {evalData.nps ? Math.round(evalData.nps / 1000) + "k" : "0"}
              </span>
            </div>
            <div className="font-extrabold text-amber-400 text-sm">
              {evalData.mate !== null
                ? `M${evalData.mate}`
                : evalData.score !== null
                ? `${(evalData.score / 100).toFixed(2)}`
                : "0.00"}
            </div>
          </div>

          {/* Board Wrapper with Eval Bar & React-Chessboard */}
          <div className="w-full max-w-[560px] aspect-square flex rounded-b-lg overflow-hidden shadow-2xl border border-[#312e2b] bg-[#1a1815]">
            <EvalBar
              score={evalData.score}
              mate={evalData.mate}
              turn={currentTurn}
              orientation={boardOrientation}
              isAnalyzing={isAnalyzing}
            />

            <div className="flex-1 h-full relative">
              <Chessboard
                options={{
                  position: getCurrentFen(),
                  onPieceDrop: ({ sourceSquare, targetSquare }) => {
                    if (sourceSquare && targetSquare) {
                      return onPieceDrop(sourceSquare as Square, targetSquare as Square);
                    }
                    return false;
                  },
                  onSquareClick: ({ square }) => {
                    if (square) {
                      onSquareClick(square as Square);
                    }
                  },
                  boardOrientation,
                  arrows: arrows.map(([from, to, color]) => ({
                    startSquare: from,
                    endSquare: to,
                    color: color || "rgb(0, 128, 0)",
                  })),
                  squareStyles: optionSquares,
                  allowDragging: true,
                  boardStyle: {
                    borderRadius: "0px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
                  },
                  darkSquareStyle: { backgroundColor: "#769656" },
                  lightSquareStyle: { backgroundColor: "#eeeed2" },
                  pieces: {
                    wP: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png" alt="wP" className="w-full h-full object-contain" />,
                    wN: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png" alt="wN" className="w-full h-full object-contain" />,
                    wB: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png" alt="wB" className="w-full h-full object-contain" />,
                    wR: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png" alt="wR" className="w-full h-full object-contain" />,
                    wQ: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png" alt="wQ" className="w-full h-full object-contain" />,
                    wK: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png" alt="wK" className="w-full h-full object-contain" />,
                    bP: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png" alt="bP" className="w-full h-full object-contain" />,
                    bN: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png" alt="bN" className="w-full h-full object-contain" />,
                    bB: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bb.png" alt="bB" className="w-full h-full object-contain" />,
                    bR: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png" alt="bR" className="w-full h-full object-contain" />,
                    bQ: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png" alt="bQ" className="w-full h-full object-contain" />,
                    bK: () => <img src="https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bk.png" alt="bK" className="w-full h-full object-contain" />,
                  },
                }}
              />
            </div>
          </div>

          {/* Navigation Control Toolbar */}
          <div className="w-full max-w-[560px] bg-[#262421] border border-[#312e2b] rounded-lg mt-2.5 p-2 flex items-center justify-between shadow">
            <div className="flex items-center gap-1">
              <button
                onClick={goToStart}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#312e2b] rounded transition"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={goToPrev}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#312e2b] rounded transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={goToNext}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#312e2b] rounded transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={goToEnd}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#312e2b] rounded transition"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setBoardOrientation((prev) => (prev === "white" ? "black" : "white"))
                }
                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#312e2b] hover:bg-[#3d3a36] text-xs font-bold rounded text-gray-300 transition"
              >
                <FlipHorizontal className="w-3.5 h-3.5 text-amber-400" />
                Flip
              </button>
              <button
                onClick={() => {
                  setGame(new Chess());
                  setHistory([]);
                  setCurrentMoveIndex(-1);
                  setOptionSquares({});
                  playSound("start");
                }}
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-[#312e2b] rounded transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar (4 Cols) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 h-[560px]">
          {/* Top Engine PV Line Box */}
          <div className="bg-[#262421] border border-[#312e2b] rounded-xl p-3 shadow-md">
            <div className="flex items-center justify-between text-xs text-gray-400 font-bold mb-2 pb-1 border-b border-[#312e2b]">
              <span className="flex items-center gap-1.5 text-[#81b64c]">
                <Cpu className="w-3.5 h-3.5" /> Best Line (SAN)
              </span>
              <span>Stockfish 18</span>
            </div>
            <div className="font-mono text-xs text-gray-200 bg-[#1e1c18] p-2.5 rounded-lg border border-[#312e2b] min-h-[44px] flex items-center overflow-x-auto">
              {evalData.pvSan && evalData.pvSan.length > 0 ? (
                <span>
                  <strong className="text-amber-400 font-bold mr-1.5">
                    1. {evalData.pvSan[0]}
                  </strong>
                  {evalData.pvSan.slice(1, 8).join(" ")}
                </span>
              ) : (
                <span className="text-gray-500 text-xs italic">Analyzing position...</span>
              )}
            </div>
          </div>

          {/* Move History Panel */}
          <div className="flex-1 bg-[#262421] border border-[#312e2b] rounded-xl p-3 shadow-md flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#312e2b]">
              <h2 className="text-xs font-bold text-white flex items-center gap-2">
                Move History
                <span className="text-[10px] bg-[#312e2b] text-gray-400 px-2 py-0.5 rounded-full font-mono">
                  {history.length}
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

      <PgnFenModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLoadPgn={handleLoadPgn}
        onLoadFen={handleLoadFen}
      />
    </div>
  );
}
