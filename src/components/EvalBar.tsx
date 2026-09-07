"use client";

import React from "react";

interface EvalBarProps {
  score: number | null; // Centipawns from White's perspective
  mate: number | null;  // Mate in N from White's perspective
  orientation?: "white" | "black";
  isAnalyzing?: boolean;
}

export const EvalBar: React.FC<EvalBarProps> = ({
  score,
  mate,
  orientation = "white",
  isAnalyzing = false,
}) => {
  // Normalize score/mate so White winning is + and Black winning is -
  let evalText = "0.0";
  let whitePercent = 50;

  if (mate !== null) {
    if (mate > 0) {
      evalText = `M${mate}`;
      whitePercent = 100;
    } else if (mate < 0) {
      evalText = `M${Math.abs(mate)}`;
      whitePercent = 0;
    } else {
      evalText = "#0";
      whitePercent = 50;
    }
  } else if (score !== null) {
    const cp = score / 100;
    evalText = cp > 0 ? `+${cp.toFixed(1)}` : cp.toFixed(1);
    
    // Sigmoid curve formula for dynamic eval bar height (Chess.com style)
    // winning by 5+ pawns maxes out visually near ~95%
    const winningProb = 1 / (1 + Math.pow(10, -cp / 4));
    whitePercent = Math.min(Math.max(winningProb * 100, 3), 97);
  }

  // Display value calculation depending on board orientation
  const topText = orientation === "white" 
    ? (whitePercent < 50 ? evalText : "") 
    : (whitePercent >= 50 ? evalText : "");

  const bottomText = orientation === "white" 
    ? (whitePercent >= 50 ? evalText : "") 
    : (whitePercent < 50 ? evalText : "");

  return (
    <div className="relative w-8 h-full bg-[#262421] rounded-l-md overflow-hidden flex flex-col justify-between border-r border-[#312e2b] select-none font-semibold text-xs shadow-inner">
      {/* Top Section */}
      <div
        className="w-full transition-all duration-300 ease-out flex items-start justify-center pt-1 text-xs z-10"
        style={{
          height: orientation === "white" ? `${100 - whitePercent}%` : `${whitePercent}%`,
          backgroundColor: orientation === "white" ? "#262421" : "#ffffff",
          color: orientation === "white" ? "#989795" : "#262421",
        }}
      >
        <span>{topText}</span>
      </div>

      {/* Bottom Section */}
      <div
        className="w-full transition-all duration-300 ease-out flex items-end justify-center pb-1 text-xs z-10"
        style={{
          height: orientation === "white" ? `${whitePercent}%` : `${100 - whitePercent}%`,
          backgroundColor: orientation === "white" ? "#ffffff" : "#262421",
          color: orientation === "white" ? "#262421" : "#989795",
        }}
      >
        <span>{bottomText}</span>
      </div>

      {/* Pulsing indicator when evaluating */}
      {isAnalyzing && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500 animate-pulse" />
      )}
    </div>
  );
};
