import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  User,
  RefreshCw,
  Trophy,
  Clock,
  Undo,
  Brain,
  Sparkles,
  Zap,
  LogIn,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { AlphaBetaGomokuAI } from "./AlphaBetaAI.ts";
import AuthModal from "./components/AuthModal.tsx";
import authService, { User as AuthUser } from "./services/authService.ts";

// Types
type Player = "black" | "white" | null;
type GameStatus = "playing" | "won" | "draw";
type Difficulty = "easy" | "medium" | "hard";

interface Move {
  row: number;
  col: number;
  player: Player;
  timestamp: number;
}

interface GameState {
  board: Player[][];
  currentPlayer: Player;
  status: GameStatus;
  winner: Player;
  moveCount: number;
  moveHistory: Move[];
  lastMove: Move | null;
  winningLine: [number, number][] | null;
}

interface GameStats {
  wins: number;
  losses: number;
  draws: number;
}

interface User {
  username: string;
  stats: GameStats;
}

interface CellState {
  isAnimating: boolean;
  isNew: boolean;
  isUndoing: boolean;
  isHovered: boolean;
}

// AI instance will be created based on difficulty
let aiInstance: AlphaBetaGomokuAI | null = null;
let currentAIDifficulty: Difficulty | null = null;

// Main Game Component
const GomokuGame: React.FC = () => {
  // Game State
  const [gameState, setGameState] = useState<GameState>({
    board: Array(19)
      .fill(null)
      .map(() => Array(19).fill(null)),
    currentPlayer: "black",
    status: "playing",
    winner: null,
    moveCount: 0,
    moveHistory: [],
    lastMove: null,
    winningLine: null,
  });

  // UI State
  const [cellStates, setCellStates] = useState<CellState[][]>(
    Array(19)
      .fill(null)
      .map(() =>
        Array(19)
          .fill(null)
          .map(() => ({
            isAnimating: false,
            isNew: false,
            isUndoing: false,
            isHovered: false,
          }))
      )
  );

  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isDeepThinking, setIsDeepThinking] = useState(false);
  const [showVictoryAnimation, setShowVictoryAnimation] = useState(false);

  // Authentication State
  const [authUser, setAuthUser] = useState<AuthUser | null>(
    authService.getCurrentUser()
  );
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // User State (for guest play when not authenticated)
  const [guestStats, setGuestStats] = useState({
    wins: 0,
    losses: 0,
    draws: 0,
  });

  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const boardRef = useRef<HTMLDivElement>(null);
  const aiProcessingRef = useRef<boolean>(false);

  // Enhanced win check with line detection
  const checkWin = useCallback(
    (
      board: Player[][],
      row: number,
      col: number,
      player: Player
    ): { hasWin: boolean; line: [number, number][] | null } => {
      const directions = [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1],
      ];

      for (const [dx, dy] of directions) {
        let count = 1;
        const line: [number, number][] = [[row, col]];

        let r = row + dx,
          c = col + dy;
        while (r >= 0 && r < 19 && c >= 0 && c < 19 && board[r][c] === player) {
          count++;
          line.push([r, c]);
          r += dx;
          c += dy;
        }

        r = row - dx;
        c = col - dy;
        while (r >= 0 && r < 19 && c >= 0 && c < 19 && board[r][c] === player) {
          count++;
          line.unshift([r, c]);
          r -= dx;
          c -= dy;
        }

        if (count >= 5) return { hasWin: true, line };
      }

      return { hasWin: false, line: null };
    },
    []
  );

  // Animate cell state changes
  const animateCell = useCallback(
    (row: number, col: number, animationType: "place" | "undo") => {
      setCellStates((prev) => {
        const newStates = prev.map((r) => r.map((c) => ({ ...c })));
        if (animationType === "place") {
          newStates[row][col].isAnimating = true;
          newStates[row][col].isNew = true;
        } else {
          newStates[row][col].isUndoing = true;
        }
        return newStates;
      });

      setTimeout(
        () => {
          setCellStates((prev) => {
            const newStates = prev.map((r) => r.map((c) => ({ ...c })));
            newStates[row][col].isAnimating = false;
            newStates[row][col].isNew = false;
            newStates[row][col].isUndoing = false;
            return newStates;
          });
        },
        animationType === "place" ? 600 : 400
      );
    },
    []
  );

  // Handle player move (black stones only)
  const makeMove = useCallback(
    (row: number, col: number) => {
      // Block moves if cell occupied, game not playing, or AI is thinking
      if (
        gameState.board[row][col] !== null ||
        gameState.status !== "playing" ||
        isThinking ||
        gameState.currentPlayer !== "black"
      ) {
        return;
      }

      const newBoard = gameState.board.map((r) => [...r]);
      newBoard[row][col] = gameState.currentPlayer;

      const winCheck = checkWin(newBoard, row, col, gameState.currentPlayer);
      const isBoardFull = newBoard.every((row) =>
        row.every((cell) => cell !== null)
      );

      const move: Move = {
        row,
        col,
        player: gameState.currentPlayer,
        timestamp: Date.now(),
      };

      // Animate the stone placement
      animateCell(row, col, "place");

      setGameState((prev) => ({
        ...prev,
        board: newBoard,
        currentPlayer:
          winCheck.hasWin || isBoardFull
            ? prev.currentPlayer
            : prev.currentPlayer === "black"
            ? "white"
            : "black",
        status: winCheck.hasWin ? "won" : isBoardFull ? "draw" : "playing",
        winner: winCheck.hasWin ? prev.currentPlayer : null,
        moveCount: prev.moveCount + 1,
        moveHistory: [...prev.moveHistory, move],
        lastMove: move,
        winningLine: winCheck.line,
      }));

      // Show victory animation
      if (winCheck.hasWin) {
        setShowVictoryAnimation(true);
        setTimeout(() => setShowVictoryAnimation(false), 3000);
      }

      // Update stats if game ended
      if (winCheck.hasWin) {
        if (authUser) {
          // TODO: Send to API to update user stats
          authService.refreshUserData();
        } else {
          setGuestStats((prev) => ({
            ...prev,
            [gameState.currentPlayer === "black" ? "wins" : "losses"]:
              prev[gameState.currentPlayer === "black" ? "wins" : "losses"] + 1,
          }));
        }
      } else if (isBoardFull) {
        if (authUser) {
          // TODO: Send to API to update user stats
          authService.refreshUserData();
        } else {
          setGuestStats((prev) => ({ ...prev, draws: prev.draws + 1 }));
        }
      }
    },
    [gameState, checkWin, isThinking, animateCell]
  );

  // Undo last move
  const undoLastMove = useCallback(() => {
    if (
      gameState.moveHistory.length === 0 ||
      gameState.status !== "playing" ||
      isThinking
    ) {
      return;
    }

    const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
    const secondLastMove =
      gameState.moveHistory[gameState.moveHistory.length - 2];

    // Only allow undo if it's player's turn (black)
    if (lastMove.player === "white") {
      // Undo both AI move and player move
      const newBoard = gameState.board.map((r) => [...r]);
      newBoard[lastMove.row][lastMove.col] = null;

      // Animate undo
      animateCell(lastMove.row, lastMove.col, "undo");

      if (secondLastMove) {
        newBoard[secondLastMove.row][secondLastMove.col] = null;
        animateCell(secondLastMove.row, secondLastMove.col, "undo");
      }

      setTimeout(() => {
        setGameState((prev) => ({
          ...prev,
          board: newBoard,
          currentPlayer: "black",
          status: "playing",
          winner: null,
          moveCount: Math.max(0, prev.moveCount - (secondLastMove ? 2 : 1)),
          moveHistory: prev.moveHistory.slice(0, secondLastMove ? -2 : -1),
          lastMove:
            gameState.moveHistory[
              gameState.moveHistory.length - (secondLastMove ? 3 : 2)
            ] || null,
          winningLine: null,
        }));
      }, 200);
    }
  }, [gameState, isThinking, animateCell]);

  // AI Move Effect
  useEffect(() => {
    if (
      gameState.currentPlayer === "white" &&
      gameState.status === "playing" &&
      !aiProcessingRef.current
    ) {
      aiProcessingRef.current = true;
      setIsThinking(true);

      // Set deep thinking mode for hard difficulty
      if (difficulty === "hard") {
        setIsDeepThinking(true);
      }

      // Use a minimal delay to allow UI to update, then make move immediately
      const timer = setTimeout(() => {
        // Create or update AI instance when difficulty changes
        if (!aiInstance || currentAIDifficulty !== difficulty) {
          aiInstance = new AlphaBetaGomokuAI(difficulty, "white");
          currentAIDifficulty = difficulty;
        }

        const move = aiInstance.findBestMove(gameState.board);

        if (move) {
          // Make AI move directly by updating state
          const newBoard = gameState.board.map((r) => [...r]);
          newBoard[move[0]][move[1]] = "white";

          const winCheck = checkWin(newBoard, move[0], move[1], "white");
          const isBoardFull = newBoard.every((row) =>
            row.every((cell) => cell !== null)
          );

          const aiMove = {
            row: move[0],
            col: move[1],
            player: "white" as Player,
            timestamp: Date.now(),
          };

          // Animate the stone placement
          animateCell(move[0], move[1], "place");

          setGameState((prev) => ({
            ...prev,
            board: newBoard,
            currentPlayer: winCheck.hasWin || isBoardFull ? "white" : "black",
            status: winCheck.hasWin ? "won" : isBoardFull ? "draw" : "playing",
            winner: winCheck.hasWin ? "white" : null,
            moveCount: prev.moveCount + 1,
            moveHistory: [...prev.moveHistory, aiMove],
            lastMove: aiMove,
            winningLine: winCheck.line,
          }));

          // Show victory animation
          if (winCheck.hasWin) {
            setShowVictoryAnimation(true);
            setTimeout(() => setShowVictoryAnimation(false), 3000);

            // Update stats
            if (authUser) {
              // TODO: Send to API to update user stats
              authService.refreshUserData();
            } else {
              setGuestStats((prev) => ({
                ...prev,
                losses: prev.losses + 1,
              }));
            }
          } else if (isBoardFull) {
            if (authUser) {
              // TODO: Send to API to update user stats
              authService.refreshUserData();
            } else {
              setGuestStats((prev) => ({ ...prev, draws: prev.draws + 1 }));
            }
          }
        }

        aiProcessingRef.current = false;
        setIsThinking(false);
        setIsDeepThinking(false);
      }, 50); // Minimal delay just for UI responsiveness

      return () => {
        clearTimeout(timer);
        aiProcessingRef.current = false;
        setIsDeepThinking(false);
      };
    }
  }, [
    gameState.currentPlayer,
    gameState.status,
    gameState.board,
    difficulty,
    checkWin,
    animateCell,
  ]); // Removed isThinking dependency

  // Reset game
  const resetGame = useCallback(() => {
    setGameState({
      board: Array(19)
        .fill(null)
        .map(() => Array(19).fill(null)),
      currentPlayer: "black",
      status: "playing",
      winner: null,
      moveCount: 0,
      moveHistory: [],
      lastMove: null,
      winningLine: null,
    });
    setCellStates(
      Array(19)
        .fill(null)
        .map(() =>
          Array(19)
            .fill(null)
            .map(() => ({
              isAnimating: false,
              isNew: false,
              isUndoing: false,
              isHovered: false,
            }))
        )
    );
    setShowVictoryAnimation(false);
    setIsDeepThinking(false);
    aiProcessingRef.current = false;
    // Reset AI instance
    aiInstance = null;
    currentAIDifficulty = null;
  }, []);

  // Handle cell hover
  const handleCellHover = useCallback(
    (row: number, col: number, isHovering: boolean) => {
      if (
        gameState.board[row][col] !== null ||
        gameState.status !== "playing" ||
        isThinking
      ) {
        return;
      }

      setHoveredCell(isHovering ? [row, col] : null);
      setCellStates((prev) => {
        const newStates = prev.map((r) => r.map((c) => ({ ...c })));
        newStates[row][col].isHovered = isHovering;
        return newStates;
      });
    },
    [gameState.board, gameState.status, isThinking]
  );

  // Render cell
  const renderCell = (row: number, col: number) => {
    const cell = gameState.board[row][col];
    const cellState = cellStates[row][col];
    const isLastMove =
      gameState.lastMove?.row === row && gameState.lastMove?.col === col;
    const isWinningCell = gameState.winningLine?.some(
      ([r, c]) => r === row && c === col
    );
    const isHovered = hoveredCell?.[0] === row && hoveredCell?.[1] === col;

    return (
      <div
        key={`${row}-${col}`}
        className={`board-cell group relative transition-all duration-200 ${
          isWinningCell ? "animate-pulse-soft" : ""
        } ${isHovered ? "scale-110 z-20" : "z-10"}`}
        onClick={() => makeMove(row, col)}
        onMouseEnter={() => handleCellHover(row, col, true)}
        onMouseLeave={() => handleCellHover(row, col, false)}
      >
        {/* Cell highlight for last move */}
        {isLastMove && (
          <div className="absolute inset-0 bg-primary-200/40 rounded-full animate-pulse-soft" />
        )}

        {/* Winning line highlight */}
        {isWinningCell && (
          <div className="absolute inset-0 bg-yellow-300/60 rounded-full animate-board-glow" />
        )}

        {/* Stone or preview */}
        {cell ? (
          <div
            className={`stone ${
              cell === "black" ? "stone-black" : "stone-white"
            } ${cellState.isNew ? "animate-stone-place" : ""} ${
              cellState.isUndoing ? "animate-undo" : ""
            } ${isLastMove ? "ring-2 ring-primary-400 ring-opacity-60" : ""}`}
          />
        ) : isHovered &&
          gameState.currentPlayer === "black" &&
          gameState.status === "playing" &&
          !isThinking ? (
          <div className="stone stone-black stone-preview animate-stone-hover" />
        ) : null}

        {/* Hover effect overlay */}
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full" />
      </div>
    );
  };

  const getDifficultyColor = (level: Difficulty) => {
    switch (level) {
      case "easy":
        return "text-green-600";
      case "medium":
        return "text-yellow-600";
      case "hard":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getDifficultyIcon = (level: Difficulty) => {
    switch (level) {
      case "easy":
        return <Sparkles className="w-4 h-4 text-green-500" />;
      case "medium":
        return <Brain className="w-4 h-4 text-yellow-500" />;
      case "hard":
        return <Zap className="w-4 h-4 text-red-500" />;
    }
  };

  const getDifficultyDescription = (level: Difficulty) => {
    switch (level) {
      case "easy":
        return "1 move ahead with alpha-beta pruning";
      case "medium":
        return "Up to 4 moves ahead for strategic play";
      case "hard":
        return "Advanced search with iterative deepening (up to 5 moves)";
    }
  };

  // Authentication handlers
  const handleAuthSuccess = (user: AuthUser) => {
    setAuthUser(user);
    setIsAuthModalOpen(false);
  };

  const handleLogout = async () => {
    await authService.logout();
    setAuthUser(null);
    setShowUserMenu(false);
  };

  const handleLoginClick = () => {
    setIsAuthModalOpen(true);
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserMenu) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      {/* Victory Animation Overlay */}
      {showVictoryAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="glass-card p-8 text-center animate-fade-in-up">
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-bounce" />
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              {gameState.winner === "black" ? "🎉 Victory!" : "🤖 AI Wins!"}
            </h2>
            <p className="text-gray-600">
              {gameState.winner === "black"
                ? "Congratulations on your win!"
                : "Better luck next time!"}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass-card p-6 mb-6 animate-fade-in-up">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4 animate-slide-in-left">
              <div className="p-3 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl text-white">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                  Gomoku
                </h1>
                <p className="text-gray-600">
                  Welcome, {authUser ? authUser.username : "Guest"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-8 animate-slide-in-right">
              {/* Authentication Section */}
              {authUser ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  >
                    {authUser.avatar_url ? (
                      <img
                        src={authUser.avatar_url}
                        alt={authUser.name}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {authUser.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-800">
                        {authUser.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        Rating: {authUser.rating}
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>

                  {/* User Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 glass-card p-2 shadow-lg z-50">
                      <div className="py-2 px-3 border-b border-gray-200 mb-2">
                        <div className="text-sm font-medium text-gray-800">
                          {authUser.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          @{authUser.username}
                        </div>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleLoginClick}
                  className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}
              <div className="text-center group hover:scale-105 transition-transform duration-200">
                <div className="text-3xl font-bold text-green-600 group-hover:text-green-700">
                  {authUser ? authUser.games_won : guestStats.wins}
                </div>
                <div className="text-sm text-gray-600">Wins</div>
              </div>
              <div className="text-center group hover:scale-105 transition-transform duration-200">
                <div className="text-3xl font-bold text-red-600 group-hover:text-red-700">
                  {authUser ? authUser.games_lost : guestStats.losses}
                </div>
                <div className="text-sm text-gray-600">Losses</div>
              </div>
              <div className="text-center group hover:scale-105 transition-transform duration-200">
                <div className="text-3xl font-bold text-gray-600 group-hover:text-gray-700">
                  {authUser ? authUser.games_drawn : guestStats.draws}
                </div>
                <div className="text-sm text-gray-600">Draws</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Game Board */}
          <div className="glass-card p-6 flex-1 animate-fade-in-up animate-delayed-1">
            {/* Game Controls */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-2 rounded-xl">
                  <div className="w-5 h-5 bg-gradient-to-br from-gray-800 to-black rounded-full shadow-stone"></div>
                  <span className="text-sm font-medium text-gray-700">You</span>
                </div>
                <span className="text-gray-400 font-medium">vs</span>
                <div className="flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-2 rounded-xl">
                  <div className="w-5 h-5 bg-gradient-to-br from-white to-gray-100 border-2 border-gray-300 rounded-full shadow-stone-white"></div>
                  <span className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <span>AI</span>
                    {getDifficultyIcon(difficulty)}
                    <span
                      className={`${getDifficultyColor(difficulty)} capitalize`}
                    >
                      ({difficulty})
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={undoLastMove}
                  disabled={
                    gameState.moveHistory.length === 0 ||
                    gameState.status !== "playing" ||
                    isThinking
                  }
                  className="button-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Undo className="w-4 h-4" />
                  <span>Undo</span>
                </button>

                <button
                  onClick={resetGame}
                  className="button-primary flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>New Game</span>
                </button>
              </div>
            </div>

            {/* Game Status */}
            <div className="mb-6">
              {gameState.status === "playing" && (
                <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div
                    className={`w-4 h-4 rounded-full ${
                      gameState.currentPlayer === "black"
                        ? "bg-gradient-to-br from-gray-800 to-black shadow-stone"
                        : "bg-gradient-to-br from-white to-gray-100 border border-gray-300 shadow-stone-white"
                    }`}
                  ></div>
                  <span className="text-lg font-medium text-gray-800">
                    {gameState.currentPlayer === "black"
                      ? "Your turn"
                      : isDeepThinking
                      ? "🧠 AI analyzing deeply..."
                      : "AI is thinking..."}
                  </span>
                  {isThinking && (
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 animate-thinking text-primary-600" />
                      {isDeepThinking && (
                        <span className="text-sm text-yellow-600 font-medium animate-pulse">
                          Hard Mode
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {gameState.status === "won" && (
                <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <Trophy className="w-8 h-8 text-yellow-500 animate-bounce" />
                  <span className="text-xl font-bold text-green-700">
                    {gameState.winner === "black"
                      ? "🎉 You won!"
                      : "🤖 AI won!"}
                  </span>
                </div>
              )}

              {gameState.status === "draw" && (
                <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                  <span className="text-xl font-bold text-gray-600">
                    🤝 Game Draw!
                  </span>
                </div>
              )}
            </div>

            {/* Board */}
            <div className="flex justify-center">
              <div className="p-6 bg-gradient-to-br from-board-light via-board-medium to-board-light rounded-2xl shadow-board">
                <div
                  ref={boardRef}
                  className="border-4 border-board-dark rounded-lg inline-grid gap-0 bg-gradient-to-br from-board-light to-board-medium shadow-inner"
                  style={{
                    gridTemplateColumns: "repeat(19, minmax(0, 1fr))",
                    gridTemplateRows: "repeat(19, minmax(0, 1fr))",
                  }}
                >
                  {gameState.board.map((row, rowIndex) =>
                    row.map((_, colIndex) => renderCell(rowIndex, colIndex))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 space-y-6">
            {/* Difficulty Settings */}
            <div className="glass-card p-6 animate-fade-in-up animate-delayed-2">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center space-x-2">
                <Brain className="w-5 h-5 text-primary-600" />
                <span>AI Difficulty</span>
              </h3>
              <div className="space-y-3">
                {(["easy", "medium", "hard"] as Difficulty[]).map((level) => (
                  <label
                    key={level}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors duration-200 group"
                    title={getDifficultyDescription(level)}
                  >
                    <input
                      type="radio"
                      name="difficulty"
                      value={level}
                      checked={difficulty === level}
                      onChange={(e) =>
                        setDifficulty(e.target.value as Difficulty)
                      }
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex items-center space-x-2">
                      {getDifficultyIcon(level)}
                      <span
                        className={`capitalize font-medium ${getDifficultyColor(
                          level
                        )} group-hover:scale-105 transition-transform duration-200`}
                      >
                        {level}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Game Info */}
            <div className="glass-card p-6 animate-fade-in-up animate-delayed-3">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-primary-600" />
                <span>Game Stats</span>
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Moves:</span>
                  <span className="font-semibold text-gray-800">
                    {gameState.moveCount}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Board:</span>
                  <span className="font-semibold text-gray-800">19×19</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Win condition:</span>
                  <span className="font-semibold text-gray-800">
                    5 in a row
                  </span>
                </div>
              </div>
            </div>

            {/* AI Difficulty Info */}
            <div className="glass-card p-6 animate-fade-in-up animate-delayed-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center space-x-2">
                <Zap className="w-5 h-5 text-primary-600" />
                <span>AI Levels</span>
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <Sparkles className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-600">Easy</p>
                    <p>Looks 1 move ahead for quick, casual play</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Brain className="w-4 h-4 text-yellow-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-yellow-600">Medium</p>
                    <p>Analyzes up to 4 moves ahead for strategic gameplay</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Zap className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-600">Hard</p>
                    <p>
                      Advanced iterative deepening search (up to 3 seconds
                      thinking time)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rules */}
            <div className="glass-card p-6 animate-fade-in-up animate-delayed-5">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">
                How to Play
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Click on empty squares to place your stone</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Get 5 stones in a row to win</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Rows can be horizontal, vertical, or diagonal</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Black stones (you) move first</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Use undo to take back your last move</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default GomokuGame;
