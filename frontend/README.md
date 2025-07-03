# 🎨 Gomoku Frontend

Modern React 18 application with TypeScript, Tailwind CSS, and advanced AI gameplay interface.

## 🚀 Quick Start

```bash
# Install dependencies
yarn install

# Start development server
yarn start

# Access at http://localhost:3000
```

## 🏗️ Tech Stack

- **Framework**: React 18 + TypeScript 5
- **Styling**: Tailwind CSS 3.4
- **Bundling**: Webpack 5 (via Create React App)
- **State**: React Hooks + Context
- **HTTP**: Axios for API calls
- **Testing**: Jest + React Testing Library

## 📱 Features

### 🎮 Game Interface
- **Interactive Board**: 15x15 responsive grid
- **Real-time Feedback**: Animated stone placement
- **Move History**: Visual move indicators
- **Difficulty Selection**: Easy/Medium/Hard modes

### 🤖 AI Integration
- **Smart Responses**: Turn-aware AI evaluation
- **Visual Feedback**: AI thinking indicators
- **Move Explanations**: Debug AI reasoning
- **Performance Modes**: Adaptive difficulty

### 🔐 Authentication
- **Modal Interface**: Clean login/register UI
- **JWT Management**: Automatic token handling
- **Session Persistence**: Remember user state
- **Error Handling**: User-friendly messages

## 🏗️ Architecture

### Directory Structure
```
src/
├── components/
│   ├── AuthModal.tsx      # Authentication UI
│   ├── GameBoard.tsx      # Main game interface
│   ├── GameControls.tsx   # Game action buttons
│   └── PlayerStatus.tsx   # Current player indicator
├── services/
│   ├── authService.ts     # Authentication API
│   ├── gameService.ts     # Game state API
│   └── types.ts           # TypeScript definitions
├── AlphaBetaAI.ts         # AI algorithm implementation
├── game.tsx               # Main game component
├── index.tsx              # React entry point
└── index.css              # Global styles
```

### Component Hierarchy
```
App
├── AuthModal (conditional)
├── GameBoard
│   ├── PlayerStatus
│   ├── Board Grid (15x15)
│   └── GameControls
└── Game Statistics
```

## 🎯 Core Components

### Main Game Component
```typescript
// game.tsx - Core game state management
interface GameState {
  board: Player[][];               // 15x15 game board
  currentPlayer: Player;           // 'human' | 'ai'
  gameStatus: GameStatus;          // 'active' | 'completed' | 'drawn'
  difficulty: Difficulty;          // 'easy' | 'medium' | 'hard'
  moveHistory: Move[];             // Complete move sequence
  isAuthenticated: boolean;        // User login state
  authUser: User | null;          // Current user data
}

// Example usage
const [gameState, setGameState] = useState<GameState>({
  board: createEmptyBoard(),
  currentPlayer: 'human',
  gameStatus: 'active',
  difficulty: 'medium',
  moveHistory: [],
  isAuthenticated: false,
  authUser: null
});
```

### Authentication Modal
```typescript
// components/AuthModal.tsx
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User, token: string) => void;
}

// Login form example
const handleLogin = async (email: string, password: string) => {
  try {
    const response = await authService.login(email, password);
    if (response.success) {
      setAuthToken(response.token);
      onSuccess(response.data, response.token);
      onClose();
    }
  } catch (error) {
    setError('Invalid credentials');
  }
};
```

### Game Board Component
```typescript
// components/GameBoard.tsx
interface GameBoardProps {
  board: Player[][];
  onCellClick: (row: number, col: number) => void;
  currentPlayer: Player;
  isGameActive: boolean;
  moveHistory: Move[];
}

// Cell click handler
const handleCellClick = useCallback((row: number, col: number) => {
  // Validate move
  if (!isGameActive || board[row][col] !== null) return;
  
  // Make move
  onCellClick(row, col);
}, [board, isGameActive, onCellClick]);
```

## 🤖 AI Algorithm

### Alpha-Beta Implementation
```typescript
// AlphaBetaAI.ts - Core AI logic
class AlphaBetaAI {
  private readonly BOARD_SIZE = 15;
  private readonly MAX_DEPTH = {
    easy: 2,     // ~50ms response
    medium: 4,   // ~200ms response  
    hard: 5      // ~500ms response
  };

  // Main decision function
  findBestMove(board: Player[][], difficulty: Difficulty): Move {
    const depth = this.MAX_DEPTH[difficulty];
    
    // Check for immediate threats first
    const threat = this.findImmediateThreat(board);
    if (threat) return threat;
    
    // Use alpha-beta search
    return this.alphaBetaSearch(board, depth, true);
  }
}
```

### Threat Detection
```typescript
// Immediate threat patterns
private readonly THREAT_PATTERNS = {
  FIVE: 100000,           // 11111 - Winning move
  STRAIGHT_FOUR: 50000,   // _1111_ - Unstoppable threat
  FOUR: 10000,            // 1111_ - Strong threat
  THREE: 5000,            // _111_ - Good position
  TWO: 1000,              // _11_ - Basic pattern
};

// Example: Detect critical threats
findImmediateThreat(board: Player[][]): Move | null {
  // Check for winning moves
  for (let row = 0; row < this.BOARD_SIZE; row++) {
    for (let col = 0; col < this.BOARD_SIZE; col++) {
      if (board[row][col] === null) {
        if (this.wouldWin(board, row, col, 'ai')) {
          return { row, col, score: this.THREAT_PATTERNS.FIVE };
        }
      }
    }
  }
  
  // Check for blocking moves
  return this.findBlockingMove(board);
}
```

### Turn-Aware Evaluation
```typescript
// Evaluation considers whose turn it is
evaluateBoard(board: Player[][], isMaximizingPlayer: boolean): number {
  const aiScore = this.calculateScore(board, 'ai');
  const humanScore = this.calculateScore(board, 'human');
  
  if (isMaximizingPlayer) {
    // AI turn: be aggressive
    return 1.5 * aiScore - humanScore;
  } else {
    // Human turn: evaluate defensively
    return 1.5 * humanScore - aiScore;
  }
}
```

## 🎨 Styling

### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        game: {
          board: '#DEB887',      // Board background
          line: '#8B4513',       // Grid lines
          human: '#000000',      // Human stones
          ai: '#FFFFFF',         // AI stones
          highlight: '#FFD700'   // Move highlights
        }
      },
      animation: {
        'stone-place': 'stoneDrop 0.3s ease-out',
        'thinking': 'pulse 1.5s infinite'
      }
    }
  }
};
```

### Component Styling Examples
```typescript
// Game board grid
<div className="grid grid-cols-15 gap-0 bg-game-board border-2 border-game-line">
  {board.map((row, rowIndex) =>
    row.map((cell, colIndex) => (
      <div
        key={`${rowIndex}-${colIndex}`}
        className={`
          w-8 h-8 border border-game-line cursor-pointer
          hover:bg-yellow-200 transition-colors duration-200
          ${cell ? 'cursor-not-allowed' : ''}
        `}
        onClick={() => handleCellClick(rowIndex, colIndex)}
      >
        {cell && (
          <div className={`
            w-full h-full rounded-full animate-stone-place
            ${cell === 'human' ? 'bg-black' : 'bg-white border border-gray-400'}
          `} />
        )}
      </div>
    ))
  )}
</div>

// AI thinking indicator
<div className="flex items-center space-x-2">
  <div className="animate-thinking w-3 h-3 bg-blue-500 rounded-full" />
  <span className="text-blue-600">AI is thinking...</span>
</div>
```

## 🔗 API Integration

### Authentication Service
```typescript
// services/authService.ts
class AuthService {
  private baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api/v1';

  async register(userData: RegisterData): Promise<AuthResponse> {
    const response = await axios.post(`${this.baseURL}/auth/register`, {
      user: userData
    });
    return response.data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await axios.post(`${this.baseURL}/auth/login`, {
      email,
      password
    });
    
    // Store token for future requests
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
      this.setAuthHeader(response.data.token);
    }
    
    return response.data;
  }

  private setAuthHeader(token: string) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
}
```

### Game Service
```typescript
// services/gameService.ts
class GameService {
  async createGame(difficulty: Difficulty): Promise<GameResponse> {
    const response = await axios.post('/games', { difficulty });
    return response.data;
  }

  async makeMove(gameId: number, move: Move): Promise<MoveResponse> {
    const response = await axios.patch(`/games/${gameId}`, { move });
    return response.data;
  }

  async getGameHistory(gameId: number): Promise<GameHistoryResponse> {
    const response = await axios.get(`/games/${gameId}/history`);
    return response.data;
  }
}
```

## 🧪 Testing

### Component Tests
```typescript
// __tests__/GameBoard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import GameBoard from '../components/GameBoard';

describe('GameBoard', () => {
  const mockProps = {
    board: createEmptyBoard(),
    onCellClick: jest.fn(),
    currentPlayer: 'human' as Player,
    isGameActive: true,
    moveHistory: []
  };

  test('renders 15x15 grid', () => {
    render(<GameBoard {...mockProps} />);
    
    // Should have 225 cells (15x15)
    const cells = screen.getAllByRole('button');
    expect(cells).toHaveLength(225);
  });

  test('handles cell clicks', () => {
    render(<GameBoard {...mockProps} />);
    
    const firstCell = screen.getAllByRole('button')[0];
    fireEvent.click(firstCell);
    
    expect(mockProps.onCellClick).toHaveBeenCalledWith(0, 0);
  });

  test('prevents clicks on occupied cells', () => {
    const boardWithMove = createEmptyBoard();
    boardWithMove[7][7] = 'human';
    
    render(<GameBoard {...mockProps} board={boardWithMove} />);
    
    // Click on occupied cell should not trigger callback
    const occupiedCell = screen.getByTestId('cell-7-7');
    fireEvent.click(occupiedCell);
    
    expect(mockProps.onCellClick).not.toHaveBeenCalled();
  });
});
```

### AI Algorithm Tests
```typescript
// __tests__/AlphaBetaAI.test.ts
describe('AlphaBetaAI', () => {
  let ai: AlphaBetaAI;

  beforeEach(() => {
    ai = new AlphaBetaAI();
  });

  test('detects winning moves', () => {
    const board = createEmptyBoard();
    
    // Set up near-win for AI (4 in a row)
    board[7][7] = 'ai';
    board[7][8] = 'ai';
    board[7][9] = 'ai';
    board[7][10] = 'ai';
    
    const move = ai.findBestMove(board, 'easy');
    
    // AI should complete the line
    expect(move).toEqual({ row: 7, col: 11 });
  });

  test('blocks human threats', () => {
    const board = createEmptyBoard();
    
    // Human has 4 in a row
    board[5][5] = 'human';
    board[5][6] = 'human';
    board[5][7] = 'human';
    board[5][8] = 'human';
    
    const move = ai.findBestMove(board, 'medium');
    
    // AI should block at either end
    expect([
      { row: 5, col: 4 },
      { row: 5, col: 9 }
    ]).toContainEqual(move);
  });
});
```

### Integration Tests
```typescript
// __tests__/GameFlow.integration.test.tsx
describe('Game Flow Integration', () => {
  test('complete game sequence', async () => {
    // Mock API responses
    const mockGameResponse = {
      success: true,
      data: { id: 1, board: '0'.repeat(225), difficulty: 'medium' }
    };
    
    jest.spyOn(gameService, 'createGame').mockResolvedValue(mockGameResponse);
    
    render(<Game />);
    
    // Start new game
    fireEvent.click(screen.getByText('New Game'));
    fireEvent.click(screen.getByText('Medium'));
    
    await waitFor(() => {
      expect(screen.getByText('Your turn')).toBeInTheDocument();
    });
    
    // Make first move
    const centerCell = screen.getByTestId('cell-7-7');
    fireEvent.click(centerCell);
    
    await waitFor(() => {
      expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
    });
  });
});
```

## 🚀 Build & Deployment

### Development Build
```bash
# Development server with hot reload
yarn start

# Type checking
yarn run tsc --noEmit

# Linting
yarn run eslint src/ --ext .ts,.tsx
```

### Production Build
```bash
# Create optimized production build
yarn build

# Analyze bundle size
yarn run webpack-bundle-analyzer build/static/js/*.js
```

### Environment Configuration
```bash
# .env.development
REACT_APP_API_BASE_URL=http://localhost:3001/api/v1
REACT_APP_ENV=development

# .env.production
REACT_APP_API_BASE_URL=https://api.gomoku.com/api/v1
REACT_APP_ENV=production
```

## 📊 Performance

### Bundle Analysis
```bash
# Current production bundle sizes
main.js        71.25 kB (gzipped)
main.css       6.58 kB (gzipped)
Total          77.83 kB

# Bundle breakdown
React          35.2 kB
AI Algorithm   18.5 kB
Tailwind CSS   12.8 kB
Other          11.33 kB
```

### Optimization Strategies
```typescript
// Code splitting for AI algorithm
const AlphaBetaAI = lazy(() => import('./AlphaBetaAI'));

// Memoized components
const GameBoard = memo(({ board, onCellClick }: GameBoardProps) => {
  // Render logic
});

// Optimized re-renders
const gameControls = useMemo(() => (
  <GameControls 
    onNewGame={handleNewGame}
    onUndo={handleUndo}
    difficulty={difficulty}
  />
), [difficulty, gameStatus]);
```

### Performance Metrics
- **First Contentful Paint**: < 1.2s
- **Time to Interactive**: < 2.5s
- **AI Response Time**: 50-500ms
- **Bundle Load Time**: < 800ms

## 🔧 Development Tools

### VS Code Configuration
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

### ESLint Configuration
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'prefer-const': 'error'
  }
};
```

## 🎯 Future Enhancements

### Planned Features
- **Multiplayer Mode**: Real-time player vs player
- **Game Analytics**: Move analysis and suggestions
- **Theme System**: Multiple board/stone designs
- **Mobile App**: React Native version
- **AI Levels**: Additional difficulty modes

### Technical Debt
- **State Management**: Migrate to Zustand/Redux
- **Component Library**: Extract reusable components
- **Testing**: Increase coverage to 90%+
- **Accessibility**: WCAG 2.1 AA compliance

## 🔗 Resources

- **React Documentation**: [reactjs.org](https://reactjs.org)
- **TypeScript Handbook**: [typescriptlang.org](https://typescriptlang.org)
- **Tailwind CSS**: [tailwindcss.com](https://tailwindcss.com)
- **Testing Library**: [testing-library.com](https://testing-library.com) 