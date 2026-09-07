# Chess Analysis App - Stockfish 18 WASM

An interactive, high-performance Chess Game Analysis Web Application built with **Next.js 15**, **Stockfish 18 (WASM)**, **Chess.js**, **React Chessboard**, and **Tailwind CSS**. Designed following the layout and feel of Chess.com's Analysis Board.

![Chess Analysis App Preview](public/stockfish/preview-placeholder.png)

## 🌟 Key Features

- ♟️ **Interactive Chessboard**: Smooth drag-and-drop piece moves powered by `react-chessboard` & `chess.js`.
- ⚡ **Local Stockfish 18 WASM Engine**: Runs Stockfish directly inside an in-browser Web Worker. Zero backend latency, full privacy, and fast multi-threaded/single-threaded WASM analysis.
- 📊 **Dynamic Evaluation Bar**: Real-time evaluation meter (+ / - score in pawns / mate) with fluid visual transitions matching Chess.com.
- 🎯 **Best Engine Line (PV) & Arrows**: Live display of top principal variation lines and best-move arrow overlays on the board.
- 📝 **Move History Tree**: Step through games move-by-move with full keyboard arrow navigation (`←`, `→`, `↑`, `↓`).
- 📥 **PGN & FEN Importer**: Easily import full master PGNs or custom FEN position strings with instant master game presets (Kasparov, Carlsen).
- 🔍 **Full Game Review**: One-click game analysis and accuracy classification (Brilliant `!!`, Best `★`, Good `✓`, Inaccuracy `?!`, Mistake `?`, Blunder `??`).
- 🔄 **Flip Board & Reset**: Switch board perspective between White and Black anytime.

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router, React 19, TypeScript)
- **Engine**: Stockfish 18 WASM (`stockfish-18-lite-single`)
- **Chess Logic**: `chess.js`
- **UI & Styling**: Tailwind CSS, Lucide React Icons, Canvas Confetti
- **Deployment**: Vercel

## 🚀 Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Sudharshan1409/chess-analysis-app.git
   cd chess-analysis-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Build for production**:
   ```bash
   npm run build
   npm run start
   ```

## 📄 License

MIT License. Stockfish is licensed under GNU GPL v3.
