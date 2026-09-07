"use client";

import React from "react";

export type MoveClassification = "brilliant" | "great" | "best" | "excellent" | "good" | "inaccuracy" | "mistake" | "blunder" | "book";

export interface AnalyzedMove {
  moveNumber: number;
  color: "w" | "b";
  san: string;
  uci: string;
  fen: string;
  fenBefore?: string;
  classification?: MoveClassification;
  evalScore?: number | null; // Centipawns
  evalMate?: number | null;
  bestMoveSan?: string;
  comment?: string;
}

interface MoveListProps {
  history: AnalyzedMove[];
  currentMoveIndex: number; // -1 for start, 0..N-1
  onSelectMove: (index: number) => void;
}

export const MoveList: React.FC<MoveListProps> = ({
  history,
  currentMoveIndex,
  onSelectMove,
}) => {
  // Group moves into pairs (White move, Black move)
  const movePairs: { number: number; white?: AnalyzedMove; whiteIdx?: number; black?: AnalyzedMove; blackIdx?: number }[] = [];

  history.forEach((move, idx) => {
    if (move.color === "w") {
      movePairs.push({
        number: move.moveNumber,
        white: move,
        whiteIdx: idx,
      });
    } else {
      if (movePairs.length > 0 && movePairs[movePairs.length - 1].black === undefined) {
        movePairs[movePairs.length - 1].black = move;
        movePairs[movePairs.length - 1].blackIdx = idx;
      } else {
        movePairs.push({
          number: move.moveNumber,
          black: move,
          blackIdx: idx,
        });
      }
    }
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#262421] rounded-md p-2 text-sm font-sans divide-y divide-[#312e2b]">
      {movePairs.length === 0 ? (
        <div className="h-full flex items-center justify-center text-gray-500 text-xs italic">
          No moves made yet. Make a move on the board or load a game PGN.
        </div>
      ) : (
        movePairs.map((pair, pIdx) => (
          <div key={pIdx} className="grid grid-cols-12 items-center py-1.5 px-2 hover:bg-[#2e2b27] rounded transition">
            <span className="col-span-2 text-gray-500 font-mono text-xs">
              {pair.number}.
            </span>

            {/* White Move */}
            <div
              onClick={() => pair.whiteIdx !== undefined && onSelectMove(pair.whiteIdx)}
              className={`col-span-5 flex items-center justify-between cursor-pointer px-2 py-1 rounded transition ${
                pair.whiteIdx === currentMoveIndex
                  ? "bg-[#363431] text-amber-400 font-semibold border-l-2 border-amber-500"
                  : "text-gray-200 hover:bg-[#383531]"
              }`}
            >
              <span className="font-mono">{pair.white?.san}</span>
              {pair.white?.classification && (
                <ClassificationBadge type={pair.white.classification} />
              )}
            </div>

            {/* Black Move */}
            <div
              onClick={() => pair.blackIdx !== undefined && onSelectMove(pair.blackIdx)}
              className={`col-span-5 flex items-center justify-between cursor-pointer px-2 py-1 rounded transition ${
                pair.blackIdx === currentMoveIndex
                  ? "bg-[#363431] text-amber-400 font-semibold border-l-2 border-amber-500"
                  : "text-gray-200 hover:bg-[#383531]"
              }`}
            >
              <span className="font-mono">{pair.black?.san || ""}</span>
              {pair.black?.classification && (
                <ClassificationBadge type={pair.black.classification} />
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const ClassificationBadge: React.FC<{ type: MoveClassification }> = ({ type }) => {
  const configs: Record<MoveClassification, { label: string; color: string; bg: string }> = {
    brilliant: { label: "!!", color: "text-cyan-400", bg: "bg-cyan-950/60 border-cyan-500" },
    great: { label: "!", color: "text-blue-400", bg: "bg-blue-950/60 border-blue-500" },
    best: { label: "★", color: "text-emerald-400", bg: "bg-emerald-950/60 border-emerald-500" },
    excellent: { label: "✓", color: "text-emerald-300", bg: "bg-emerald-950/40 border-emerald-600" },
    good: { label: "✓", color: "text-gray-300", bg: "bg-gray-800 border-gray-600" },
    inaccuracy: { label: "?!", color: "text-yellow-400", bg: "bg-yellow-950/60 border-yellow-500" },
    mistake: { label: "?", color: "text-orange-400", bg: "bg-orange-950/60 border-orange-500" },
    blunder: { label: "??", color: "text-red-500", bg: "bg-red-950/60 border-red-600" },
    book: { label: "📖", color: "text-amber-300", bg: "bg-amber-950/60 border-amber-500" },
  };

  const cfg = configs[type] || configs.good;

  return (
    <span
      className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color}`}
      title={type.toUpperCase()}
    >
      {cfg.label}
    </span>
  );
};
