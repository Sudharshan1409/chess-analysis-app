"use client";

import React, { useState, useEffect } from "react";

interface HorizontalEvalBarProps {
  score: number | null;
  mate: number | null;
  turn?: "w" | "b";
  orientation?: "white" | "black";
  isAnalyzing?: boolean;
}

export const HorizontalEvalBar: React.FC<HorizontalEvalBarProps> = ({
  score,
  mate,
  turn = "w",
  orientation = "white",
  isAnalyzing = false,
}) => {
  const [cachedScore, setCachedScore] = useState<number | null>(0);
  const [cachedMate, setCachedMate] = useState<number | null>(null);

  useEffect(() => {
    if (score !== null) setCachedScore(score);
    if (mate !== null) setCachedMate(mate);
  }, [score, mate]);

  const currentScore = score ?? cachedScore;
  const currentMate = mate ?? cachedMate;

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

  const leftIsWhite = orientation === "white";
  const leftPercent = leftIsWhite ? whitePercent : 100 - whitePercent;
  const rightPercent = 100 - leftPercent;

  return (
    <div className="w-full h-5 bg-[#1a1815] rounded overflow-hidden flex border border-[#312e2b] select-none font-bold text-xs my-1 shadow-inner relative">
      {/* Left Section */}
      <div
        className="h-full transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-center justify-start pl-2 font-extrabold"
        style={{
          width: `${leftPercent}%`,
          backgroundColor: leftIsWhite ? "#ffffff" : "#262421",
          color: leftIsWhite ? "#262421" : "#989795",
        }}
      >
        <span>{leftPercent > 12 ? evalText : ""}</span>
      </div>

      {/* Right Section */}
      <div
        className="h-full transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-center justify-end pr-2 font-extrabold"
        style={{
          width: `${rightPercent}%`,
          backgroundColor: leftIsWhite ? "#262421" : "#ffffff",
          color: leftIsWhite ? "#989795" : "#262421",
        }}
      >
        <span>{rightPercent > 12 ? evalText : ""}</span>
      </div>

      {isAnalyzing && (
        <div className="absolute inset-y-0 right-0 w-1 bg-emerald-500 animate-pulse" />
      )}
    </div>
  );
};
