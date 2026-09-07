# Stockfish 18 Chess Analysis Web Application

A modern, high-performance, client-side Chess Analysis Web Application inspired by **Chess.com**'s Analysis Board interface. Built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Stockfish 18 (WASM)**.

![Chess Analysis App Preview](public/stockfish/stockfish-18-lite-single.wasm)

## 🌟 Features & Highlights

- ♟️ **Built-in Stockfish 18 WASM Engine**: Stockfish 18 compiled to WebAssembly is **included directly inside the repository** (`/public/stockfish/`). Zero external dependencies or manual engine installations required!
- ⚡ **MultiPV Engine Lines**: Real-time evaluation displaying the top 3 best moves and principal variation (PV) lines simultaneously.
- 🎯 **Best Move Suggestion Arrows**: Live cyan SVG arrow overlays indicating the engine's recommended best move directly on the board.
- ⚠️ **Threat Arrows**: Red warning arrows highlighting immediate opponent captures and tactical threats.
- 📊 **Dual Evaluation Bars**: Smooth 500ms animated vertical evaluation bar for Desktop and horizontal evaluation bar for Mobile.
- 🔊 **Chess.com Audio Feedback**: Custom webm audio effects for moves, captures, checks, castling, promotions, and invalid move attempts.
- 👑 **Pawn Promotion Modal**: Select from Queen, Rook, Bishop, or Knight when pawns reach the back rank.
- ⚙️ **Assistance Settings**: Custom settings modal (gear icon ⚙️) to toggle Evaluation Bar, Suggestion Arrows, Threat Arrows, Engine Lines, and Sound Effects on or off.
- 📥 **PGN & FEN Importer**: Import master game PGNs or custom FEN position strings with built-in Kasparov and Carlsen presets.
- 📱 **100% Mobile & Desktop Responsive**: Tailored layouts for mobile touch devices and widescreen desktop monitors matching Chess.com.

---

## 🛠️ Engine Architecture (No Installation Required)

The Stockfish 18 WASM binaries (`stockfish-18-lite-single.js` and `stockfish-18-lite-single.wasm`) are pre-compiled and tracked directly inside the `/public/stockfish/` directory.

When you run or deploy the application:
1. The app initializes a WebWorker from `/public/stockfish/stockfish-18-lite-single.js`.
2. Stockfish runs 100% locally inside the user's browser off the main UI thread.
3. No backend server, C++ compilation, or external Stockfish binary installation is needed!

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm, pnpm, or yarn

### Installation & Local Run

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

---

## 📄 License

MIT License. Stockfish is open-source software licensed under GNU GPL v3.
