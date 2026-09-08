"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ChessComGameItem } from "@/app/api/chess/daily-games/route";
import {
  Upload,
  RefreshCw,
  Search,
  ExternalLink,
  Clock,
  AlertTriangle,
  Play,
  X,
  User,
} from "lucide-react";

interface ChessComGamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGame: (game: ChessComGameItem) => void;
}

export const ChessComGamesModal: React.FC<ChessComGamesModalProps> = ({
  isOpen,
  onClose,
  onSelectGame,
}) => {
  const [username, setUsername] = useState("sudharshankv");
  const [inputUser, setInputUser] = useState("sudharshankv");
  const [games, setGames] = useState<ChessComGameItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "check" | "white" | "black">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchGames = useCallback(async (userToFetch: string) => {
    if (!userToFetch.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/chess/daily-games?username=${encodeURIComponent(userToFetch.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch games");
      }
      setGames(data.games || []);
    } catch (err: any) {
      setError(err.message || "Could not connect to Chess.com API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchGames(username);
    }
  }, [isOpen, username, fetchGames]);

  if (!isOpen) return null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUser.trim() && inputUser.trim() !== username) {
      setUsername(inputUser.trim());
    } else {
      fetchGames(username);
    }
  };

  const filteredGames = games.filter((g) => {
    if (filter === "check" && !g.inCheck) return false;
    if (filter === "white" && g.userColor !== "white") return false;
    if (filter === "black" && g.userColor !== "black") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        g.opponent.toLowerCase().includes(q) ||
        g.gameId.includes(q) ||
        g.lastMove.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const checkCount = games.filter((g) => g.inCheck).length;

  const formatMoveTime = (epochSeconds?: number) => {
    if (!epochSeconds) return null;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const diff = epochSeconds - nowSeconds;
    if (diff <= 0) return "Time expired";
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h left`;
    const mins = Math.floor((diff % 3600) / 60);
    return `${hours}h ${mins}m left`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#262421] border border-[#3c3934] rounded-xl max-w-3xl w-full h-[88vh] max-h-[750px] shadow-2xl text-gray-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#3c3934] flex items-center justify-between shrink-0 bg-[#1e1c18]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#2d2a26] border border-[#3c3934] flex items-center justify-center text-emerald-400 font-bold text-xl">
              ♟
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                Active Chess.com Games
                <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-600 text-xs px-2 py-0.5 rounded-full font-mono">
                  Your Turn ({games.length})
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Games waiting for your move on Chess.com
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#312e2b] transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Username input & Controls bar */}
        <div className="p-3 bg-[#1e1c18]/60 border-b border-[#3c3934] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-500">
                <User className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={inputUser}
                onChange={(e) => setInputUser(e.target.value)}
                placeholder="Chess.com username"
                className="w-full bg-[#181613] border border-[#3c3934] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 bg-[#312e2b] hover:bg-[#3d3a36] text-amber-300 rounded-lg text-xs font-bold border border-[#48443f] flex items-center gap-1.5 transition cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Fetch
            </button>
          </form>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-[#181613] p-1 rounded-lg border border-[#3c3934] text-xs font-semibold">
            <button
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded transition ${
                filter === "all" ? "bg-[#312e2b] text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              All ({games.length})
            </button>
            <button
              onClick={() => setFilter("check")}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                filter === "check"
                  ? "bg-red-900/60 text-red-300 border border-red-700/50"
                  : "text-gray-400 hover:text-red-400"
              }`}
            >
              🚨 In Check ({checkCount})
            </button>
            <button
              onClick={() => setFilter("white")}
              className={`px-2.5 py-1 rounded transition ${
                filter === "white" ? "bg-[#312e2b] text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              ⚪ White
            </button>
            <button
              onClick={() => setFilter("black")}
              className={`px-2.5 py-1 rounded transition ${
                filter === "black" ? "bg-[#312e2b] text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              ⬛ Black
            </button>
          </div>
        </div>

        {/* Search bar inside results */}
        <div className="px-3 py-2 bg-[#21201d] border-b border-[#312e2b] flex items-center gap-2 shrink-0">
          <Search className="w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search opponent username, move..."
            className="w-full bg-transparent text-xs text-gray-200 placeholder-gray-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-gray-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Games list content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#21201d]">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400 py-16">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-sm font-semibold">
                Fetching active games for <span className="text-white font-mono">{username}</span> from Chess.com...
              </p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-red-400 p-6 text-center">
              <AlertTriangle className="w-10 h-10 text-red-500" />
              <p className="text-sm font-semibold">{error}</p>
              <button
                onClick={() => fetchGames(username)}
                className="px-4 py-1.5 bg-[#312e2b] hover:bg-[#3d3a36] text-white text-xs font-bold rounded-lg border border-[#48443f] transition mt-2"
              >
                Try Again
              </button>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-400 py-16 text-center">
              <div className="text-3xl">☕</div>
              <p className="text-sm font-bold text-gray-300">
                {games.length === 0
                  ? `No active games waiting for your turn on ${username}.`
                  : "No games match the current filter."}
              </p>
              <p className="text-xs text-gray-500 max-w-sm">
                {games.length === 0
                  ? "All caught up! When opponents make a move, their games will show up here."
                  : "Try clearing search or filter."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredGames.map((game) => {
                const timeLeft = formatMoveTime(game.moveBy);
                return (
                  <div
                    key={game.gameId}
                    onClick={() => {
                      onSelectGame(game);
                      onClose();
                    }}
                    className={`bg-[#282622] hover:bg-[#312e2b] border rounded-xl p-3.5 transition cursor-pointer group flex flex-col justify-between gap-2.5 shadow-md ${
                      game.inCheck
                        ? "border-red-600/80 hover:border-red-500 bg-red-950/20"
                        : "border-[#383531] hover:border-emerald-500/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {/* Opponent & Color */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#1e1c18] border border-[#3c3934] flex items-center justify-center text-sm font-bold shadow">
                          👤
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-white group-hover:text-amber-300 transition">
                              vs {game.opponent}
                            </span>
                            <a
                              href={game.gameUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-500 hover:text-emerald-400 transition"
                              title="Open on Chess.com"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                            <span className="font-medium">
                              Playing as {game.userColor === "white" ? "White ⚪" : "Black ⬛"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Check badge or Turn badge */}
                      {game.inCheck ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-950 text-red-300 border border-red-600 animate-pulse shrink-0">
                          🚨 IN CHECK
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950/80 text-emerald-400 border border-emerald-600 shrink-0">
                          ⚡ YOUR TURN
                        </span>
                      )}
                    </div>

                    {/* Move info & Time */}
                    <div className="bg-[#1e1d1b] p-2 rounded-lg border border-[#312e2b] flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="text-gray-400">Move {game.moveNumber}:</span>{" "}
                        <span className="text-amber-400 font-bold">
                          {game.lastMove ? game.lastMove : "Starting Position"}
                        </span>
                      </div>
                      {timeLeft && (
                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>{timeLeft}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom action button */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#312e2b] text-xs">
                      <span className="text-[10px] text-gray-500 truncate max-w-[180px] font-mono">
                        FEN: {game.fen.slice(0, 22)}...
                      </span>
                      <button className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition group-hover:scale-102">
                        <Play className="w-3 h-3 fill-current" />
                        Analyze Position
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#1e1c18] border-t border-[#3c3934] flex items-center justify-between text-xs text-gray-400 shrink-0">
          <span>
            Clicking any game imports its position directly into Stockfish 18
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-gray-300 hover:text-white rounded-lg hover:bg-[#2d2a26] transition font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
