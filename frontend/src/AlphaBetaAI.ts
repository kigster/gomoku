// Advanced Gomoku AI with Alpha-Beta Pruning
// Based on heuristics from: https://raw.githubusercontent.com/kigster/gomoku-cpp/refs/heads/master/src/game/heuristics/heuristics.c

// Player types: represents stone colors or empty positions
type Player = "black" | "white" | null;

// AI difficulty levels that control search depth and time limits
type Difficulty = "easy" | "medium" | "hard";

/**
 * Threat types from competitive Gomoku analysis
 * These represent different patterns and their strategic value
 */
enum ThreatType {
  THREAT_NOTHING = 0, // No threat detected
  THREAT_FIVE = 1, // 5 in a row - instant win
  THREAT_STRAIGHT_FOUR = 2, // 4 in a row with space on both ends (unstoppable)
  THREAT_THREE = 3, // 3 in a row with space on both ends (strong)
  THREAT_FOUR = 4, // 4 in a row with space on one end
  THREAT_FOUR_BROKEN = 5, // 4 stones with a gap, still threatening
  THREAT_THREE_BROKEN = 6, // 3 stones with a gap
  THREAT_TWO = 7, // 2 in a row with potential
  THREAT_NEAR_ENEMY = 8, // Adjacent to opponent stone (defensive)
  THREAT_THREE_AND_FOUR = 9, // Combination: 3-threat intersecting with 4-threat
  THREAT_THREE_AND_THREE = 10, // Combination: two 3-threats intersecting
  THREAT_THREE_AND_THREE_BROKEN = 11, // Combination with broken patterns
}

/**
 * Internal cell representation for efficient processing
 * Uses numeric values for faster comparisons
 */
enum CellType {
  EMPTY = 0, // Empty intersection
  BLACK = 1, // Black stone (positive value)
  WHITE = -1, // White stone (negative value for easy opponent detection)
  OUT_OF_BOUNDS = 32, // Beyond board boundaries (large value to avoid conflicts)
}

/**
 * Represents a potential move with its evaluation
 */
interface Move {
  row: number; // Board row (0-18)
  col: number; // Board column (0-18)
  score: number; // Heuristic evaluation score for move ordering
}

/**
 * Result of alpha-beta search at a given depth
 */
interface EvaluationResult {
  score: number; // Best achievable score from this position
  bestMove: Move | null; // Best move found (null if no legal moves)
}

export class AlphaBetaGomokuAI {
  // Board constants
  private readonly BOARD_SIZE = 19; // Standard Gomoku board size
  private readonly SEARCH_RADIUS = 4; // How far to look around existing stones
  private readonly NEED_TO_WIN = 5; // Stones needed in a row to win
  private readonly NUM_DIRECTIONS = 4; // Horizontal, vertical, and 2 diagonals

  /**
   * Threat evaluation scoring system
   * Higher scores = more valuable threats
   * Based on competitive Gomoku analysis
   */
  private readonly threatCost: { [key in ThreatType]: number } = {
    [ThreatType.THREAT_NOTHING]: 0, // No value
    [ThreatType.THREAT_FIVE]: 100000, // Game over - highest priority
    [ThreatType.THREAT_STRAIGHT_FOUR]: 50000, // Unstoppable threat
    [ThreatType.THREAT_FOUR]: 20000, // Strong threat requiring response
    [ThreatType.THREAT_THREE_AND_FOUR]: 10000, // Powerful combination
    [ThreatType.THREAT_THREE_AND_THREE]: 7000, // Fork threat
    [ThreatType.THREAT_THREE_AND_THREE_BROKEN]: 3000, // Weaker fork
    [ThreatType.THREAT_THREE]: 1000, // Good attacking move
    [ThreatType.THREAT_FOUR_BROKEN]: 900, // Potential four-threat
    [ThreatType.THREAT_THREE_BROKEN]: 300, // Potential three-threat
    [ThreatType.THREAT_TWO]: 20, // Early game development
    [ThreatType.THREAT_NEAR_ENEMY]: 5, // Defensive positioning
  };

  // AI configuration
  private maxDepth: number; // Maximum search depth for this difficulty
  private difficulty: Difficulty; // Current difficulty setting
  private aiPlayer: CellType; // Which player the AI is (BLACK or WHITE)
  private humanPlayer: CellType; // Which player the human is (opposite of AI)

  constructor(
    difficulty: Difficulty = "medium",
    aiColor: "black" | "white" = "white"
  ) {
    this.difficulty = difficulty;

    // Set search depth based on difficulty
    this.maxDepth = {
      easy: 2, // Looks 1 move ahead for both AI and opponent
      medium: 4, // Looks up to 4 moves ahead for both players
      hard: 5, // Deeper search with iterative deepening and advanced heuristics
    }[difficulty];

    this.aiPlayer = aiColor === "white" ? CellType.WHITE : CellType.BLACK;
    this.humanPlayer = aiColor === "white" ? CellType.BLACK : CellType.WHITE;
  }

  /**
   * Main entry point - finds the best move using Alpha-Beta pruning
   */
  public findBestMove(board: Player[][]): [number, number] | null {
    const internalBoard = this.convertToInternalBoard(board);

    // For hard difficulty, use iterative deepening to try to solve optimally
    if (this.difficulty === "hard") {
      return this.findBestMoveWithIterativeDeepening(internalBoard);
    }

    // For easy and medium, use fixed depth search
    const result = this.alphaBeta(
      internalBoard,
      this.maxDepth,
      -Infinity,
      Infinity,
      true // AI is maximizing player
    );

    return result.bestMove ? [result.bestMove.row, result.bestMove.col] : null;
  }

  /**
   * Iterative deepening search for hard difficulty - tries to solve the game
   * Searches depth 1, then 2, then 3, etc. until time limit reached
   * This provides best results within time constraints
   */
  private findBestMoveWithIterativeDeepening(
    board: CellType[][]
  ): [number, number] | null {
    const startTime = Date.now(); // Track thinking time
    const timeLimit = 3000; // 3 seconds max thinking time
    let bestMove: Move | null = null; // Best move found so far
    let bestScore = -Infinity; // Best score achieved

    console.log("🧠 Hard AI: Attempting to solve the game...");

    // Iterative deepening: start shallow and go deeper
    // This ensures we always have a move even if time runs out
    for (let depth = 1; depth <= this.maxDepth; depth++) {
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;

      // Stop if we're running out of time
      if (elapsedTime > timeLimit) {
        console.log(`⏰ Hard AI: Time limit reached at depth ${depth - 1}`);
        break;
      }

      // Search at current depth
      const result = this.alphaBeta(board, depth, -Infinity, Infinity, true);

      if (result.bestMove) {
        bestMove = result.bestMove; // Update best move
        bestScore = result.score; // Update best score

        console.log(`🔍 Hard AI: Depth ${depth}, Score: ${result.score}`);

        // If we found a winning move, no need to search deeper
        if (result.score >= 90000) {
          // Close to THREAT_FIVE score
          console.log(`🏆 Hard AI: Found winning move at depth ${depth}!`);
          break;
        }
      }

      // If we're finding forced losses, try to go deeper to find defense
      if (result.score <= -90000) {
        console.log(`⚠️ Hard AI: Detecting forced loss, searching deeper...`);
        continue;
      }
    }

    const totalTime = Date.now() - startTime;

    // Provide human-readable move quality assessment
    let moveQuality = "Solid";
    if (bestScore >= 90000) moveQuality = "💥 WINNING";
    else if (bestScore >= 5000) moveQuality = "🔥 Excellent";
    else if (bestScore >= 1000) moveQuality = "⭐ Strong";
    else if (bestScore >= 100) moveQuality = "👍 Good";
    else if (bestScore <= -90000) moveQuality = "😰 Defensive";

    console.log(
      `🎯 Hard AI: Completed in ${totalTime}ms | Move quality: ${moveQuality} (Score: ${bestScore})`
    );

    return bestMove ? [bestMove.row, bestMove.col] : null;
  }

  /**
   * Alpha-Beta pruning implementation - the core search algorithm
   * Searches game tree while pruning impossible branches for efficiency
   *
   * @param board - Current board state
   * @param depth - How many moves ahead to search
   * @param alpha - Best score maximizing player can guarantee (lower bound)
   * @param beta - Best score minimizing player can guarantee (upper bound)
   * @param isMaximizingPlayer - true if AI's turn, false if opponent's turn
   */
  private alphaBeta(
    board: CellType[][],
    depth: number,
    alpha: number,
    beta: number,
    isMaximizingPlayer: boolean
  ): EvaluationResult {
    // Base case: reached search depth limit or game is over
    if (depth === 0 || this.isGameOver(board)) {
      return {
        score: this.evaluateBoard(board), // Evaluate current position
        bestMove: null, // No move to return at leaf nodes
      };
    }

    // Generate all legal moves, ordered by preliminary evaluation
    const moves = this.generateMoves(board);
    let bestMove: Move | null = null;

    if (isMaximizingPlayer) {
      // AI's turn - trying to maximize score
      let maxScore = -Infinity; // Worst possible score initially

      for (const move of moves) {
        // Try this move on the board
        board[move.row][move.col] = this.aiPlayer;

        // Recursively evaluate resulting position
        const result = this.alphaBeta(board, depth - 1, alpha, beta, false);

        // Undo the move (backtrack)
        board[move.row][move.col] = CellType.EMPTY;

        // Update best move if this one is better
        if (result.score > maxScore) {
          maxScore = result.score;
          bestMove = { ...move, score: maxScore };
        }

        // Alpha-beta pruning: update alpha (best guaranteed score for AI)
        alpha = Math.max(alpha, result.score);

        // Beta cutoff: opponent won't allow this branch (prune)
        if (beta <= alpha) {
          break; // This branch is too good for AI, opponent won't choose it
        }
      }

      return { score: maxScore, bestMove };
    } else {
      // Opponent's turn - trying to minimize AI's score
      let minScore = Infinity; // Best possible score initially

      for (const move of moves) {
        // Try opponent move on the board
        board[move.row][move.col] = this.humanPlayer;

        // Recursively evaluate resulting position
        const result = this.alphaBeta(board, depth - 1, alpha, beta, true);

        // Undo the move (backtrack)
        board[move.row][move.col] = CellType.EMPTY;

        // Update best move if this one is worse for AI
        if (result.score < minScore) {
          minScore = result.score;
          bestMove = { ...move, score: minScore };
        }

        // Alpha-beta pruning: update beta (best guaranteed score for opponent)
        beta = Math.min(beta, result.score);

        // Alpha cutoff: AI won't allow this branch (prune)
        if (beta <= alpha) {
          break; // This branch is too bad for AI, AI won't choose previous move
        }
      }

      return { score: minScore, bestMove };
    }
  }

  /**
   * Board evaluation function based on C heuristics
   * Evaluates how good the current position is for the AI
   * Positive scores favor AI, negative scores favor opponent
   */
  private evaluateBoard(board: CellType[][]): number {
    let aiScore = 0; // Total threat value for AI
    let humanScore = 0; // Total threat value for human

    // Evaluate all empty positions on the board
    // Each empty position gets scored based on threats it could create
    for (let i = 0; i < this.BOARD_SIZE; i++) {
      for (let j = 0; j < this.BOARD_SIZE; j++) {
        if (board[i][j] === CellType.EMPTY) {
          // Calculate potential score for AI placing a stone here
          aiScore += this.calculateScoreAt(board, this.aiPlayer, i, j);

          // Calculate potential score for human placing a stone here
          humanScore += this.calculateScoreAt(board, this.humanPlayer, i, j);
        }
      }
    }

    // Weight AI moves higher (1.5x) to encourage aggressive play
    // This makes the AI slightly favor attacking over pure defense
    return 1.5 * aiScore - humanScore;
  }

  /**
   * Calculate score at a specific position (port of calc_score_at from C)
   * This is the core evaluation function that determines how valuable placing a stone would be
   * 
   * @param board - Current board state
   * @param player - Which player we're calculating for (AI or human)
   * @param x - Row coordinate to evaluate
   * @param y - Column coordinate to evaluate
   * @returns Total threat score for placing a stone at this position
   */
  private calculateScoreAt(
    board: CellType[][],
    player: CellType,
    x: number,
    y: number
  ): number {
    // Define search area around the target position
    // This limits analysis to relevant nearby stones
    const minX = Math.max(x - this.SEARCH_RADIUS, 0);                    // Leftmost column to check
    const maxX = Math.min(x + this.SEARCH_RADIUS, this.BOARD_SIZE - 1);  // Rightmost column to check
    const minY = Math.max(y - this.SEARCH_RADIUS, 0);                    // Topmost row to check
    const maxY = Math.min(y + this.SEARCH_RADIUS, this.BOARD_SIZE - 1);  // Bottom row to check

    const threats: ThreatType[] = [];  // Store threats found in each direction

    // Analyze all 4 directions for threats: horizontal, vertical, and 2 diagonals
    // Each direction is analyzed independently, then combined

    // 1. Horizontal analysis (left-right)
    const horizontalRow = this.extractRow(
      board,
      x,
      y,
      minX,
      maxX,
      minY,
      maxY,
      "horizontal"
    );
    threats.push(this.calculateThreatInOneDimension(horizontalRow, player));

    // 2. Vertical analysis (up-down)
    const verticalRow = this.extractRow(
      board,
      x,
      y,
      minX,
      maxX,
      minY,
      maxY,
      "vertical"
    );
    threats.push(this.calculateThreatInOneDimension(verticalRow, player));

    // 3. Diagonal analysis (top-left to bottom-right)
    const diagonal1Row = this.extractRow(
      board,
      x,
      y,
      minX,
      maxX,
      minY,
      maxY,
      "diagonal1"
    );
    threats.push(this.calculateThreatInOneDimension(diagonal1Row, player));

    // 4. Diagonal analysis (bottom-left to top-right)
    const diagonal2Row = this.extractRow(
      board,
      x,
      y,
      minX,
      maxX,
      minY,
      maxY,
      "diagonal2"
    );
    threats.push(this.calculateThreatInOneDimension(diagonal2Row, player));

    // Calculate total score from individual threats in each direction
    let score = 0;
    for (const threat of threats) {
      score += this.threatCost[threat];  // Add base threat value
    }

    // Add bonus scores for combination threats (intersecting patterns)
    // These are particularly dangerous in Gomoku (e.g., fork attacks)
    for (let i = 0; i < threats.length; i++) {
      for (let j = i + 1; j < threats.length; j++) {
        score += this.calculateCombinationThreat(threats[i], threats[j]);
      }
    }

    return score;  // Return total strategic value of this position
  }

  /**
   * Extract a row of cells in a specific direction around position (x,y)
   */
  private extractRow(
    board: CellType[][],
    x: number,
    y: number,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    direction: "horizontal" | "vertical" | "diagonal1" | "diagonal2"
  ): CellType[] {
    const rowSize = this.SEARCH_RADIUS * 2 + 1;
    const row: CellType[] = new Array(rowSize).fill(CellType.OUT_OF_BOUNDS);
    const centerIndex = this.SEARCH_RADIUS;

    if (direction === "horizontal") {
      // Walk horizontally
      for (let i = x + 1, index = centerIndex + 1; i <= maxX; i++, index++) {
        row[index] = board[i][y];
      }
      for (let i = x - 1, index = centerIndex - 1; i >= minX; i--, index--) {
        row[index] = board[i][y];
      }
    } else if (direction === "vertical") {
      // Walk vertically
      for (let j = y + 1, index = centerIndex + 1; j <= maxY; j++, index++) {
        row[index] = board[x][j];
      }
      for (let j = y - 1, index = centerIndex - 1; j >= minY; j--, index--) {
        row[index] = board[x][j];
      }
    } else if (direction === "diagonal1") {
      // Walk diagonally (top-left to bottom-right)
      for (
        let i = x + 1, j = y + 1, index = centerIndex + 1;
        i <= maxX && j <= maxY;
        i++, j++, index++
      ) {
        row[index] = board[i][j];
      }
      for (
        let i = x - 1, j = y - 1, index = centerIndex - 1;
        i >= minX && j >= minY;
        i--, j--, index--
      ) {
        row[index] = board[i][j];
      }
    } else if (direction === "diagonal2") {
      // Walk diagonally (bottom-left to top-right)
      for (
        let i = x + 1, j = y - 1, index = centerIndex + 1;
        i <= maxX && j >= minY;
        i++, j--, index++
      ) {
        row[index] = board[i][j];
      }
      for (
        let i = x - 1, j = y + 1, index = centerIndex - 1;
        i >= minX && j <= maxY;
        i--, j++, index--
      ) {
        row[index] = board[i][j];
      }
    }

    return row;
  }

  /**
   * Calculate threat in one dimension (port of calc_threat_in_one_dimension from C)
   * Analyzes a line of stones to determine what type of threat exists
   *
   * @param row - Array representing stones in one direction from center position
   * @param player - Which player we're analyzing threats for
   */
  private calculateThreatInOneDimension(
    row: CellType[],
    player: CellType
  ): ThreatType {
    // Counters for threat analysis
    let playerSquareCount = 1; // Total player stones (including center)
    let playerContiguousSquareCount = 1; // Consecutive stones without gaps
    let enemyCount = 0; // Enemy stones encountered
    let rightHoleCount = 0; // Empty spaces to the right
    let leftHoleCount = 0; // Empty spaces to the left

    const centerIndex = this.SEARCH_RADIUS; // Center position in the extracted row

    // Walk forward from center position (right side analysis)
    let lastSquare = player; // Track previous square for gap detection
    for (
      let i = centerIndex + 1;
      i < row.length && row[i] !== CellType.OUT_OF_BOUNDS;
      i++
    ) {
      if (row[i] === player) {
        playerSquareCount++; // Found another player stone
        if (rightHoleCount === 0) {
          // If no gaps yet, extend contiguous count
          playerContiguousSquareCount++;
        }
      } else if (row[i] === CellType.EMPTY) {
        if (lastSquare === CellType.EMPTY) break; // Two gaps in a row - stop analyzing
        rightHoleCount++; // Count this gap
      } else {
        // Enemy stone encountered - threat is blocked
        enemyCount++;
        break;
      }
      lastSquare = row[i];
    }

    // Walk backward from center position (left side analysis)
    lastSquare = player;
    for (
      let i = centerIndex - 1;
      i >= 0 && row[i] !== CellType.OUT_OF_BOUNDS;
      i--
    ) {
      if (row[i] === player) {
        playerSquareCount++; // Found another player stone
        if (leftHoleCount === 0) {
          // If no gaps yet, extend contiguous count
          playerContiguousSquareCount++;
        }
      } else if (row[i] === CellType.EMPTY) {
        if (lastSquare === CellType.EMPTY) break; // Two gaps in a row - stop analyzing
        leftHoleCount++; // Count this gap
      } else {
        // Enemy stone encountered - threat is blocked
        enemyCount++;
        break;
      }
      lastSquare = row[i];
    }

    // Calculate total pattern metrics
    const holes = leftHoleCount + rightHoleCount; // Total gaps in pattern
    const total = holes + playerSquareCount; // Total length of pattern

    // Determine threat level based on pattern analysis
    // Priority order: most dangerous threats first

    if (playerContiguousSquareCount >= this.NEED_TO_WIN) {
      return ThreatType.THREAT_FIVE; // 5+ in a row = immediate win
    } else if (
      playerContiguousSquareCount === 4 &&
      rightHoleCount > 0 &&
      leftHoleCount > 0
    ) {
      return ThreatType.THREAT_STRAIGHT_FOUR; // 4 with space on both ends = unstoppable
    } else if (
      playerContiguousSquareCount === 4 &&
      (rightHoleCount > 0 || leftHoleCount > 0)
    ) {
      return ThreatType.THREAT_FOUR; // 4 with space on one end = strong threat
    } else if (
      playerContiguousSquareCount === 3 &&
      rightHoleCount > 0 &&
      leftHoleCount > 0
    ) {
      return ThreatType.THREAT_THREE; // 3 with space on both ends = good threat
    } else if (
      playerSquareCount >= 4 &&
      (rightHoleCount > 0 || leftHoleCount > 0) &&
      total >= 5
    ) {
      return ThreatType.THREAT_FOUR_BROKEN; // 4 stones with gaps = potential threat
    } else if (
      playerSquareCount >= 3 &&
      (rightHoleCount > 0 || leftHoleCount > 0) &&
      total >= 5
    ) {
      return ThreatType.THREAT_THREE_BROKEN; // 3 stones with gaps = weaker threat
    } else if (
      playerContiguousSquareCount >= 2 &&
      (rightHoleCount > 0 || leftHoleCount > 0) &&
      total >= 4
    ) {
      return ThreatType.THREAT_TWO; // 2 in a row with potential = early development
    } else if (
      playerContiguousSquareCount >= 1 &&
      (rightHoleCount === 0 || leftHoleCount === 0) &&
      enemyCount > 0
    ) {
      return ThreatType.THREAT_NEAR_ENEMY; // Adjacent to enemy = defensive value
    }

    return ThreatType.THREAT_NOTHING; // No significant threat detected
  }

  /**
   * Calculate combination threat scores (from C implementation)
   */
  private calculateCombinationThreat(one: ThreatType, two: ThreatType): number {
    if (
      (one === ThreatType.THREAT_THREE &&
        (two === ThreatType.THREAT_FOUR ||
          two === ThreatType.THREAT_FOUR_BROKEN)) ||
      (two === ThreatType.THREAT_THREE &&
        (one === ThreatType.THREAT_FOUR ||
          one === ThreatType.THREAT_FOUR_BROKEN))
    ) {
      return this.threatCost[ThreatType.THREAT_THREE_AND_FOUR];
    } else if (
      one === ThreatType.THREAT_THREE &&
      two === ThreatType.THREAT_THREE
    ) {
      return this.threatCost[ThreatType.THREAT_THREE_AND_THREE];
    }
    return 0;
  }

  /**
   * Generate possible moves with smart ordering for better alpha-beta pruning
   * Only considers moves near existing stones to reduce search space
   * Orders moves by evaluation score to improve pruning efficiency
   */
  private generateMoves(board: CellType[][]): Move[] {
    const moves: Move[] = [];
    const centerX = Math.floor(this.BOARD_SIZE / 2); // Board center X coordinate
    const centerY = Math.floor(this.BOARD_SIZE / 2); // Board center Y coordinate

    // Special case: if board is completely empty, start in center
    // This is the optimal opening move in Gomoku
    if (
      board[centerX][centerY] === CellType.EMPTY &&
      this.isBoardEmpty(board)
    ) {
      return [{ row: centerX, col: centerY, score: 0 }];
    }

    // Generate moves only near existing stones
    // This greatly reduces the search space while maintaining move quality
    for (let i = 0; i < this.BOARD_SIZE; i++) {
      for (let j = 0; j < this.BOARD_SIZE; j++) {
        // Only consider empty positions that have neighboring stones
        if (board[i][j] === CellType.EMPTY && this.hasNeighbor(board, i, j)) {
          // Calculate preliminary score for move ordering
          // Better moves will be searched first, improving alpha-beta pruning
          const score = this.calculateScoreAt(board, this.aiPlayer, i, j);
          moves.push({ row: i, col: j, score });
        }
      }
    }

    // Sort moves by score (highest first) for optimal alpha-beta pruning
    // This move ordering is crucial for pruning efficiency
    moves.sort((a, b) => b.score - a.score);

    // Limit number of moves to keep search tractable
    // Top 20 moves usually contain the best options
    return moves.slice(0, 20);
  }

  /**
   * Check if a position has neighboring stones (within 1 square distance)
   * Used to limit move generation to relevant areas of the board
   * 
   * @param board - Current board state
   * @param row - Row to check
   * @param col - Column to check
   * @returns true if there's at least one non-empty neighbor
   */
  private hasNeighbor(board: CellType[][], row: number, col: number): boolean {
    // Check all 8 adjacent squares (including diagonals)
    for (let dr = -1; dr <= 1; dr++) {      // Row offset: -1, 0, 1
      for (let dc = -1; dc <= 1; dc++) {    // Column offset: -1, 0, 1
        if (dr === 0 && dc === 0) continue; // Skip the center position itself
        
        const nr = row + dr;                 // Neighbor row coordinate
        const nc = col + dc;                 // Neighbor column coordinate
        
        // Check if neighbor is within board bounds
        if (
          nr >= 0 &&
          nr < this.BOARD_SIZE &&
          nc >= 0 &&
          nc < this.BOARD_SIZE
        ) {
          // If we find any non-empty neighbor, this position is relevant
          if (board[nr][nc] !== CellType.EMPTY) {
            return true;
          }
        }
      }
    }
    return false; // No neighbors found - position is isolated
  }

  /**
   * Check if board is empty
   */
  private isBoardEmpty(board: CellType[][]): boolean {
    for (let i = 0; i < this.BOARD_SIZE; i++) {
      for (let j = 0; j < this.BOARD_SIZE; j++) {
        if (board[i][j] !== CellType.EMPTY) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Check if game is over (someone won or board full)
   */
  private isGameOver(board: CellType[][]): boolean {
    // Check for wins or full board
    return this.checkForWin(board) !== null || this.isBoardFull(board);
  }

  /**
   * Check if board is full
   */
  private isBoardFull(board: CellType[][]): boolean {
    for (let i = 0; i < this.BOARD_SIZE; i++) {
      for (let j = 0; j < this.BOARD_SIZE; j++) {
        if (board[i][j] === CellType.EMPTY) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Check for win condition
   */
  private checkForWin(board: CellType[][]): CellType | null {
    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];

    for (let i = 0; i < this.BOARD_SIZE; i++) {
      for (let j = 0; j < this.BOARD_SIZE; j++) {
        const cell = board[i][j];
        if (cell === CellType.EMPTY) continue;

        for (const [dx, dy] of directions) {
          let count = 1;

          // Check positive direction
          let x = i + dx,
            y = j + dy;
          while (
            x >= 0 &&
            x < this.BOARD_SIZE &&
            y >= 0 &&
            y < this.BOARD_SIZE &&
            board[x][y] === cell
          ) {
            count++;
            x += dx;
            y += dy;
          }

          // Check negative direction
          x = i - dx;
          y = j - dy;
          while (
            x >= 0 &&
            x < this.BOARD_SIZE &&
            y >= 0 &&
            y < this.BOARD_SIZE &&
            board[x][y] === cell
          ) {
            count++;
            x -= dx;
            y -= dy;
          }

          if (count >= 5) {
            return cell;
          }
        }
      }
    }

    return null;
  }

  /**
   * Convert external board format to internal representation
   */
  private convertToInternalBoard(board: Player[][]): CellType[][] {
    return board.map((row) =>
      row.map((cell) => {
        if (cell === "black") return CellType.BLACK;
        if (cell === "white") return CellType.WHITE;
        return CellType.EMPTY;
      })
    );
  }
}
