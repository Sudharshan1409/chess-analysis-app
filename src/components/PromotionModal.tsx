"use client";

import React from "react";

interface PromotionModalProps {
  isOpen: boolean;
  color: "w" | "b";
  onSelect: (piece: "q" | "r" | "b" | "n") => void;
  onClose: () => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  isOpen,
  color,
  onSelect,
  onClose,
}) => {
  if (!isOpen) return null;

  const pieces: { type: "q" | "r" | "b" | "n"; name: string }[] = [
    { type: "q", name: "Queen" },
    { type: "r", name: "Rook" },
    { type: "b", name: "Bishop" },
    { type: "n", name: "Knight" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#262421] border border-[#3c3934] rounded-xl p-4 shadow-2xl text-center max-w-xs w-full animate-in fade-in zoom-in-95 duration-150">
        <h3 className="text-sm font-bold text-white mb-3">Promote Pawn To:</h3>
        <div className="grid grid-cols-4 gap-2">
          {pieces.map((p) => {
            const pieceImgUrl = `https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${color}${p.type}.png`;
            return (
              <button
                key={p.type}
                onClick={() => onSelect(p.type)}
                className="bg-[#1e1c18] hover:bg-[#383531] border border-[#3c3934] hover:border-amber-400 p-2 rounded-lg transition transform hover:scale-105 flex flex-col items-center justify-center"
              >
                <img
                  src={pieceImgUrl}
                  alt={p.name}
                  className="w-12 h-12 object-contain pointer-events-none"
                />
              </button>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="mt-3 text-xs text-gray-400 hover:text-white transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
