"use client";

import React, { useState } from "react";
import { Upload, Clipboard, Play, RefreshCw, Layers } from "lucide-react";

interface PgnFenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadPgn: (pgn: string) => void;
  onLoadFen: (fen: string) => void;
}

export const PgnFenModal: React.FC<PgnFenModalProps> = ({
  isOpen,
  onClose,
  onLoadPgn,
  onLoadFen,
}) => {
  const [textInput, setTextInput] = useState("");
  const [mode, setMode] = useState<"pgn" | "fen">("pgn");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImport = () => {
    setError(null);
    if (!textInput.trim()) {
      setError("Please paste a valid PGN or FEN string.");
      return;
    }

    try {
      if (mode === "pgn") {
        onLoadPgn(textInput.trim());
      } else {
        onLoadFen(textInput.trim());
      }
      setTextInput("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load chess notation.");
    }
  };

  const sampleGames = [
    {
      title: "Kasparov vs Deep Blue (1996)",
      pgn: `[Event "Philadelphia"]
[Site "Philadelphia, PA USA"]
[Date "1996.02.10"]
[Round "1"]
[White "Deep Blue"]
[Black "Garry Kasparov"]
[Result "1-0"]

1. e4 c5 2. c3 d5 3. exd5 Qxd5 4. d4 Nf6 5. Nf3 Bg4 6. Be2 e6 7. h3 Bh5 8. O-O Nc6 9. Be3 cxd4 10. cxd4 Bb4 11. a3 Ba5 12. Nc3 Qd6 13. Nb5 Qe7 14. Ne5 Bxe2 15. Qxe2 O-O 16. Rac1 Rac8 17. Bg5 Bb6 18. Bxf6 gxf6 19. Nc4 Rfd8 20. Nxb6 axb6 21. Rfd1 f5 22. Qe3 Qf6 23. d5 Rxd5 24. Rxd5 exd5 25. b3 Kh8 26. Qxb6 Rg8 27. Qc5 d4 28. Nd6 f4 29. Nxb7 Ne5 30. Qd5 f3 31. g3 Nd3 32. Rc7 Re8 33. Nd6 Re1+ 34. Kh2 Nxf2 35. Nxf7+ Kg7 36. Ng5+ Kh6 37. Rxh7+ 1-0`,
    },
    {
      title: "Magnus Carlsen vs Hikaru Nakamura (2020)",
      pgn: `[Event "Magnus Carlsen Invitational"]
[Site "chess24.com INT"]
[Date "2020.04.18"]
[White "Magnus Carlsen"]
[Black "Hikaru Nakamura"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. Nbd2 Bb7 12. Bc2 Re8 13. Nf1 Bf8 14. Ng3 g6 15. a4 c5 16. d5 c4 17. Bg5 h6 18. Be3 Nc5 19. Qd2 h5 20. Bg5 Be7 21. Nh4 Nh7 22. Bxe7 Qxe7 1-0`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#262421] border border-[#3c3934] rounded-xl max-w-xl w-full p-6 shadow-2xl text-gray-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-[#3c3934]">
          <h3 className="text-lg font-bold flex items-center gap-2 text-white">
            <Upload className="w-5 h-5 text-amber-500" />
            Import Game / Position
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl font-bold p-1 rounded hover:bg-[#312e2b]"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 my-4 bg-[#1e1d1b] p-1 rounded-lg">
          <button
            onClick={() => setMode("pgn")}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${
              mode === "pgn"
                ? "bg-[#363431] text-amber-400 shadow"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            PGN (Full Game)
          </button>
          <button
            onClick={() => setMode("fen")}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${
              mode === "fen"
                ? "bg-[#363431] text-amber-400 shadow"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            FEN (Position)
          </button>
        </div>

        {/* Text Input */}
        <div className="space-y-2">
          <label className="text-xs text-gray-400 font-medium flex justify-between">
            <span>{mode === "pgn" ? "Paste PGN String:" : "Paste FEN String:"}</span>
            <button
              onClick={async () => {
                const text = await navigator.clipboard.readText();
                setTextInput(text);
              }}
              className="text-amber-500 hover:underline flex items-center gap-1 text-xs"
            >
              <Clipboard className="w-3 h-3" /> Paste from Clipboard
            </button>
          </label>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={
              mode === "pgn"
                ? "1. e4 e5 2. Nf3 Nc6 3. Bb5..."
                : "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
            }
            rows={6}
            className="w-full bg-[#1e1d1b] border border-[#3c3934] rounded-lg p-3 text-sm font-mono text-gray-100 focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>

        {error && <div className="mt-2 text-xs text-red-400 font-semibold">{error}</div>}

        {/* Preset Samples */}
        {mode === "pgn" && (
          <div className="mt-4">
            <span className="text-xs text-gray-400 block mb-2 font-medium">
              Or try a sample master game:
            </span>
            <div className="flex flex-wrap gap-2">
              {sampleGames.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => setTextInput(sample.pgn)}
                  className="text-xs bg-[#312e2b] hover:bg-[#3d3a36] text-amber-300 px-2.5 py-1.5 rounded border border-[#48443f] transition"
                >
                  {sample.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#3c3934]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            className="px-5 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-lg flex items-center gap-2 transition"
          >
            <Play className="w-4 h-4 fill-current" />
            Load & Analyze
          </button>
        </div>
      </div>
    </div>
  );
};
