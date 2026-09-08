import { NextRequest, NextResponse } from "next/server";

const DEFAULT_USERNAME = "sudharshankv";
const USER_AGENT = "Friday-PersonalAI/1.0 (Contact: sudarshan61kv@gmail.com)";

export interface ChessComGameItem {
  gameId: string;
  gameUrl: string;
  opponent: string;
  userColor: "white" | "black";
  moveNumber: string;
  lastMove: string;
  status: string;
  inCheck: boolean;
  fen: string;
  pgn: string;
  moveBy?: number;
  timeControl?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = (searchParams.get("username") || DEFAULT_USERNAME).trim();

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/games`, {
      headers: {
        "User-Agent": USER_AGENT,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Chess.com API error (${res.status}): ${res.statusText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const rawGames: any[] = data.games || [];

    const parsedGames: ChessComGameItem[] = [];

    for (const g of rawGames) {
      const whiteUrl = g.white || "";
      const blackUrl = g.black || "";
      const whitePlayer = whiteUrl.split("/").pop() || "";
      const blackPlayer = blackUrl.split("/").pop() || "";
      const turn = g.turn; // "white" or "black"

      const isUserWhite = whitePlayer.toLowerCase() === username.toLowerCase();
      const isUserBlack = blackPlayer.toLowerCase() === username.toLowerCase();

      // Only games where it is currently the user's turn
      const isMyTurn = (turn === "white" && isUserWhite) || (turn === "black" && isUserBlack);
      if (!isMyTurn) continue;

      const userColor: "white" | "black" = isUserWhite ? "white" : "black";
      const opponent = isUserWhite ? blackPlayer : whitePlayer;
      const gameUrl = g.url || "";
      const gameId = gameUrl.split("/").pop() || "";
      const fen = g.fen || "";
      const pgn = g.pgn || "";

      // Extract moves from PGN
      const moveRegex = /(\d+)\.\s*([^\s]+)(?:\s+([^\s]+))?/g;
      const matches = Array.from(pgn.matchAll(moveRegex)) as RegExpMatchArray[];

      let moveNumber = "1";
      let lastMove = "";

      if (matches.length > 0) {
        const last = matches[matches.length - 1];
        moveNumber = last[1] || "1";
        if (isUserWhite) {
          // If user is white, opponent is black who played move in index 3 (or 2)
          lastMove = last[3] || last[2] || "";
        } else {
          // If user is black, opponent is white who played move in index 2
          lastMove = last[2] || "";
        }
      }

      const inCheck = lastMove.includes("+") || lastMove.includes("#");
      const status = inCheck ? "You are in check! 🚨" : "Your turn ⚡";

      parsedGames.push({
        gameId,
        gameUrl,
        opponent,
        userColor,
        moveNumber,
        lastMove,
        status,
        inCheck,
        fen,
        pgn,
        moveBy: g.move_by,
        timeControl: g.time_control,
      });
    }

    return NextResponse.json({
      username,
      totalActiveTurnGames: parsedGames.length,
      games: parsedGames,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch Chess.com games" },
      { status: 500 }
    );
  }
}
