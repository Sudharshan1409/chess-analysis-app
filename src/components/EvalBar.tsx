"use client";

import React from "react";

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
  let absoluteScore = score;
  let absoluteMate = mate;

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
    <div className="relative w-5 sm:w-6 h-full bg-[#262421] overflow-hidden flex flex-col justify-between border-r border-[#312e2b] select-none font-bold text-[10px]">
      {/* Top Section */}
      <div
        className="w-full transition-all duration-300 ease-out flex items-start justify-center pt-1"
        style={{
          height: `${topPercent}%`,
          backgroundColor: topIsWhite ? "#ffffff" : "#262421",
          color: topIsWhite ? "#262421" : "#989795",
        }}
      >
        <span>{topPercent > 10 ? evalText : ""}</span>
      </div>

      {/* Bottom Section */}
      <div
        className="w-full transition-all duration-300 ease-out flex items-end justify-center pb-1"
        style={{
          height: `${bottomPercent}%`,
          backgroundColor: topIsWhite ? "#262421" : "#ffffff",
          color: topIsWhite ? "#989795" : "#262421",
        }}
      >
        <span>{bottomPercent > 10 ? evalText : ""}</span>
      </div>

      {isAnalyzing && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500 animate-pulse" />
      )}
    </div>
  );
};
