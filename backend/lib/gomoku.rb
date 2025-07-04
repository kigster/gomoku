# Gomoku Minimax Algorithm with Alpha-Beta Pruning in Ruby

class GomokuBoard
EMPTY = 0
BLACK = 1
WHITE = 2
BOARD_SIZE = 15

attr_reader :board, :last_move

def initialize
@board = Array.new(BOARD_SIZE) { Array.new(BOARD_SIZE, EMPTY) }
@last_move = nil
end

def make_move(row, col, player)
return false if !valid_move?(row, col)

```
new_board = self.dup
new_board.board[row][col] = player
new_board.instance_variable_set(:@last_move, [row, col])
new_board
```

end

def valid_move?(row, col)
row.between?(0, BOARD_SIZE - 1) &&
col.between?(0, BOARD_SIZE - 1) &&
@board[row][col] == EMPTY
end

def get_legal_moves
moves = []
(0…BOARD_SIZE).each do |row|
(0…BOARD_SIZE).each do |col|
moves << [row, col] if @board[row][col] == EMPTY
end
end
moves
end

def game_over?
has_winner? || board_full?
end

def has_winner?
return false if @last_move.nil?

```
row, col = @last_move
player = @board[row][col]
return false if player == EMPTY

# Check all four directions from the last move
directions = [[0, 1], [1, 0], [1, 1], [1, -1]]
directions.any? { |dr, dc| count_line(row, col, dr, dc, player) >= 5 }
```

end

def board_full?
@board.all? { |row| row.none? { |cell| cell == EMPTY } }
end

def dup
new_board = GomokuBoard.allocate
new_board.instance_variable_set(:@board, @board.map(&:dup))
new_board.instance_variable_set(:@last_move, @last_move&.dup)
new_board
end

def [](row, col)
return nil if !row.between?(0, BOARD_SIZE - 1) || !col.between?(0, BOARD_SIZE - 1)
@board[row][col]
end

def []=(row, col, value)
@board[row][col] = value if row.between?(0, BOARD_SIZE - 1) && col.between?(0, BOARD_SIZE - 1)
end

private

def count_line(row, col, dr, dc, player)
count = 1 # Count the stone at (row, col)

```
# Count in positive direction
r, c = row + dr, col + dc
while r.between?(0, BOARD_SIZE - 1) && c.between?(0, BOARD_SIZE - 1) && @board[r][c] == player
  count += 1
  r, c = r + dr, c + dc
end

# Count in negative direction
r, c = row - dr, col - dc
while r.between?(0, BOARD_SIZE - 1) && c.between?(0, BOARD_SIZE - 1) && @board[r][c] == player
  count += 1
  r, c = r - dr, c - dc
end

count
```

end
end

class GomokuEvaluator
WIN_SCORE = 1_000_000
LOSE_SCORE = -1_000_000

# Pattern scores

SCORES = {
five: 1_000_000,        # Five in a row (win)
open_four: 100_000,     # Open four (immediate win threat)
four: 10_000,           # Blocked four
open_three: 1_000,      # Open three (two-move win threat)
three: 100,             # Blocked three
open_two: 10,           # Open two
two: 1                  # Blocked two
}

def self.evaluate(board, player)
return WIN_SCORE if board.has_winner? && board.last_move && board[*board.last_move] == player
return LOSE_SCORE if board.has_winner? && board.last_move && board[*board.last_move] != player
return 0 if board.board_full?

```
score = 0
opponent = player == GomokuBoard::BLACK ? GomokuBoard::WHITE : GomokuBoard::BLACK

# Evaluate all positions on the board
(0...GomokuBoard::BOARD_SIZE).each do |row|
  (0...GomokuBoard::BOARD_SIZE).each do |col|
    next if board[row, col] == GomokuBoard::EMPTY

    current_player = board[row, col]
    multiplier = current_player == player ? 1 : -1

    # Check all four directions
    [[0, 1], [1, 0], [1, 1], [1, -1]].each do |dr, dc|
      pattern_score = evaluate_line(board, row, col, dr, dc, current_player)
      score += pattern_score * multiplier
    end
  end
end

score
```

end

private

def self.evaluate_line(board, row, col, dr, dc, player)
return 0 if board[row, col] != player

```
# Count consecutive stones and check for openings
length = 1
open_ends = 0

# Check positive direction
pos_r, pos_c = row + dr, col + dc
while pos_r.between?(0, GomokuBoard::BOARD_SIZE - 1) && 
      pos_c.between?(0, GomokuBoard::BOARD_SIZE - 1) && 
      board[pos_r, pos_c] == player
  length += 1
  pos_r, pos_c = pos_r + dr, pos_c + dc
end

# Check if positive end is open
if pos_r.between?(0, GomokuBoard::BOARD_SIZE - 1) && 
   pos_c.between?(0, GomokuBoard::BOARD_SIZE - 1) && 
   board[pos_r, pos_c] == GomokuBoard::EMPTY
  open_ends += 1
end

# Check negative direction
neg_r, neg_c = row - dr, col - dc
while neg_r.between?(0, GomokuBoard::BOARD_SIZE - 1) && 
      neg_c.between?(0, GomokuBoard::BOARD_SIZE - 1) && 
      board[neg_r, neg_c] == player
  length += 1
  neg_r, neg_c = neg_r - dr, neg_c - dc
end

# Check if negative end is open
if neg_r.between?(0, GomokuBoard::BOARD_SIZE - 1) && 
   neg_c.between?(0, GomokuBoard::BOARD_SIZE - 1) && 
   board[neg_r, neg_c] == GomokuBoard::EMPTY
  open_ends += 1
end

# Score based on length and openness
case length
when 5..Float::INFINITY
  SCORES[:five]
when 4
  open_ends >= 1 ? SCORES[:open_four] : SCORES[:four]
when 3
  open_ends == 2 ? SCORES[:open_three] : SCORES[:three]
when 2
  open_ends == 2 ? SCORES[:open_two] : SCORES[:two]
else
  0
end
```

end
end

class GomokuAI
MAX_DEPTH = 4

def self.minimax(board, depth, alpha, beta, maximizing_player, ai_player)
return GomokuEvaluator.evaluate(board, ai_player) if depth == 0 || board.game_over?

```
current_player = maximizing_player ? ai_player : opponent_of(ai_player)
moves = get_prioritized_moves(board)

if maximizing_player
  max_eval = -Float::INFINITY
  moves.each do |row, col|
    new_board = board.make_move(row, col, current_player)
    next unless new_board

    eval_score = minimax(new_board, depth - 1, alpha, beta, false, ai_player)
    max_eval = [max_eval, eval_score].max
    alpha = [alpha, eval_score].max
    break if beta <= alpha # Alpha-beta pruning
  end
  max_eval
else
  min_eval = Float::INFINITY
  moves.each do |row, col|
    new_board = board.make_move(row, col, current_player)
    next unless new_board

    eval_score = minimax(new_board, depth - 1, alpha, beta, true, ai_player)
    min_eval = [min_eval, eval_score].min
    beta = [beta, eval_score].min
    break if beta <= alpha # Alpha-beta pruning
  end
  min_eval
end
```

end

def self.find_best_move(board, player, depth = MAX_DEPTH)
best_move = nil
best_score = -Float::INFINITY
alpha = -Float::INFINITY
beta = Float::INFINITY

```
moves = get_prioritized_moves(board)

moves.each do |row, col|
  new_board = board.make_move(row, col, player)
  next unless new_board

  score = minimax(new_board, depth - 1, alpha, beta, false, player)
  
  if score > best_score
    best_score = score
    best_move = [row, col]
  end

  alpha = [alpha, score].max
end

best_move
```

end

private

def self.opponent_of(player)
player == GomokuBoard::BLACK ? GomokuBoard::WHITE : GomokuBoard::BLACK
end

def self.get_prioritized_moves(board)
moves = board.get_legal_moves

```
# If it's the opening, prefer center moves
if moves.size == GomokuBoard::BOARD_SIZE * GomokuBoard::BOARD_SIZE
  center = GomokuBoard::BOARD_SIZE / 2
  return [[center, center]]
end

# Simple prioritization: moves closer to existing stones
moves.sort_by do |row, col|
  min_distance = Float::INFINITY
  (0...GomokuBoard::BOARD_SIZE).each do |r|
    (0...GomokuBoard::BOARD_SIZE).each do |c|
      if board[r, c] != GomokuBoard::EMPTY
        distance = (row - r).abs + (col - c).abs
        min_distance = [min_distance, distance].min
      end
    end
  end
  min_distance
end
```

end
end

# Example usage:

if **FILE** == $0

# Create a new game

board = GomokuBoard.new
current_player = GomokuBoard::BLACK

puts “Gomoku AI Demo”
puts “Board size: #{GomokuBoard::BOARD_SIZE}x#{GomokuBoard::BOARD_SIZE}”
puts “BLACK = #{GomokuBoard::BLACK}, WHITE = #{GomokuBoard::WHITE}”
puts

# Make a few moves to demonstrate

board = board.make_move(7, 7, GomokuBoard::BLACK)  # Center move
board = board.make_move(7, 8, GomokuBoard::WHITE)  # Adjacent move

puts “Current board state after initial moves:”
(0…GomokuBoard::BOARD_SIZE).each do |row|
(0…GomokuBoard::BOARD_SIZE).each do |col|
case board[row, col]
when GomokuBoard::EMPTY
print “. “
when GomokuBoard::BLACK
print “B “
when GomokuBoard::WHITE
print “W “
end
end
puts
end
puts

# Find best move for BLACK

puts “Finding best move for BLACK…”
start_time = Time.now
best_move = GomokuAI.find_best_move(board, GomokuBoard::BLACK, 3)
end_time = Time.now

if best_move
puts “Best move for BLACK: #{best_move} (found in #{(end_time - start_time).round(3)}s)”
puts “Evaluation score: #{GomokuEvaluator.evaluate(board.make_move(*best_move, GomokuBoard::BLACK), GomokuBoard::BLACK)}”
else
puts “No valid moves found”
end
end