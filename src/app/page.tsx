"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Chess, Square } from "chess.js";
import { useStockfish } from "@/lib/useStockfish";
import { EvalBar } from "@/components/EvalBar";
import { HorizontalEvalBar } from "@/components/HorizontalEvalBar";
import { MoveList, AnalyzedMove } from "@/components/MoveList";
import { PgnFenModal } from "@/components/PgnFenModal";
import { PromotionModal } from "@/components/PromotionModal";
import { SettingsModal, SettingsState } from "@/components/SettingsModal";
import {
  RotateCcw,
  SkipBack,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  FlipHorizontal,
  Upload,
  Cpu,
  Search,
  Gamepad2,
  GraduationCap,
  Tv,
  Users,
  Settings
} from "lucide-react";

export default function AnalysisPage() {
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState<AnalyzedMove[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [arrows, setArrows] = useState<{ from: Square; to: Square; color?: string }[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Default assistance settings matching current state
  const [settings, setSettings] = useState<SettingsState>({
    showEvalBar: true,
    showSuggestionArrows: true,
    showThreatArrows: true,
    showEngineLines: true,
    enableSounds: true,
  });

  // Promotion state
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
    color: "w" | "b";
  } | null>(null);

  // Stockfish Engine Hook (MultiPV 3 lines)
  const { isReady, isAnalyzing, evalData, analyzePosition } = useStockfish();

  // Audio effects helper
  const playSound = useCallback((move: any, newGame?: Chess) => {
    if (!settings.enableSounds) return;

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
  }, [settings.enableSounds]);

  // Helper to get FEN at current index
  const getCurrentFen = useCallback(() => {
    if (currentMoveIndex === -1) {
      if (history.length > 0 && history[0].fenBefore) {
        return history[0].fenBefore;
      }
      return game.fen();
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
    if (isReady) {
      const fen = getCurrentFen();
      analyzePosition(fen, 18);
    }
  }, [currentMoveIndex, isReady, getCurrentFen, analyzePosition]);

  // Update SVG arrows directly from engine calculation
  useEffect(() => {
    const newArrows: { from: Square; to: Square; color?: string }[] = [];

    // 1. Suggestion arrow (Cyan)
    if (settings.showSuggestionArrows && evalData.lines.length > 0 && evalData.lines[0]?.pvUci?.length > 0) {
      const bestUci = evalData.lines[0].pvUci[0];
      if (bestUci && bestUci.length >= 4) {
        const from = bestUci.substring(0, 2) as Square;
        const to = bestUci.substring(2, 4) as Square;
        newArrows.push({ from, to, color: "rgba(56, 189, 248, 0.95)" });
      }
    }

    // 2. Threat arrow calculation (Red) if enabled
    if (settings.showThreatArrows) {
      const activeChess = getActiveChess();
      const tokens = activeChess.fen().split(" ");
      tokens[1] = tokens[1] === "w" ? "b" : "w";
      try {
        const threatChess = new Chess(tokens.join(" "));
        const threatMoves = threatChess.moves({ verbose: true });
        const captureMove = threatMoves.find((m) => m.captured);
        if (captureMove) {
          newArrows.push({
            from: captureMove.from as Square,
            to: captureMove.to as Square,
            color: "rgba(239, 68, 68, 0.9)",
          });
        }
      } catch (e) {
        // ignore
      }
    }

    setArrows(newArrows);
  }, [evalData.lines, settings.showSuggestionArrows, settings.showThreatArrows, getActiveChess]);

  // Make move
  const makeMove = (from: Square, to: Square, promotionPiece?: "q" | "r" | "b" | "n") => {
    const activeChess = getActiveChess();

    const piece = activeChess.get(from);
    const isPawn = piece?.type === "p";
    const isPromotionRank = (piece?.color === "w" && to[1] === "8") || (piece?.color === "b" && to[1] === "1");

    if (isPawn && isPromotionRank && !promotionPiece) {
      setPendingPromotion({ from, to, color: piece.color });
      return true;
    }

    try {
      const move = activeChess.move({
        from,
        to,
        promotion: promotionPiece || "q",
      });

      if (move) {
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
        setSelectedSquare(null);
        setValidMoves([]);
        setPendingPromotion(null);
        playSound(move, activeChess);
        return true;
      }
    } catch (e) {
      playSound("illegal");
    }
    setSelectedSquare(null);
    setValidMoves([]);
    setPendingPromotion(null);
    return false;
  };

  // Square click handler
  const handleSquareClick = (sq: Square) => {
    const activeChess = getActiveChess();
    const piece = activeChess.get(sq);

    if (!selectedSquare) {
      if (piece && piece.color === activeChess.turn()) {
        setSelectedSquare(sq);
        const moves = activeChess.moves({ square: sq, verbose: true });
        setValidMoves(moves.map((m) => m.to as Square));
      }
    } else {
      if (selectedSquare === sq) {
        setSelectedSquare(null);
        setValidMoves([]);
      } else {
        const moved = makeMove(selectedSquare, sq);
        if (!moved) {
          if (piece && piece.color === activeChess.turn()) {
            setSelectedSquare(sq);
            const moves = activeChess.moves({ square: sq, verbose: true });
            setValidMoves(moves.map((m) => m.to as Square));
          } else {
            setSelectedSquare(null);
            setValidMoves([]);
          }
        }
      }
    }
  };

  // Navigation
  const goToStart = () => {
    setCurrentMoveIndex(-1);
    setSelectedSquare(null);
    setValidMoves([]);
    playSound("start");
  };
  const goToPrev = () => {
    setCurrentMoveIndex((prev) => {
      const nextIdx = Math.max(prev - 1, -1);
      if (nextIdx !== prev) playSound("self");
      return nextIdx;
    });
    setSelectedSquare(null);
    setValidMoves([]);
  };
  const goToNext = () => {
    setCurrentMoveIndex((prev) => {
      const nextIdx = Math.min(prev + 1, history.length - 1);
      if (nextIdx !== prev) {
        const move = history[nextIdx];
        if (move) {
          playSound({ flags: move.uci }, new Chess(move.fen));
        } else {
          playSound("self");
        }
      }
      return nextIdx;
    });
    setSelectedSquare(null);
    setValidMoves([]);
  };
  const goToEnd = () => {
    if (history.length > 0) {
      setCurrentMoveIndex(history.length - 1);
      playSound("start");
    }
    setSelectedSquare(null);
    setValidMoves([]);
  };

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

  const activeChess = getActiveChess();
  const currentTurn = activeChess.turn();

  // Top eval score
  const topEval = evalData.lines[0];
  const topScoreFormatted =
    topEval?.mate !== undefined && topEval?.mate !== null
      ? `M${topEval.mate}`
      : topEval?.cp !== undefined && topEval?.cp !== null
      ? `${topEval.cp > 0 ? "+" : ""}${(topEval.cp / 100).toFixed(2)}`
      : "0.00";

  // Board rank/file orientation
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

  const displayRanks = boardOrientation === "white" ? ranks : [...ranks].reverse();
  const displayFiles = boardOrientation === "white" ? files : [...files].reverse();

  const getSquareCenterCoords = (sq: Square) => {
    const file = sq[0];
    const rank = sq[1];
    const fIndex = displayFiles.indexOf(file);
    const rIndex = displayRanks.indexOf(rank);

    if (fIndex === -1 || rIndex === -1) return { x: 0, y: 0 };
    const x = fIndex * 12.5 + 6.25;
    const y = rIndex * 12.5 + 6.25;
    return { x, y };
  };

  return (
    <div className="min-h-screen lg:h-screen w-screen bg-[#21201d] text-gray-200 flex flex-col lg:flex-row font-sans select-none overflow-x-hidden lg:overflow-hidden">
      {/* 1. Left Chess.com Navigation Bar (Desktop) */}
      <aside className="hidden lg:flex w-48 h-full bg-[#1d1b18] border-r border-[#2d2b27] flex-col justify-between p-3 shrink-0">
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="text-emerald-500 text-2xl font-black">♟</div>
            <span className="font-extrabold text-white text-lg tracking-wide">Chess.com</span>
          </div>

          <nav className="space-y-1 text-sm font-bold">
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#282622] transition">
              <Gamepad2 className="w-5 h-5 text-amber-500" /> Play
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#282622] transition">
              <Search className="w-5 h-5 text-emerald-500" /> Puzzles
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#282622] transition">
              <GraduationCap className="w-5 h-5 text-cyan-500" /> Learn
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white bg-[#282622] transition">
              <Cpu className="w-5 h-5 text-[#81b64c]" /> Analysis
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#282622] transition">
              <Tv className="w-5 h-5 text-blue-500" /> Watch
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#282622] transition">
              <Users className="w-5 h-5 text-purple-500" /> Community
            </a>
          </nav>
        </div>

        <div className="space-y-2 border-t border-[#2d2b27] pt-3">
          <button onClick={() => setIsModalOpen(true)} className="w-full flex items-center gap-2 bg-[#2d2a26] hover:bg-[#383531] text-amber-400 px-3 py-2 rounded-lg text-xs font-bold transition">
            <Upload className="w-4 h-4" /> Import PGN / FEN
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden bg-[#1d1b18] border-b border-[#2d2b27] px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-emerald-500 font-black text-xl">♟</span>
          <span className="font-extrabold text-white text-base">Chess Analysis</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 bg-[#2d2a26] text-gray-300 rounded-md border border-[#3c3934]">
            <Settings className="w-4 h-4 text-amber-400" />
          </button>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 bg-[#2d2a26] text-amber-400 px-3 py-1.5 rounded-md text-xs font-bold border border-[#3c3934]">
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
        </div>
      </header>

      {/* 2. Main Workspace */}
      <div className="flex-1 h-full flex flex-col lg:flex-row p-2 lg:p-4 gap-4 items-center lg:items-stretch justify-between overflow-y-auto lg:overflow-hidden">
        {/* Center Main Board Area */}
        <div className="flex-1 h-full flex flex-col items-center justify-between min-w-0">
          {/* Top Player Info (Black) */}
          <div className="w-full flex items-center justify-between py-1 px-1 text-xs sm:text-sm text-gray-300 font-bold shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#312e2b] flex items-center justify-center text-gray-400 text-xs">👤</div>
              <span>{boardOrientation === "white" ? "Black" : "White"}</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-gray-400">depth={evalData.depth}</span>
              <span className="text-amber-400 font-extrabold">{topScoreFormatted}</span>
            </div>
          </div>

          {/* Horizontal Evaluation Bar for Mobile directly in the gap above Rank 8 */}
          {settings.showEvalBar && (
            <div className="lg:hidden w-full">
              <HorizontalEvalBar
                score={topEval?.cp ?? null}
                mate={topEval?.mate ?? null}
                turn={currentTurn}
                orientation={boardOrientation}
                isAnalyzing={isAnalyzing}
              />
            </div>
          )}

          {/* Square Board Area */}
          <div className="flex-1 w-full flex items-center justify-center min-h-0 py-1">
            <div className="h-full aspect-square max-w-full flex shadow-2xl rounded overflow-hidden border border-[#312e2b] bg-[#1d1b18] relative">
              {/* Vertical Eval Bar for Desktop */}
              {settings.showEvalBar && (
                <div className="hidden lg:block h-full">
                  <EvalBar
                    score={topEval?.cp ?? null}
                    mate={topEval?.mate ?? null}
                    turn={currentTurn}
                    orientation={boardOrientation}
                    isAnalyzing={isAnalyzing}
                  />
                </div>
              )}

              {/* Chess.com Authentic Board Theme */}
              <div className="flex-1 aspect-square grid grid-cols-8 grid-rows-8 relative chess-board-theme overflow-hidden">
                {displayRanks.map((r, rIdx) =>
                  displayFiles.map((f, fIdx) => {
                    const sq = `${f}${r}` as Square;
                    const piece = activeChess.get(sq);
                    const isSelected = selectedSquare === sq;
                    const isValidTarget = validMoves.includes(sq);

                    const pieceImgUrl = piece
                      ? `https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${piece.color}${piece.type}.png`
                      : null;

                    return (
                      <div
                        key={sq}
                        onClick={() => handleSquareClick(sq)}
                        className={`relative flex items-center justify-center cursor-pointer ${
                          isSelected ? "bg-amber-300/50" : ""
                        }`}
                      >
                        {pieceImgUrl && (
                          <img
                            src={pieceImgUrl}
                            alt={sq}
                            className="w-full h-full object-contain pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                            draggable={false}
                          />
                        )}

                        {isValidTarget && (
                          <div
                            className={`absolute ${
                              piece
                                ? "inset-0 border-4 border-red-500/60 rounded-full"
                                : "w-4 h-4 bg-black/25 rounded-full"
                            }`}
                          />
                        )}

                        {fIdx === 0 && (
                          <span className="absolute top-0.5 left-1 text-[11px] font-bold text-gray-700/80">
                            {r}
                          </span>
                        )}
                        {rIdx === 7 && (
                          <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-gray-700/80">
                            {f}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}

                {/* SVG Overlay for Best Move Arrows */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                  <defs>
                    <marker id="arrowhead-cyan" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <polygon points="0 0, 6 3, 0 6" fill="rgba(56, 189, 248, 0.95)" />
                    </marker>
                    <marker id="arrowhead-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <polygon points="0 0, 6 3, 0 6" fill="rgba(239, 68, 68, 0.95)" />
                    </marker>
                  </defs>

                  {arrows.map((arr, idx) => {
                    const start = getSquareCenterCoords(arr.from);
                    const end = getSquareCenterCoords(arr.to);
                    const isRed = arr.color?.includes("239");
                    return (
                      <line
                        key={idx}
                        x1={`${start.x}%`}
                        y1={`${start.y}%`}
                        x2={`${end.x}%`}
                        y2={`${end.y}%`}
                        stroke={arr.color || "rgba(56, 189, 248, 0.95)"}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        markerEnd={isRed ? "url(#arrowhead-red)" : "url(#arrowhead-cyan)"}
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          {/* Bottom Player Info (White) */}
          <div className="w-full flex items-center justify-between py-1 px-1 text-xs sm:text-sm text-gray-300 font-bold shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gray-200 text-black flex items-center justify-center text-xs">👤</div>
              <span>{boardOrientation === "white" ? "White" : "Black"}</span>
            </div>
          </div>

          {/* Mobile Bottom Navigation Controls Bar */}
          <div className="lg:hidden w-full bg-[#1e1c18] border-t border-[#312e2b] p-2 mt-2 rounded-lg shrink-0">
            <div className="grid grid-cols-4 gap-2">
              <button onClick={goToStart} className="py-2 bg-[#2d2a26] hover:bg-[#383531] text-gray-300 rounded-lg flex items-center justify-center font-bold transition active:scale-95 border border-[#383531]">
                <SkipBack className="w-5 h-5" />
              </button>
              <button onClick={goToPrev} className="py-2 bg-[#2d2a26] hover:bg-[#383531] text-gray-300 rounded-lg flex items-center justify-center font-bold transition active:scale-95 border border-[#383531]">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={goToNext} className="py-2 bg-[#2d2a26] hover:bg-[#383531] text-gray-300 rounded-lg flex items-center justify-center font-bold transition active:scale-95 border border-[#383531]">
                <ChevronRight className="w-6 h-6" />
              </button>
              <button onClick={goToEnd} className="py-2 bg-[#2d2a26] hover:bg-[#383531] text-gray-300 rounded-lg flex items-center justify-center font-bold transition active:scale-95 border border-[#383531]">
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 3. Right Sidebar Container */}
        <div className="w-full lg:w-[420px] h-full bg-[#262421] border border-[#312e2b] rounded-lg shadow-2xl flex flex-col shrink-0 overflow-hidden">
          {/* Top Analysis Header with Gear Icon */}
          <div className="bg-[#1e1c18] px-4 py-3 border-b border-[#312e2b] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Search className="w-4 h-4 text-emerald-400" />
              <span>Analysis</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Stockfish 18
              </span>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-1 hover:bg-[#2d2a26] rounded text-gray-400 hover:text-amber-400 transition"
                title="Assistance Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conditional MultiPV Engine Lines */}
          {settings.showEngineLines && (
            <div className="bg-[#1e1c18] border-b border-[#312e2b] p-2 space-y-1.5 shrink-0">
              {evalData.lines.slice(0, 3).map((line, idx) => {
                const scoreStr =
                  line.mate !== null && line.mate !== undefined
                    ? `M${line.mate}`
                    : line.cp !== null && line.cp !== undefined
                    ? `${line.cp > 0 ? "+" : ""}${(line.cp / 100).toFixed(2)}`
                    : "0.00";

                return (
                  <div key={idx} className="flex items-center gap-2 text-xs font-mono bg-[#262421] p-2 rounded border border-[#312e2b]">
                    <span className="bg-[#312e2b] text-amber-400 px-2 py-0.5 rounded font-extrabold text-xs shrink-0">
                      {scoreStr}
                    </span>
                    <div className="text-gray-300 truncate">
                      {line.pvSan && line.pvSan.length > 0 ? (
                        <span>
                          <strong className="text-amber-300 mr-1">1. {line.pvSan[0]}</strong>
                          {line.pvSan.slice(1, 6).join(" ")}
                        </span>
                      ) : (
                        <span className="text-gray-500 italic">Calculating line {idx + 1}...</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Move History Panel */}
          <div className="flex-1 overflow-hidden p-2 flex flex-col min-h-0 bg-[#262421]">
            <MoveList
              history={history}
              currentMoveIndex={currentMoveIndex}
              onSelectMove={(idx) => setCurrentMoveIndex(idx)}
            />
          </div>

          {/* Desktop Bottom Controls Bar */}
          <div className="hidden lg:flex bg-[#1e1c18] border-t border-[#312e2b] p-3 flex-col gap-2 shrink-0">
            <div className="grid grid-cols-4 gap-2">
              <button onClick={goToStart} className="py-3 bg-[#2d2a26] hover:bg-[#383531] text-gray-300 hover:text-white rounded-lg flex items-center justify-center font-bold transition border border-[#383531]">
                <SkipBack className="w-5 h-5" />
              </button>
              <button onClick={goToPrev} className="py-3 bg-[#2d2a26] hover:bg-[#383531] text-gray-300 hover:text-white rounded-lg flex items-center justify-center font-bold transition border border-[#383531]">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={goToNext} className="py-3 bg-[#2d2a26] hover:bg-[#383531] text-gray-300 hover:text-white rounded-lg flex items-center justify-center font-bold transition border border-[#383531]">
                <ChevronRight className="w-6 h-6" />
              </button>
              <button onClick={goToEnd} className="py-3 bg-[#2d2a26] hover:bg-[#383531] text-gray-300 hover:text-white rounded-lg flex items-center justify-center font-bold transition border border-[#383531]">
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between px-1 pt-1 text-xs text-gray-400 font-bold">
              <button
                onClick={() => setBoardOrientation((prev) => (prev === "white" ? "black" : "white"))}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#2d2a26] hover:bg-[#383531] text-gray-300 rounded-lg border border-[#383531] transition"
              >
                <FlipHorizontal className="w-4 h-4 text-amber-400" />
                Flip Board
              </button>

              <button
                onClick={() => {
                  setGame(new Chess());
                  setHistory([]);
                  setCurrentMoveIndex(-1);
                  setSelectedSquare(null);
                  setValidMoves([]);
                  playSound("start");
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-gray-400 hover:text-red-400 transition"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Assistance Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onUpdateSettings={(newSettings) =>
          setSettings((prev) => ({ ...prev, ...newSettings }))
        }
        onClose={() => setIsSettingsOpen(false)}
      />

      <PromotionModal
        isOpen={pendingPromotion !== null}
        color={pendingPromotion?.color || "w"}
        onSelect={(piece) => {
          if (pendingPromotion) {
            makeMove(pendingPromotion.from, pendingPromotion.to, piece);
          }
        }}
        onClose={() => setPendingPromotion(null)}
      />

      <PgnFenModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLoadPgn={handleLoadPgn}
        onLoadFen={handleLoadFen}
      />
    </div>
  );
}
