// React and UI imports
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  User,        // Profile icon
  RefreshCw,   // Reset/restart icon  
  Trophy,      // Victory icon
  Clock,       // Timer/thinking icon
  Undo,        // Undo move icon
  Brain,       // Medium AI difficulty icon
  Sparkles,    // Easy AI difficulty icon
  Zap,         // Hard AI difficulty icon
  LogIn,       // Login button icon
  LogOut,      // Logout button icon
  ChevronDown, // Dropdown menu icon
} from "lucide-react";

// Game logic and services
import { AlphaBetaGomokuAI } from "./AlphaBetaAI.ts";
import AuthModal from "./components/AuthModal.tsx";
import authService, { User as AuthUser } from "./services/authService.ts";

// ==================== TYPE DEFINITIONS ====================

/**
 * Represents a player or empty cell state
 * - "black": Human player (goes first in Gomoku)
 * - "white": AI player (goes second)
 * - null: Empty cell
 */
type Player = "black" | "white" | null;

/**
 * Current state of the game
 * - "playing": Game in progress
 * - "won": Someone achieved 5 in a row
 * - "draw": Board full with no winner
 */
type GameStatus = "playing" | "won" | "draw";

/**
 * AI difficulty levels affecting search depth and intelligence
 * - "easy": Fast moves, shallow search
 * - "medium": Balanced strategy and speed
 * - "hard": Deep analysis, slower but stronger
 */
type Difficulty = "easy" | "medium" | "hard";

/**
 * Represents a single move in the game
 */
interface Move {
  row: number;        // Board row (0-18)
  col: number;        // Board column (0-18)
  player: Player;     // Who made this move
  timestamp: number;  // When the move was made (for replay/analysis)
}

/**
 * Complete game state - all information needed to represent current game
 */
interface GameState {
  board: Player[][];                    // 19x19 grid of stones/empty spaces
  currentPlayer: Player;                // Whose turn it is
  status: GameStatus;                   // Current game phase
  winner: Player;                       // Who won (null if game ongoing)
  moveCount: number;                    // Total moves played
  moveHistory: Move[];                  // Complete move sequence for undo/replay
  lastMove: Move | null;                // Most recent move for highlighting
  winningLine: [number, number][] | null; // Coordinates of winning 5-in-a-row
}

/**
 * Player statistics for wins/losses tracking
 */
interface GameStats {
  wins: number;   // Games won
  losses: number; // Games lost  
  draws: number;  // Games drawn
}

/**
 * Local user representation (for guest play)
 */
interface User {
  username: string;
  stats: GameStats;
}

/**
 * Individual cell animation and interaction state
 * Used for smooth visual feedback during gameplay
 */
interface CellState {
  isAnimating: boolean; // Currently playing place/undo animation
  isNew: boolean;       // Just placed (triggers bounce animation)
  isUndoing: boolean;   // Being removed (triggers fade-out animation)
  isHovered: boolean;   // Mouse hovering over cell (shows preview stone)
}

// ==================== GLOBAL AI STATE ====================

/**
 * Singleton AI instance - recreated when difficulty changes
 * Kept outside component to maintain state between renders
 */
let aiInstance: AlphaBetaGomokuAI | null = null;

/**
 * Track current AI difficulty to detect when to recreate AI instance
 * Prevents unnecessary recreation of AI when other state changes
 */
let currentAIDifficulty: Difficulty | null = null;

// ==================== MAIN COMPONENT ====================

/**
 * Main Gomoku Game Component
 * Handles game logic, AI opponent, authentication, and UI state
 */
const GomokuGame: React.FC = () => {
  
  // ==================== GAME STATE ====================
  
  /**
   * Core game state - the authoritative source of truth for the current game
   * Contains board position, move history, game status, and win conditions
   */
  const [gameState, setGameState] = useState<GameState>({
    board: Array(19)
      .fill(null)
      .map(() => Array(19).fill(null)), // Initialize empty 19x19 board
    currentPlayer: "black",              // Human always plays first (black stones)
    status: "playing",                   // Game starts in progress
    winner: null,                        // No winner initially
    moveCount: 0,                        // Track total moves for game analysis
    moveHistory: [],                     // Complete move sequence for undo/replay
    lastMove: null,                      // Used for visual highlighting
    winningLine: null,                   // Store winning line coordinates for animation
  });

  // ==================== UI ANIMATION STATE ====================
  
  /**
   * Per-cell animation states for smooth visual feedback
   * Parallel array to game board tracking visual state of each cell
   */
  const [cellStates, setCellStates] = useState<CellState[][]>(
    Array(19)
      .fill(null)
      .map(() =>
        Array(19)
          .fill(null)
          .map(() => ({
            isAnimating: false, // Not currently animating
            isNew: false,       // Not newly placed
            isUndoing: false,   // Not being removed
            isHovered: false,   // Not hovered by mouse
          }))
      )
  );

  // ==================== INTERACTION STATE ====================
  
  /**
   * Currently hovered cell coordinates for preview stone display
   * null when no cell is hovered
   */
  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null);
  
  /**
   * AI thinking indicators for user feedback
   */
  const [isThinking, setIsThinking] = useState(false);      // General AI thinking state
  const [isDeepThinking, setIsDeepThinking] = useState(false); // Hard mode deep analysis
  
  /**
   * Victory animation trigger - shows celebration overlay
   */
  const [showVictoryAnimation, setShowVictoryAnimation] = useState(false);

  // ==================== AUTHENTICATION STATE ====================
  
  /**
   * Current authenticated user (null if guest play)
   * Loaded from localStorage on component mount
   */
  const [authUser, setAuthUser] = useState<AuthUser | null>(
    authService.getCurrentUser()
  );
  
  /**
   * Authentication modal visibility control
   */
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  /**
   * User profile dropdown menu visibility
   */
  const [showUserMenu, setShowUserMenu] = useState(false);

  // ==================== LOCAL USER STATE ====================
  
  /**
   * Guest player statistics (stored in component state only)
   * Used when playing without authentication
   */
  const [guestStats, setGuestStats] = useState({
    wins: 0,    // Games won as guest
    losses: 0,  // Games lost as guest
    draws: 0,   // Games drawn as guest
  });

  // ==================== AI CONFIGURATION ====================
  
  /**
   * Current AI difficulty setting
   * Controls search depth and thinking time
   */
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  // ==================== REFS FOR PERFORMANCE ====================
  
  /**
   * Reference to board DOM element for potential future use
   * (click handling, measurements, etc.)
   */
  const boardRef = useRef<HTMLDivElement>(null);
  
  /**
   * Prevents multiple simultaneous AI move calculations
   * Critical for preventing race conditions in AI processing
   */
  const aiProcessingRef = useRef<boolean>(false);

  // ==================== CORE GAME LOGIC ====================

  /**
   * Win detection algorithm with line tracking for visual effects
   * Checks all four directions from a placed stone to find 5+ in a row
   * 
   * @param board - Current board state to analyze
   * @param row - Row of the newly placed stone
   * @param col - Column of the newly placed stone  
   * @param player - Player who placed the stone
   * @returns Object with win status and winning line coordinates
   */
  const checkWin = useCallback(
    (
      board: Player[][],
      row: number,
      col: number,
      player: Player
    ): { hasWin: boolean; line: [number, number][] | null } => {
      // Four directions to check: horizontal, vertical, and both diagonals
      const directions = [
        [0, 1],  // Horizontal (left-right)
        [1, 0],  // Vertical (up-down)
        [1, 1],  // Diagonal (top-left to bottom-right)
        [1, -1], // Diagonal (top-right to bottom-left)
      ];

      // Check each direction for a line of 5+ stones
      for (const [dx, dy] of directions) {
        let count = 1; // Count starts at 1 for the placed stone
        const line: [number, number][] = [[row, col]]; // Track winning line coordinates

        // Count stones in positive direction from placed stone
        let r = row + dx,
          c = col + dy;
        while (r >= 0 && r < 19 && c >= 0 && c < 19 && board[r][c] === player) {
          count++;
          line.push([r, c]); // Add to end of line
          r += dx;
          c += dy;
        }

        // Count stones in negative direction from placed stone
        r = row - dx;
        c = col - dy;
        while (r >= 0 && r < 19 && c >= 0 && c < 19 && board[r][c] === player) {
          count++;
          line.unshift([r, c]); // Add to beginning of line
          r -= dx;
          c -= dy;
        }

        // Check if we found a winning line (5 or more stones)
        if (count >= 5) return { hasWin: true, line };
      }

      // No winning line found
      return { hasWin: false, line: null };
    },
    []
  );

  /**
   * Animate stone placement or removal with visual feedback
   * Triggers CSS animations through state changes
   * 
   * @param row - Board row coordinate
   * @param col - Board column coordinate
   * @param animationType - Type of animation to play
   */
  const animateCell = useCallback(
    (row: number, col: number, animationType: "place" | "undo") => {
      // Set animation flags to trigger CSS animations
      setCellStates((prev) => {
        const newStates = prev.map((r) => r.map((c) => ({ ...c })));
        if (animationType === "place") {
          newStates[row][col].isAnimating = true; // Trigger place animation
          newStates[row][col].isNew = true;       // Mark as newly placed
        } else {
          newStates[row][col].isUndoing = true;   // Trigger undo animation
        }
        return newStates;
      });

      // Clear animation flags after animation completes
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
        animationType === "place" ? 600 : 400 // Place animations take longer
      );
    },
    []
  );

  /**
   * Handle human player move (black stones only)
   * This is the main entry point for player interactions with the board
   * 
   * @param row - Target row for stone placement (0-18)
   * @param col - Target column for stone placement (0-18)
   */
  const makeMove = useCallback(
    (row: number, col: number) => {
      // ===== MOVE VALIDATION =====
      // Prevent invalid moves in various scenarios
      if (
        gameState.board[row][col] !== null ||   // Cell already occupied
        gameState.status !== "playing" ||       // Game not in progress
        isThinking ||                           // AI is currently thinking
        gameState.currentPlayer !== "black"     // Not human player's turn
      ) {
        return; // Early exit for invalid moves
      }

      // ===== BOARD STATE UPDATE =====
      // Create new board state with the move applied
      const newBoard = gameState.board.map((r) => [...r]); // Deep copy board
      newBoard[row][col] = gameState.currentPlayer;        // Place the stone

      // ===== WIN CONDITION CHECKING =====
      const winCheck = checkWin(newBoard, row, col, gameState.currentPlayer);
      const isBoardFull = newBoard.every((row) =>
        row.every((cell) => cell !== null)
      );

      // ===== MOVE RECORD CREATION =====
      const move: Move = {
        row,                              // Board coordinates
        col,
        player: gameState.currentPlayer,  // Who made the move
        timestamp: Date.now(),            // When move was made
      };

      // ===== VISUAL ANIMATION =====
      animateCell(row, col, "place"); // Trigger stone placement animation

      // ===== GAME STATE UPDATE =====
      setGameState((prev) => ({
        ...prev,
        board: newBoard,
        // Switch players unless game ended
        currentPlayer:
          winCheck.hasWin || isBoardFull
            ? prev.currentPlayer      // Keep current player if game ended
            : prev.currentPlayer === "black"
            ? "white"                 // Switch to AI
            : "black",                // Switch to human (shouldn't happen here)
        // Update game status based on outcome
        status: winCheck.hasWin ? "won" : isBoardFull ? "draw" : "playing",
        winner: winCheck.hasWin ? prev.currentPlayer : null,
        moveCount: prev.moveCount + 1,           // Increment move counter
        moveHistory: [...prev.moveHistory, move], // Add move to history
        lastMove: move,                          // Track for highlighting
        winningLine: winCheck.line,              // Store winning line for animation
      }));

      // ===== VICTORY CELEBRATION =====
      if (winCheck.hasWin) {
        setShowVictoryAnimation(true);
        setTimeout(() => setShowVictoryAnimation(false), 3000); // 3-second celebration
      }

      // ===== STATISTICS UPDATE =====
      // Update player statistics when game ends
      if (winCheck.hasWin) {
        if (authUser) {
          // For authenticated users: sync with server
          // TODO: Send win/loss data to API endpoint
          authService.refreshUserData();
        } else {
          // For guest users: update local statistics
          setGuestStats((prev) => ({
            ...prev,
            // Human won if current player is black (human), otherwise AI won
            [gameState.currentPlayer === "black" ? "wins" : "losses"]:
              prev[gameState.currentPlayer === "black" ? "wins" : "losses"] + 1,
          }));
        }
      } else if (isBoardFull) {
        // Handle draw game statistics
        if (authUser) {
          // TODO: Send draw data to API endpoint
          authService.refreshUserData();
        } else {
          setGuestStats((prev) => ({ ...prev, draws: prev.draws + 1 }));
        }
      }
    },
    [gameState, checkWin, isThinking, animateCell] // Dependencies for useCallback optimization
  );

  /**
   * Undo the last move(s) - smart undo that removes both AI and player moves
   * Only available during human player's turn to maintain game flow
   */
  const undoLastMove = useCallback(() => {
    // ===== UNDO VALIDATION =====
    if (
      gameState.moveHistory.length === 0 ||  // No moves to undo
      gameState.status !== "playing" ||      // Game not in progress
      isThinking                             // AI currently thinking
    ) {
      return; // Early exit if undo not allowed
    }

    // ===== MOVE HISTORY ANALYSIS =====
    const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];     // Most recent move
    const secondLastMove =
      gameState.moveHistory[gameState.moveHistory.length - 2];                   // Second most recent move

    // ===== SMART UNDO LOGIC =====
    // Only allow undo when it's human's turn (after AI has moved)
    // This ensures undo always brings the game back to human's turn
    if (lastMove.player === "white") {
      // ===== BOARD STATE RESTORATION =====
      const newBoard = gameState.board.map((r) => [...r]); // Deep copy current board
      newBoard[lastMove.row][lastMove.col] = null;          // Remove AI's move

      // ===== VISUAL FEEDBACK =====
      animateCell(lastMove.row, lastMove.col, "undo"); // Animate AI move removal

      // If there's a human move to undo as well, remove it too
      if (secondLastMove) {
        newBoard[secondLastMove.row][secondLastMove.col] = null; // Remove human's move
        animateCell(secondLastMove.row, secondLastMove.col, "undo"); // Animate human move removal
      }

      // ===== GAME STATE RESTORATION =====
      // Delay state update to allow animations to start
      setTimeout(() => {
        setGameState((prev) => ({
          ...prev,
          board: newBoard,
          currentPlayer: "black",              // Always return to human's turn
          status: "playing",                   // Reset to playing state
          winner: null,                        // Clear any winner state
          moveCount: Math.max(0, prev.moveCount - (secondLastMove ? 2 : 1)), // Reduce move count
          moveHistory: prev.moveHistory.slice(0, secondLastMove ? -2 : -1),   // Remove undone moves
          // Find the new last move after undo
          lastMove:
            gameState.moveHistory[
              gameState.moveHistory.length - (secondLastMove ? 3 : 2)
            ] || null,
          winningLine: null,                   // Clear any winning line
        }));
      }, 200); // Brief delay for animation synchronization
    }
    // Note: If lastMove.player === "black", we don't allow undo because 
    // it would be the human's turn anyway, so no undo is needed
  }, [gameState, isThinking, animateCell]);

  /**
   * AI Move Processing Effect
   * Triggers when it's the AI's turn and handles the complete AI move cycle:
   * 1. AI analysis and move selection
   * 2. Move execution and board update
   * 3. Win/draw detection and statistics update
   * 4. UI state management (thinking indicators, animations)
   */
  useEffect(() => {
    // ===== AI TURN DETECTION =====
    // Check if AI should make a move
    if (
      gameState.currentPlayer === "white" &&  // AI plays white stones
      gameState.status === "playing" &&       // Game is in progress
      !aiProcessingRef.current                // Prevent concurrent AI processing
    ) {
      // ===== AI PROCESSING INITIALIZATION =====
      aiProcessingRef.current = true; // Set processing flag to prevent race conditions
      setIsThinking(true);             // Show general thinking indicator

      // ===== DIFFICULTY-SPECIFIC UI FEEDBACK =====
      // Show special indicator for hard mode deep analysis
      if (difficulty === "hard") {
        setIsDeepThinking(true); // Triggers "🧠 AI analyzing deeply..." message
      }

      // ===== AI MOVE CALCULATION =====
      // Use minimal delay to allow UI state updates to render before blocking calculation
      const timer = setTimeout(() => {
        // ===== AI INSTANCE MANAGEMENT =====
        // Create or recreate AI instance when difficulty changes
        if (!aiInstance || currentAIDifficulty !== difficulty) {
          aiInstance = new AlphaBetaGomokuAI(difficulty, "white"); // AI plays white
          currentAIDifficulty = difficulty; // Track current difficulty
        }

        // ===== MOVE GENERATION =====
        const move = aiInstance.findBestMove(gameState.board); // Get AI's chosen move

        if (move) {
          // ===== BOARD STATE UPDATE =====
          const newBoard = gameState.board.map((r) => [...r]); // Deep copy board
          newBoard[move[0]][move[1]] = "white";                 // Place AI stone

          // ===== GAME OUTCOME ANALYSIS =====
          const winCheck = checkWin(newBoard, move[0], move[1], "white");
          const isBoardFull = newBoard.every((row) =>
            row.every((cell) => cell !== null)
          );

          // ===== MOVE RECORD CREATION =====
          const aiMove = {
            row: move[0],                    // AI's move coordinates
            col: move[1],
            player: "white" as Player,       // AI is always white
            timestamp: Date.now(),           // When AI made the move
          };

          // ===== VISUAL ANIMATION =====
          animateCell(move[0], move[1], "place"); // Trigger stone placement animation

          // ===== GAME STATE UPDATE =====
          setGameState((prev) => ({
            ...prev,
            board: newBoard,
            // Switch to human unless game ended
            currentPlayer: winCheck.hasWin || isBoardFull ? "white" : "black",
            status: winCheck.hasWin ? "won" : isBoardFull ? "draw" : "playing",
            winner: winCheck.hasWin ? "white" : null, // AI wins if win detected
            moveCount: prev.moveCount + 1,            // Increment move counter
            moveHistory: [...prev.moveHistory, aiMove], // Add AI move to history
            lastMove: aiMove,                         // Track for highlighting
            winningLine: winCheck.line,               // Store winning line for animation
          }));

          // ===== VICTORY CELEBRATION =====
          if (winCheck.hasWin) {
            setShowVictoryAnimation(true);
            setTimeout(() => setShowVictoryAnimation(false), 3000); // 3-second celebration

            // ===== AI WIN STATISTICS =====
            if (authUser) {
              // For authenticated users: sync loss with server
              // TODO: Send loss data to API endpoint
              authService.refreshUserData();
            } else {
              // For guest users: increment local loss counter
              setGuestStats((prev) => ({
                ...prev,
                losses: prev.losses + 1, // Human lost, AI won
              }));
            }
          } else if (isBoardFull) {
            // ===== DRAW GAME STATISTICS =====
            if (authUser) {
              // TODO: Send draw data to API endpoint
              authService.refreshUserData();
            } else {
              setGuestStats((prev) => ({ ...prev, draws: prev.draws + 1 }));
            }
          }
        }

        // ===== CLEANUP AND STATE RESET =====
        aiProcessingRef.current = false; // Clear processing flag
        setIsThinking(false);             // Hide thinking indicator
        setIsDeepThinking(false);         // Hide deep thinking indicator
      }, 50); // 50ms delay for UI responsiveness (allows thinking indicators to show)

      // ===== CLEANUP FUNCTION =====
      // Clean up if component unmounts or dependencies change during AI processing
      return () => {
        clearTimeout(timer);              // Cancel pending AI move
        aiProcessingRef.current = false;  // Reset processing flag
        setIsDeepThinking(false);         // Clear deep thinking state
      };
    }
  }, [
    gameState.currentPlayer, // Trigger when player changes
    gameState.status,        // Trigger when game status changes  
    gameState.board,         // Trigger when board state changes
    difficulty,              // Trigger when AI difficulty changes
    checkWin,                // Stable function dependency
    animateCell,             // Stable function dependency
  ]); // Note: Intentionally excluded isThinking to prevent infinite loops

  /**
   * Reset game to initial state
   * Clears all game data and resets UI to start a fresh game
   */
  const resetGame = useCallback(() => {
    // ===== RESET CORE GAME STATE =====
    setGameState({
      board: Array(19)
        .fill(null)
        .map(() => Array(19).fill(null)), // Fresh empty 19x19 board
      currentPlayer: "black",              // Human always starts first
      status: "playing",                   // Ready for new game
      winner: null,                        // No winner
      moveCount: 0,                        // Reset move counter
      moveHistory: [],                     // Clear all moves
      lastMove: null,                      // No last move
      winningLine: null,                   // No winning line
    });

    // ===== RESET UI ANIMATION STATE =====
    setCellStates(
      Array(19)
        .fill(null)
        .map(() =>
          Array(19)
            .fill(null)
            .map(() => ({
              isAnimating: false, // No animations
              isNew: false,       // No new stones
              isUndoing: false,   // No undo animations
              isHovered: false,   // No hover states
            }))
        )
    );

    // ===== RESET VISUAL EFFECTS =====
    setShowVictoryAnimation(false); // Hide victory celebration
    setIsDeepThinking(false);       // Clear AI thinking indicators

    // ===== RESET AI STATE =====
    aiProcessingRef.current = false; // Clear processing flag
    aiInstance = null;              // Force AI recreation for next game
    currentAIDifficulty = null;     // Reset difficulty tracking
  }, []);

  /**
   * Handle mouse hover over board cells
   * Shows preview stone and manages hover animation states
   * 
   * @param row - Cell row coordinate
   * @param col - Cell column coordinate
   * @param isHovering - Whether mouse is entering or leaving the cell
   */
  const handleCellHover = useCallback(
    (row: number, col: number, isHovering: boolean) => {
      // ===== HOVER VALIDATION =====
      // Don't show hover effects in these conditions:
      if (
        gameState.board[row][col] !== null ||  // Cell already occupied
        gameState.status !== "playing" ||      // Game not in progress
        isThinking                             // AI is thinking
      ) {
        return; // Early exit - no hover feedback
      }

      // ===== HOVER STATE MANAGEMENT =====
      setHoveredCell(isHovering ? [row, col] : null); // Track currently hovered cell

      // ===== CELL VISUAL STATE UPDATE =====
      setCellStates((prev) => {
        const newStates = prev.map((r) => r.map((c) => ({ ...c }))); // Deep copy states
        newStates[row][col].isHovered = isHovering; // Set hover flag for CSS styling
        return newStates;
      });
    },
    [gameState.board, gameState.status, isThinking] // Optimize with dependency tracking
  );

  /**
   * Render individual board cell with stone, animations, and interactive effects
   * Creates the visual representation of each intersection on the game board
   * 
   * @param row - Cell row coordinate (0-18)
   * @param col - Cell column coordinate (0-18)
   * @returns JSX element representing the board cell
   */
  const renderCell = (row: number, col: number) => {
    // ===== CELL STATE ANALYSIS =====
    const cell = gameState.board[row][col];          // Current stone at position (black/white/null)
    const cellState = cellStates[row][col];          // Animation and interaction state
    const isLastMove =                               // True if this was the most recent move
      gameState.lastMove?.row === row && gameState.lastMove?.col === col;
    const isWinningCell = gameState.winningLine?.some( // True if part of winning line
      ([r, c]) => r === row && c === col
    );
    const isHovered = hoveredCell?.[0] === row && hoveredCell?.[1] === col; // True if mouse hovering

    return (
      <div
        key={`${row}-${col}`}
        className={`board-cell group relative transition-all duration-200 ${
          isWinningCell ? "animate-pulse-soft" : ""  // Winning cells pulse softly
        } ${isHovered ? "scale-110 z-20" : "z-10"}`} // Hover enlarges cell
        onClick={() => makeMove(row, col)}            // Handle click to place stone
        onMouseEnter={() => handleCellHover(row, col, true)}  // Show hover effects
        onMouseLeave={() => handleCellHover(row, col, false)} // Hide hover effects
      >
        {/* ===== VISUAL HIGHLIGHTS ===== */}
        
        {/* Last move indicator - subtle glow around most recent move */}
        {isLastMove && (
          <div className="absolute inset-0 bg-primary-200/40 rounded-full animate-pulse-soft" />
        )}

        {/* Winning line highlight - golden glow for winning stones */}
        {isWinningCell && (
          <div className="absolute inset-0 bg-yellow-300/60 rounded-full animate-board-glow" />
        )}

        {/* ===== STONE RENDERING ===== */}
        {cell ? (
          // Placed stone with animations and styling
          <div
            className={`stone ${
              cell === "black" ? "stone-black" : "stone-white"    // Stone color
            } ${cellState.isNew ? "animate-stone-place" : ""      // Placement animation
            } ${cellState.isUndoing ? "animate-undo" : ""         // Undo animation
            } ${isLastMove ? "ring-2 ring-primary-400 ring-opacity-60" : ""}`} // Last move ring
          />
        ) : isHovered &&                                          // Show preview stone if:
          gameState.currentPlayer === "black" &&                  // - It's human's turn
          gameState.status === "playing" &&                       // - Game is active
          !isThinking ? (                                         // - AI isn't thinking
          <div className="stone stone-black stone-preview animate-stone-hover" />
        ) : null}

        {/* ===== HOVER EFFECT OVERLAY ===== */}
        {/* Subtle white overlay that appears on hover for visual feedback */}
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full" />
      </div>
    );
  };

  // ==================== UI UTILITY FUNCTIONS ====================

  /**
   * Get TailwindCSS color class for difficulty level
   * Used for consistent color theming across UI
   * 
   * @param level - AI difficulty setting
   * @returns TailwindCSS text color class
   */
  const getDifficultyColor = (level: Difficulty) => {
    switch (level) {
      case "easy":
        return "text-green-600";   // Green for easy/beginner
      case "medium":
        return "text-yellow-600";  // Yellow for medium/intermediate
      case "hard":
        return "text-red-600";     // Red for hard/expert
      default:
        return "text-gray-600";    // Fallback gray
    }
  };

  /**
   * Get appropriate icon component for difficulty level
   * Visual indicators that help users understand AI strength
   * 
   * @param level - AI difficulty setting
   * @returns Lucide React icon component
   */
  const getDifficultyIcon = (level: Difficulty) => {
    switch (level) {
      case "easy":
        return <Sparkles className="w-4 h-4 text-green-500" />; // Sparkles = fun/easy
      case "medium":
        return <Brain className="w-4 h-4 text-yellow-500" />;   // Brain = thinking/strategy
      case "hard":
        return <Zap className="w-4 h-4 text-red-500" />;       // Lightning = power/speed
    }
  };

  /**
   * Get human-readable description of AI difficulty
   * Explains what each difficulty level means in technical terms
   * 
   * @param level - AI difficulty setting
   * @returns User-friendly description string
   */
  const getDifficultyDescription = (level: Difficulty) => {
    switch (level) {
      case "easy":
        return "1 move ahead with alpha-beta pruning";           // Shallow search
      case "medium":
        return "Up to 4 moves ahead for strategic play";         // Moderate depth
      case "hard":
        return "Advanced search with iterative deepening (up to 5 moves)"; // Deep analysis
    }
  };

  // ==================== AUTHENTICATION HANDLERS ====================

  /**
   * Handle successful authentication
   * Updates local state and closes authentication modal
   * 
   * @param user - Authenticated user data from server
   */
  const handleAuthSuccess = (user: AuthUser) => {
    setAuthUser(user);           // Store user in local state
    setIsAuthModalOpen(false);   // Close login modal
  };

  /**
   * Handle user logout
   * Clears authentication state and closes user menu
   */
  const handleLogout = async () => {
    await authService.logout();  // Clear server-side session
    setAuthUser(null);           // Clear local user state
    setShowUserMenu(false);      // Close user dropdown
  };

  /**
   * Handle login button click
   * Opens the authentication modal for login/registration
   */
  const handleLoginClick = () => {
    setIsAuthModalOpen(true);    // Show login/register modal
  };

  // ==================== UI EVENT HANDLERS ====================

  /**
   * Close user dropdown menu when clicking outside
   * Provides better UX by auto-closing menus on outside clicks
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserMenu) {
        setShowUserMenu(false);  // Close menu on any click when open
      }
    };

    // Only add listener when menu is open (performance optimization)
    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Cleanup listener on unmount or when menu closes
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]); // Re-run when menu state changes

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
