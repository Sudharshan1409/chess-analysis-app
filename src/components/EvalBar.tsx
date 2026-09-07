"use client";

import React, { useRef } from "react";

interface EvalBarProps {
  score: number | null; // Centipawns relative to side to move
  mate: number | null;  // Mate in N
  turn?: "w" | "b";
  orientation?: "white" | "black";
  isAnalyzing?: boolean;
}

export const EvalBar: React.FC<EvalBarProps> = ({
  score,
  mate,
  turn = "w",
  orientation = "white",
  isAnalyzing = false,
}) => {
  const lastScoreRef = useRef<number | null>(0);
  const lastMateRef = useRef<number | null>(null);

  if (score !== null) lastScoreRef.current = score;
  if (mate !== null) lastMateRef.current = mate;

  const currentScore = score ?? lastScoreRef.current;
  const currentMate = mate ?? lastMateRef.current;

  let absoluteScore = currentScore;
  let absoluteMate = currentMate;

  if (turn === "b") {
    if (absoluteScore !== null) absoluteScore = -absoluteScore;
    if (absoluteMate !== null) absoluteMate = -absoluteMate;
  }

  let evalText = "0.0";
  let whitePercent = 50;

  if (absoluteMate !== null) {
    if (absoluteMate > 0) {
      evalText = `M${absoluteMate}`;
      whitePercent = 100;
    } else if (absoluteMate < 0) {
      evalText = `M${Math.abs(absoluteMate)}`;
      whitePercent = 0;
    } else {
      evalText = "M0";
      whitePercent = 50;
    }
  } else if (absoluteScore !== null) {
    const cp = absoluteScore / 100;
    evalText = cp > 0 ? `+${cp.toFixed(1)}` : cp.toFixed(1);

    const winningProb = 1 / (1 + Math.pow(10, -cp / 4));
    whitePercent = Math.min(Math.max(winningProb * 100, 2), 98);
  }

  const topIsWhite = orientation === "black";
  const topPercent = topIsWhite ? whitePercent : 100 - whitePercent;
  const bottomPercent = 100 - topPercent;

  return (
    <div className="relative w-4 h-full bg-[#262421] overflow-hidden flex flex-col justify-between border-r border-[#312e2b] select-none font-bold text-[9px] shrink-0 z-10">
      {/* Top Section */}
      <div
        className="w-full transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-start justify-center pt-1"
        style={{
          height: `${topPercent}%`,
          backgroundColor: topIsWhite ? "#3c3934" : "#1a1815",
          color: topIsWhite ? "#ffffff" : "#807d78",
        }}
      >
        <span>{topPercent > 12 ? evalText : ""}</span>
      </div>

      {/* Bottom Section */}
      <div
        className="w-full transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-end justify-center pb-1"
        style={{
          height: `${bottomPercent}%`,
          backgroundColor: topIsWhite ? "#1a1815" : "#3c3934",
          color: topIsWhite ? "#807d78" : "#ffffff",
        }}
      >
        <span>{bottomPercent > 12 ? evalText : ""}</span>
      </div>

      {isAnalyzing && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500 animate-pulse" />
      )}
    </div>
  );
};
