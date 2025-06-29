import React, { useState, useCallback, useEffect } from 'react';
import { User, RefreshCw, Trophy, Clock } from 'lucide-react';

// Types
type Player = 'black' | 'white' | null;
type GameStatus = 'playing' | 'won' | 'draw';
type Difficulty = 'easy' | 'medium' | 'hard';

interface GameState {
  board: Player[][];
  currentPlayer: Player;
  status: GameStatus;
  winner: Player;
  moveCount: number;
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

// AI Logic
class GomokuAI {
  private board: Player[][];
  private difficulty: Difficulty;
  
  constructor(board: Player[][], difficulty: Difficulty = 'medium') {
    this.board = board;
    this.difficulty = difficulty;
  }
  
  makeMove(): [number, number] | null {
    const emptyCells = this.getEmptyCells();
    if (emptyCells.length === 0) return null;
    
    switch (this.difficulty) {
      case 'easy':
        return this.randomMove(emptyCells);
      case 'medium':
        return this.strategicMove(emptyCells);
      case 'hard':
        return this.advancedMove(emptyCells);
      default:
        return this.strategicMove(emptyCells);
    }
  }
  
  private getEmptyCells(): [number, number][] {
    const empty: [number, number][] = [];
    for (let i = 0; i < 19; i++) {
      for (let j = 0; j < 19; j++) {
        if (this.board[i][j] === null) {
          empty.push([i, j]);
        }
      }
    }
    return empty;
  }
  
  private randomMove(emptyCells: [number, number][]): [number, number] {
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }
  
  private strategicMove(emptyCells: [number, number][]): [number, number] {
    // Check for winning moves
    for (const [row, col] of emptyCells) {
      if (this.wouldWin(row, col, 'white')) {
        return [row, col];
      }
    }
    
    // Block player's winning moves
    for (const [row, col] of emptyCells) {
      if (this.wouldWin(row, col, 'black')) {
        return [row, col];
      }
    }
    
    // Find strategic positions
    const scoredMoves = emptyCells.map(([row, col]) => ({
      row,
      col,
      score: this.evaluatePosition(row, col)
    }));
    
    scoredMoves.sort((a, b) => b.score - a.score);
    return [scoredMoves[0].row, scoredMoves[0].col];
  }
  
  private advancedMove(emptyCells: [number, number][]): [number, number] {
    // More sophisticated AI with deeper analysis
    return this.strategicMove(emptyCells); // Simplified for now
  }
  
  private wouldWin(row: number, col: number, player: Player): boolean {
    const testBoard = this.board.map(r => [...r]);
    testBoard[row][col] = player;
    return this.checkWin(testBoard, row, col, player);
  }
  
  private evaluatePosition(row: number, col: number): number {
    let score = 0;
    const directions = [
      [0, 1], [1, 0], [1, 1], [1, -1]
    ];
    
    for (const [dx, dy] of directions) {
      score += this.evaluateDirection(row, col, dx, dy, 'white');
      score -= this.evaluateDirection(row, col, dx, dy, 'black') * 1.1; // Slightly prioritize defense
    }
    
    // Prefer center positions
    const centerDistance = Math.abs(row - 9) + Math.abs(col - 9);
    score += (18 - centerDistance) * 0.1;
    
    return score;
  }
  
  private evaluateDirection(row: number, col: number, dx: number, dy: number, player: Player): number {
    let count = 1;
    let openEnds = 0;
    
    // Check positive direction
    let r = row + dx, c = col + dy;
    while (r >= 0 && r < 19 && c >= 0 && c < 19 && this.board[r][c] === player) {
      count++;
      r += dx;
      c += dy;
    }
    if (r >= 0 && r < 19 && c >= 0 && c < 19 && this.board[r][c] === null) {
      openEnds++;
    }
    
    // Check negative direction
    r = row - dx;
    c = col - dy;
    while (r >= 0 && r < 19 && c >= 0 && c < 19 && this.board[r][c] === player) {
      count++;
      r -= dx;
      c -= dy;
    }
    if (r >= 0 && r < 19 && c >= 0 && c < 19 && this.board[r][c] === null) {
      openEnds++;
    }
    
    // Score based on count and open ends
    if (count >= 5) return 1000;
    if (count === 4 && openEnds > 0) return 100;
    if (count === 3 && openEnds === 2) return 50;
    if (count === 3 && openEnds === 1) return 10;
    if (count === 2 && openEnds === 2) return 5;
    
    return count * openEnds;
  }
  
  private checkWin(board: Player[][], row: number, col: number, player: Player): boolean {
    const directions = [
      [0, 1], [1, 0], [1, 1], [1, -1]
    ];
    
    for (const [dx, dy] of directions) {
      let count = 1;
      
      // Check positive direction
      let r = row + dx, c = col + dy;
      while (r >= 0 && r < 19 && c >= 0 && c < 19 && board[r][c] === player) {
        count++;
        r += dx;
        c += dy;
      }
      
      // Check negative direction
      r = row - dx;
      c = col - dy;
      while (r >= 0 && r < 19 && c >= 0 && c < 19 && board[r][c] === player) {
        count++;
        r -= dx;
        c -= dy;
      }
      
      if (count >= 5) return true;
    }
    
    return false;
  }
}

// Main Game Component
const GomokuGame: React.FC = () => {
  // Game State
  const [gameState, setGameState] = useState<GameState>({
    board: Array(19).fill(null).map(() => Array(19).fill(null)),
    currentPlayer: 'black',
    status: 'playing',
    winner: null,
    moveCount: 0
  });
  
  // User State
  const [user, setUser] = useState<User>({
    username: 'Player1',
    stats: { wins: 0, losses: 0, draws: 0 }
  });
  
  // Game Settings
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [isThinking, setIsThinking] = useState(false);
  
  // Check for win condition
  const checkWin = useCallback((board: Player[][], row: number, col: number, player: Player): boolean => {
    const directions = [
      [0, 1], [1, 0], [1, 1], [1, -1]
    ];
    
    for (const [dx, dy] of directions) {
      let count = 1;
      
      // Check positive direction
      let r = row + dx, c = col + dy;
      while (r >= 0 && r < 19 && c >= 0 && c < 19 && board[r][c] === player) {
        count++;
        r += dx;
        c += dy;
      }
      
      // Check negative direction
      r = row - dx;
      c = col - dy;
      while (r >= 0 && r < 19 && c >= 0 && c < 19 && board[r][c] === player) {
        count++;
        r -= dx;
        c -= dy;
      }
      
      if (count >= 5) return true;
    }
    
    return false;
  }, []);
  
  // Handle player move
  const makeMove = useCallback((row: number, col: number) => {
    if (gameState.board[row][col] !== null || gameState.status !== 'playing') {
      return;
    }
    
    const newBoard = gameState.board.map(r => [...r]);
    newBoard[row][col] = gameState.currentPlayer;
    
    const hasWon = checkWin(newBoard, row, col, gameState.currentPlayer);
    const isBoardFull = newBoard.every(row => row.every(cell => cell !== null));
    
    setGameState(prev => ({
      ...prev,
      board: newBoard,
      currentPlayer: hasWon || isBoardFull ? prev.currentPlayer : (prev.currentPlayer === 'black' ? 'white' : 'black'),
      status: hasWon ? 'won' : (isBoardFull ? 'draw' : 'playing'),
      winner: hasWon ? prev.currentPlayer : null,
      moveCount: prev.moveCount + 1
    }));
    
    // Update stats if game ended
    if (hasWon) {
      setUser(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          [gameState.currentPlayer === 'black' ? 'wins' : 'losses']: prev.stats[gameState.currentPlayer === 'black' ? 'wins' : 'losses'] + 1
        }
      }));
    } else if (isBoardFull) {
      setUser(prev => ({
        ...prev,
        stats: { ...prev.stats, draws: prev.stats.draws + 1 }
      }));
    }
  }, [gameState, checkWin]);
  
  // AI Move Effect
  useEffect(() => {
    if (gameState.currentPlayer === 'white' && gameState.status === 'playing') {
      setIsThinking(true);
      
      const timer = setTimeout(() => {
        const ai = new GomokuAI(gameState.board, difficulty);
        const move = ai.makeMove();
        
        if (move) {
          makeMove(move[0], move[1]);
        }
        
        setIsThinking(false);
      }, 500 + Math.random() * 1000); // Random thinking time
      
      return () => clearTimeout(timer);
    }
  }, [gameState.currentPlayer, gameState.status, gameState.board, difficulty, makeMove]);
  
  // Reset game
  const resetGame = useCallback(() => {
    setGameState({
      board: Array(19).fill(null).map(() => Array(19).fill(null)),
      currentPlayer: 'black',
      status: 'playing',
      winner: null,
      moveCount: 0
    });
  }, []);
  
  // Render cell
  const renderCell = (row: number, col: number) => {
    const cell = gameState.board[row][col];
    const isLastMove = false; // Could track this for visual feedback
    
    return (
      <div
        key={`${row}-${col}`}
        className={`w-6 h-6 border border-gray-400 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors ${
          isLastMove ? 'ring-2 ring-blue-500' : ''
        }`}
        onClick={() => makeMove(row, col)}
      >
        {cell && (
          <div
            className={`w-5 h-5 rounded-full ${
              cell === 'black' ? 'bg-black' : 'bg-white border border-gray-400'
            } transition-all duration-200 transform hover:scale-110`}
          />
        )}
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <User className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Gomoku</h1>
                <p className="text-gray-600">Welcome, {user.username}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{user.stats.wins}</div>
                <div className="text-sm text-gray-600">Wins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{user.stats.losses}</div>
                <div className="text-sm text-gray-600">Losses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{user.stats.draws}</div>
                <div className="text-sm text-gray-600">Draws</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-6">
          {/* Game Board */}
          <div className="bg-white rounded-lg shadow-md p-6 flex-1">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-black rounded-full"></div>
                  <span className="text-sm font-medium">You</span>
                </div>
                <span className="text-gray-400">vs</span>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-white border border-gray-400 rounded-full"></div>
                  <span className="text-sm font-medium">AI ({difficulty})</span>
                </div>
              </div>
              
              <button
                onClick={resetGame}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>New Game</span>
              </button>
            </div>
            
            {/* Game Status */}
            <div className="mb-4">
              {gameState.status === 'playing' && (
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${gameState.currentPlayer === 'black' ? 'bg-black' : 'bg-white border border-gray-400'}`}></div>
                  <span className="text-lg font-medium">
                    {gameState.currentPlayer === 'black' ? 'Your turn' : 'AI thinking...'}
                  </span>
                  {isThinking && <Clock className="w-4 h-4 animate-spin text-blue-600" />}
                </div>
              )}
              
              {gameState.status === 'won' && (
                <div className="flex items-center space-x-2">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  <span className="text-xl font-bold text-green-600">
                    {gameState.winner === 'black' ? 'You won!' : 'AI won!'}
                  </span>
                </div>
              )}
              
              {gameState.status === 'draw' && (
                <div className="text-xl font-bold text-gray-600">Game Draw!</div>
              )}
            </div>
            
            {/* Board */}
            <div className="inline-block bg-amber-100 p-4 rounded-lg">
              <div 
                className="border-2 border-gray-600 inline-grid gap-0"
                style={{ 
                  gridTemplateColumns: 'repeat(19, minmax(0, 1fr))',
                  gridTemplateRows: 'repeat(19, minmax(0, 1fr))'
                }}
              >
                {gameState.board.map((row, rowIndex) =>
                  row.map((_, colIndex) => renderCell(rowIndex, colIndex))
                )}
              </div>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="w-80 space-y-6">
            {/* Difficulty Settings */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">AI Difficulty</h3>
              <div className="space-y-2">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
                  <label key={level} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="difficulty"
                      value={level}
                      checked={difficulty === level}
                      onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                      className="text-blue-600"
                    />
                    <span className="capitalize">{level}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Game Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Game Info</h3>
              <div className="space-y-2 text-sm">
                <div>Moves: {gameState.moveCount}</div>
                <div>Board: 19×19</div>
                <div>Win condition: 5 in a row</div>
              </div>
            </div>
            
            {/* Rules */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">How to Play</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Click on empty squares to place your stone</p>
                <p>• Get 5 stones in a row to win</p>
                <p>• Rows can be horizontal, vertical, or diagonal</p>
                <p>• Black (you) moves first</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GomokuGame;