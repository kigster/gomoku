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

  /**
   * Initialize the Gomoku AI with specified difficulty and color
   *
   * @param difficulty - AI skill level: 'easy', 'medium', or 'hard'
   * @param aiColor - Which color the AI plays: 'black' or 'white'
   */
  constructor(
    difficulty: Difficulty = "medium",
    aiColor: "black" | "white" = "white"
  ) {
    this.difficulty = difficulty;

    // Configure search depth based on difficulty level
    // Higher depth = stronger play but slower response
    this.maxDepth = {
      easy: 2, // Shallow search: 1 move ahead for each player
      medium: 4, // Moderate search: up to 2 moves ahead for each player
      hard: 5, // Deep search: up to 2.5 moves ahead with advanced techniques
    }[difficulty];

    // Set which player types the AI controls
    this.aiPlayer = aiColor === "white" ? CellType.WHITE : CellType.BLACK;
    this.humanPlayer = aiColor === "white" ? CellType.BLACK : CellType.WHITE;
  }

  /**
   * Main entry point - find the best move for current board position
   * This is the public interface called by the game component
   *
   * @param board - Current game board state using external format
   * @returns [row, col] coordinates of best move, or null if no moves available
   */
  public findBestMove(board: Player[][]): [number, number] | null {
    // Convert to internal representation for faster processing
    const internalBoard = this.convertToInternalBoard(board);

    // Use appropriate search strategy based on difficulty
    if (this.difficulty === "hard") {
      // Hard mode: Use iterative deepening with time management
      return this.findBestMoveWithIterativeDeepening(internalBoard);
    }

    // Easy/Medium modes: Use standard alpha-beta search at fixed depth
    const result = this.alphaBeta(
      internalBoard,
      this.maxDepth,
      -Infinity,
      Infinity,
      true // AI is maximizing player
    );

    // Return move coordinates or null if no moves found
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
        score: this.evaluateBoard(board, isMaximizingPlayer), // Evaluate from current player's perspective
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
   * Evaluates how good the current position is from the current player's perspective
   *
   * @param board - Current board state
   * @param isMaximizingPlayer - true if evaluating from AI's perspective, false for human's perspective
   * @returns Evaluation score (positive = good for current player, negative = bad)
   */
  private evaluateBoard(
    board: CellType[][],
    isMaximizingPlayer: boolean
  ): number {
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

    // **CRITICAL FIX**: Check for immediate threats that must be addressed
    const immediateAIThreat = this.findImmediateThreat(board, this.aiPlayer);
    const immediateHumanThreat = this.findImmediateThreat(
      board,
      this.humanPlayer
    );

    // Immediate threats get MASSIVE priority (100,000+ points)
    let immediateBonus = 0;
    if (immediateAIThreat !== null) {
      immediateBonus += 100000; // AI can win - highest priority
      console.log("🏆 AI found winning threat at:", immediateAIThreat);
    }
    if (immediateHumanThreat !== null) {
      immediateBonus -= 100000; // Human can win - must defend immediately
      console.log(
        "🛡️ AI detected human threat, must defend at:",
        immediateHumanThreat
      );
    }

    // **TURN-AWARE EVALUATION**: Evaluate from current player's perspective
    // This ensures proper threat assessment based on whose turn it is
    let baseScore: number;
    if (isMaximizingPlayer) {
      // AI's turn: prioritize AI threats and defend against human threats
      // Use aggressive weighting (1.5x) to encourage offensive play when no immediate threats
      baseScore = 1.5 * aiScore - humanScore + immediateBonus;
    } else {
      // Human's turn: prioritize human threats and defend against AI threats
      // From human's perspective, human score is positive, AI score is negative
      baseScore = 1.5 * humanScore - aiScore - immediateBonus; // Note: subtract AI bonus for human perspective
    }

    return baseScore;
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
    const minX = Math.max(x - this.SEARCH_RADIUS, 0); // Leftmost column to check
    const maxX = Math.min(x + this.SEARCH_RADIUS, this.BOARD_SIZE - 1); // Rightmost column to check
    const minY = Math.max(y - this.SEARCH_RADIUS, 0); // Topmost row to check
    const maxY = Math.min(y + this.SEARCH_RADIUS, this.BOARD_SIZE - 1); // Bottom row to check

    const threats: ThreatType[] = []; // Store threats found in each direction

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
      score += this.threatCost[threat]; // Add base threat value
    }

    // Add bonus scores for combination threats (intersecting patterns)
    // These are particularly dangerous in Gomoku (e.g., fork attacks)
    for (let i = 0; i < threats.length; i++) {
      for (let j = i + 1; j < threats.length; j++) {
        score += this.calculateCombinationThreat(threats[i], threats[j]);
      }
    }

    return score; // Return total strategic value of this position
  }

  /**
   * Extract a row of cells in a specific direction around position (x,y)
   * Creates a 1D array representing stones in one direction for easier analysis
   *
   * @param board - Current board state
   * @param x - Center X coordinate
   * @param y - Center Y coordinate
   * @param minX - Minimum X boundary for search
   * @param maxX - Maximum X boundary for search
   * @param minY - Minimum Y boundary for search
   * @param maxY - Maximum Y boundary for search
   * @param direction - Which direction to extract (horizontal, vertical, or diagonal)
   * @returns Array of CellType values representing the line of stones
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
    const rowSize = this.SEARCH_RADIUS * 2 + 1; // Total length of extracted row
    const row: CellType[] = new Array(rowSize).fill(CellType.OUT_OF_BOUNDS); // Initialize with boundaries
    const centerIndex = this.SEARCH_RADIUS; // Position of target square in array

    if (direction === "horizontal") {
      // Extract horizontal line (left-right)
      // Walk right from center
      for (let i = x + 1, index = centerIndex + 1; i <= maxX; i++, index++) {
        row[index] = board[i][y];
      }
      // Walk left from center
      for (let i = x - 1, index = centerIndex - 1; i >= minX; i--, index--) {
        row[index] = board[i][y];
      }
    } else if (direction === "vertical") {
      // Extract vertical line (up-down)
      // Walk down from center
      for (let j = y + 1, index = centerIndex + 1; j <= maxY; j++, index++) {
        row[index] = board[x][j];
      }
      // Walk up from center
      for (let j = y - 1, index = centerIndex - 1; j >= minY; j--, index--) {
        row[index] = board[x][j];
      }
    } else if (direction === "diagonal1") {
      // Extract diagonal line (top-left to bottom-right: \)
      // Walk down-right from center
      for (
        let i = x + 1, j = y + 1, index = centerIndex + 1;
        i <= maxX && j <= maxY;
        i++, j++, index++
      ) {
        row[index] = board[i][j];
      }
      // Walk up-left from center
      for (
        let i = x - 1, j = y - 1, index = centerIndex - 1;
        i >= minX && j >= minY;
        i--, j--, index--
      ) {
        row[index] = board[i][j];
      }
    } else if (direction === "diagonal2") {
      // Extract diagonal line (bottom-left to top-right: /)
      // Walk up-right from center
      for (
        let i = x + 1, j = y - 1, index = centerIndex + 1;
        i <= maxX && j >= minY;
        i++, j--, index++
      ) {
        row[index] = board[i][j];
      }
      // Walk down-left from center
      for (
        let i = x - 1, j = y + 1, index = centerIndex - 1;
        i >= minX && j <= maxY;
        i--, j++, index--
      ) {
        row[index] = board[i][j];
      }
    }

    return row; // Return 1D representation of the line for threat analysis
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
   * When threats intersect at a position, they create powerful combinations
   * These are often decisive in Gomoku (like fork attacks)
   *
   * @param one - First threat type
   * @param two - Second threat type
   * @returns Bonus score for the combination (0 if no special combination)
   */
  private calculateCombinationThreat(one: ThreatType, two: ThreatType): number {
    // THREE + FOUR combination = very powerful (opponent can't block both)
    if (
      (one === ThreatType.THREAT_THREE &&
        (two === ThreatType.THREAT_FOUR ||
          two === ThreatType.THREAT_FOUR_BROKEN)) ||
      (two === ThreatType.THREAT_THREE &&
        (one === ThreatType.THREAT_FOUR ||
          one === ThreatType.THREAT_FOUR_BROKEN))
    ) {
      return this.threatCost[ThreatType.THREAT_THREE_AND_FOUR]; // Major bonus
    }
    // THREE + THREE combination = fork attack (opponent can only block one)
    else if (
      one === ThreatType.THREAT_THREE &&
      two === ThreatType.THREAT_THREE
    ) {
      return this.threatCost[ThreatType.THREAT_THREE_AND_THREE]; // Good bonus
    }

    return 0; // No special combination bonus
  }

  /**
   * Find immediate threats that must be addressed this turn
   * Scans for positions where a player can win on their next move
   * Also detects "four-threats" that create unstoppable winning sequences
   *
   * @param board - Current board state
   * @param player - Player to check threats for
   * @returns Position of immediate threat or null if none found
   */
  private findImmediateThreat(
    board: CellType[][],
    player: CellType
  ): { row: number; col: number } | null {
    // First priority: Direct wins (placing a stone creates 5 in a row)
    for (let i = 0; i < this.BOARD_SIZE; i++) {
      for (let j = 0; j < this.BOARD_SIZE; j++) {
        if (board[i][j] === CellType.EMPTY) {
          // Temporarily place player's stone to test if it creates a win
          board[i][j] = player;

          // Check if this move would create 5+ in a row (immediate win)
          if (this.checkWinAt(board, player, i, j)) {
            board[i][j] = CellType.EMPTY; // Undo the test move
            return { row: i, col: j }; // Found an immediate threat
          }

          board[i][j] = CellType.EMPTY; // Undo the test move
        }
      }
    }

    // Second priority: Four-threats (patterns like _XXXX that create unstoppable wins)
    for (let i = 0; i < this.BOARD_SIZE; i++) {
      for (let j = 0; j < this.BOARD_SIZE; j++) {
        if (board[i][j] === CellType.EMPTY) {
          // Check if this position would create a "straight four" (open on both ends)
          // or other critical four-patterns that need immediate response
          if (this.checkCriticalFourThreat(board, player, i, j)) {
            return { row: i, col: j }; // Found a critical four-threat
          }
        }
      }
    }

    return null; // No immediate threats found
  }

  /**
   * Check if placing a stone creates a critical four-threat that needs immediate response
   * Detects patterns like _XXXX_ (straight four) that guarantee a win next turn
   *
   * @param board - Current board state
   * @param player - Player to check threats for
   * @param row - Row to test
   * @param col - Column to test
   * @returns true if this creates a critical four-threat
   */
  private checkCriticalFourThreat(
    board: CellType[][],
    player: CellType,
    row: number,
    col: number
  ): boolean {
    // Temporarily place the stone
    board[row][col] = player;

    // Check all directions for critical four patterns
    const directions = [
      [0, 1], // Horizontal
      [1, 0], // Vertical
      [1, 1], // Diagonal \
      [1, -1], // Diagonal /
    ];

    for (const [dx, dy] of directions) {
      let count = 1; // Count the stone we just placed
      let leftOpen = false; // Space on left side
      let rightOpen = false; // Space on right side

      // Count in positive direction
      let r = row + dx;
      let c = col + dy;
      while (
        r >= 0 &&
        r < this.BOARD_SIZE &&
        c >= 0 &&
        c < this.BOARD_SIZE &&
        board[r][c] === player
      ) {
        count++;
        r += dx;
        c += dy;
      }
      // Check if there's an open space after the sequence
      if (
        r >= 0 &&
        r < this.BOARD_SIZE &&
        c >= 0 &&
        c < this.BOARD_SIZE &&
        board[r][c] === CellType.EMPTY
      ) {
        rightOpen = true;
      }

      // Count in negative direction
      r = row - dx;
      c = col - dy;
      while (
        r >= 0 &&
        r < this.BOARD_SIZE &&
        c >= 0 &&
        c < this.BOARD_SIZE &&
        board[r][c] === player
      ) {
        count++;
        r -= dx;
        c -= dy;
      }
      // Check if there's an open space before the sequence
      if (
        r >= 0 &&
        r < this.BOARD_SIZE &&
        c >= 0 &&
        c < this.BOARD_SIZE &&
        board[r][c] === CellType.EMPTY
      ) {
        leftOpen = true;
      }

      // Critical patterns that need immediate response:
      // 1. Four in a row with space on both ends (_XXXX_) = unstoppable
      // 2. Four in a row with space on one end (XXXX_) = strong threat
      if (count >= 4 && (leftOpen || rightOpen)) {
        board[row][col] = CellType.EMPTY; // Undo test move
        return true; // Found critical four-threat
      }
    }

    board[row][col] = CellType.EMPTY; // Undo test move
    return false;
  }

  /**
   * Check if placing a stone at a specific position creates a win
   *
   * @param board - Current board state
   * @param player - Player who placed the stone
   * @param row - Row where stone was placed
   * @param col - Column where stone was placed
   * @returns true if this creates 5+ in a row
   */
  private checkWinAt(
    board: CellType[][],
    player: CellType,
    row: number,
    col: number
  ): boolean {
    // Check all four directions from the placed stone
    const directions = [
      [0, 1], // Horizontal
      [1, 0], // Vertical
      [1, 1], // Diagonal \
      [1, -1], // Diagonal /
    ];

    for (const [dx, dy] of directions) {
      let count = 1; // Count the stone we just placed

      // Count in positive direction
      let r = row + dx;
      let c = col + dy;
      while (
        r >= 0 &&
        r < this.BOARD_SIZE &&
        c >= 0 &&
        c < this.BOARD_SIZE &&
        board[r][c] === player
      ) {
        count++;
        r += dx;
        c += dy;
      }

      // Count in negative direction
      r = row - dx;
      c = col - dy;
      while (
        r >= 0 &&
        r < this.BOARD_SIZE &&
        c >= 0 &&
        c < this.BOARD_SIZE &&
        board[r][c] === player
      ) {
        count++;
        r -= dx;
        c -= dy;
      }

      // Check if we have 5 or more in a row
      if (count >= this.NEED_TO_WIN) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate possible moves with smart ordering for better alpha-beta pruning
   * Only considers moves near existing stones to reduce search space
   * Orders moves by evaluation score to improve pruning efficiency
   * Prioritizes defensive moves when immediate threats are detected
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

    // **PRIORITY DEFENSIVE MOVES**: Check for immediate threats first
    const immediateHumanThreat = this.findImmediateThreat(
      board,
      this.humanPlayer
    );
    const immediateAIThreat = this.findImmediateThreat(board, this.aiPlayer);

    // If there's an immediate threat, prioritize those positions
    if (immediateHumanThreat) {
      console.log("🛡️ Prioritizing defense at:", immediateHumanThreat);
      moves.push({
        row: immediateHumanThreat.row,
        col: immediateHumanThreat.col,
        score: 200000, // Massive priority for defensive moves
      });
    }

    if (immediateAIThreat) {
      console.log("🏆 Prioritizing winning move at:", immediateAIThreat);
      moves.push({
        row: immediateAIThreat.row,
        col: immediateAIThreat.col,
        score: 300000, // Even higher priority for winning moves
      });
    }

    // Generate other moves near existing stones
    // This greatly reduces the search space while maintaining move quality
    for (let i = 0; i < this.BOARD_SIZE; i++) {
      for (let j = 0; j < this.BOARD_SIZE; j++) {
        // Only consider empty positions that have neighboring stones
        if (board[i][j] === CellType.EMPTY && this.hasNeighbor(board, i, j)) {
          // Skip if this move is already added as a priority move
          const isAlreadyAdded = moves.some(
            (move) => move.row === i && move.col === j
          );
          if (isAlreadyAdded) continue;

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
    // Top 20 moves usually contain the best options (priority moves are always included)
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
    for (let dr = -1; dr <= 1; dr++) {
      // Row offset: -1, 0, 1
      for (let dc = -1; dc <= 1; dc++) {
        // Column offset: -1, 0, 1
        if (dr === 0 && dc === 0) continue; // Skip the center position itself

        const nr = row + dr; // Neighbor row coordinate
        const nc = col + dc; // Neighbor column coordinate

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
   * Check if board is completely empty (no stones placed)
   * Used to determine optimal opening move placement
   *
   * @param board - Current board state to check
   * @returns true if no stones are placed anywhere on the board
   */
  private isBoardEmpty(board: CellType[][]): boolean {
    for (let i = 0; i < this.BOARD_SIZE; i++) {
      for (let j = 0; j < this.BOARD_SIZE; j++) {
        if (board[i][j] !== CellType.EMPTY) {
          return false; // Found a stone, board is not empty
        }
      }
    }
    return true; // No stones found, board is empty
  }

  /**
   * Check if game is over (terminal node in search tree)
   * Used by alpha-beta search to identify leaf nodes
   *
   * @param board - Current board state
   * @returns true if game has ended (win or draw)
   */
  private isGameOver(board: CellType[][]): boolean {
    // Game ends when someone wins OR board is completely full
    return this.checkForWin(board) !== null || this.isBoardFull(board);
  }

  /**
   * Check if board is completely full (all positions occupied)
   * Used to detect draw conditions
   *
   * @param board - Current board state
   * @returns true if no empty positions remain
   */
  private isBoardFull(board: CellType[][]): boolean {
    for (let i = 0; i < this.BOARD_SIZE; i++) {
      for (let j = 0; j < this.BOARD_SIZE; j++) {
        if (board[i][j] === CellType.EMPTY) {
          return false; // Found empty position, board not full
        }
      }
    }
    return true; // No empty positions found, board is full
  }

  /**
   * Check for win condition (5 or more stones in a row)
   * Searches all positions and directions for winning patterns
   *
   * @param board - Current board state to analyze
   * @returns CellType of winner (BLACK/WHITE) or null if no winner
   */
  private checkForWin(board: CellType[][]): CellType | null {
    // Four directions to check: horizontal, vertical, and both diagonals
    const directions = [
      [0, 1], // Horizontal (left-right)
      [1, 0], // Vertical (up-down)
      [1, 1], // Diagonal (top-left to bottom-right)
      [1, -1], // Diagonal (top-right to bottom-left)
    ];

    // Check every position as potential start of winning sequence
    for (let i = 0; i < this.BOARD_SIZE; i++) {
      for (let j = 0; j < this.BOARD_SIZE; j++) {
        const cell = board[i][j];
        if (cell === CellType.EMPTY) continue; // Skip empty positions

        // Check each direction from this position
        for (const [dx, dy] of directions) {
          let count = 1; // Count starts at 1 for current position

          // Count stones in positive direction
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

          // Count stones in negative direction
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

          // Check if we found 5 or more in a row
          if (count >= 5) {
            return cell; // Return winner (BLACK or WHITE)
          }
        }
      }
    }

    return null; // No winner found
  }

  /**
   * Convert external Player board to internal CellType board
   * Transforms the React component's string-based board representation
   * into the AI's numeric representation for faster processing
   *
   * @param board - External board using "black"/"white"/null
   * @returns Internal board using numeric CellType values
   */
  private convertToInternalBoard(board: Player[][]): CellType[][] {
    return board.map((row) =>
      row.map((cell) => {
        if (cell === "black") return CellType.BLACK; // Convert to 1
        if (cell === "white") return CellType.WHITE; // Convert to -1
        return CellType.EMPTY; // Convert to 0
      })
    );
  }
}
