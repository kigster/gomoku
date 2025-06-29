class Game < ApplicationRecord
  include AASM

  # Constants for enum values
  STATUSES = {
    waiting: "waiting",
    playing: "playing",
    finished: "finished",
    abandoned: "abandoned"
  }.freeze

  GAME_TYPES = {
    vs_ai: "vs_ai",
    vs_human: "vs_human",
    tournament: "tournament"
  }.freeze

  BOARD_SIZES = %w[15x15 19x19].freeze
  PLAYERS = %w[black white].freeze
  AI_DIFFICULTIES = %w[easy medium hard].freeze

  # Associations
  belongs_to :black_player, class_name: "User"
  belongs_to :white_player, class_name: "User", optional: true
  belongs_to :winner, class_name: "User", optional: true

  # AASM State Machine for game status
  aasm column: :status do
    state :waiting, initial: true
    state :playing, :finished, :abandoned

    event :start_game do
      transitions from: :waiting, to: :playing
      after do
        update!(started_at: Time.current)
      end
    end

    event :finish_game do
      transitions from: [ :playing, :waiting ], to: :finished
      after do
        update!(finished_at: Time.current)
      end
    end

    event :abandon_game do
      transitions from: [ :waiting, :playing ], to: :abandoned
      after do
        update!(finished_at: Time.current)
      end
    end
  end

  # Game Type enum (keeping this as regular enum since it doesn't need state transitions)
  enum :game_type, GAME_TYPES

  # Validations
  validates :status, presence: true, inclusion: { in: STATUSES.values }
  validates :game_type, presence: true
  validates :board_size, presence: true, inclusion: { in: BOARD_SIZES }
  validates :current_player, inclusion: { in: PLAYERS }
  validates :ai_difficulty, inclusion: { in: AI_DIFFICULTIES }, allow_nil: true
  validates :move_count, numericality: { greater_than_or_equal_to: 0 }

  validate :valid_board_state
  validate :valid_moves_array
  validate :ai_game_has_difficulty, if: -> { game_type == GAME_TYPES[:vs_ai] }
  validate :validate_white_player_for_human_games

  # Callbacks
  before_create :initialize_board
  after_update :update_player_stats, if: :saved_change_to_status_and_finished?

  # Scopes
  scope :recent, -> { order(created_at: :desc) }
  scope :for_user, ->(user) { where("black_player_id = ? OR white_player_id = ?", user.id, user.id) }
  scope :active, -> { where(status: [ :waiting, :playing ]) }

  # Game Logic Methods
  def board_array
    return Array.new(19) { Array.new(19) } if board_state.blank?

    board_state["board"] || Array.new(19) { Array.new(19) }
  end

  def place_stone(row, col, player_color)
    return false unless valid_move?(row, col, player_color)

    board = board_array
    board[row][col] = player_color

    # Update game state
    self.board_state = (board_state || {}).merge("board" => board)
    self.moves << {
      row: row,
      col: col,
      player: player_color,
      move_number: move_count + 1,
      timestamp: Time.current.iso8601
    }
    self.move_count += 1
    self.current_player = player_color == "black" ? "white" : "black"

    # Check for win condition
    if check_win?(board, row, col, player_color)
      finish_game!(player_color == "black" ? black_player : white_player)
    elsif board_full?(board)
      finish_game!(nil) # Draw
    end

    save!
  end

  def valid_move?(row, col, player_color)
    return false unless playing?
    return false unless current_player == player_color
    return false unless (0..18).cover?(row) && (0..18).cover?(col)

    board = board_array
    board[row][col].nil?
  end

  def check_win?(board, row, col, player_color)
    directions = [ [ 0, 1 ], [ 1, 0 ], [ 1, 1 ], [ 1, -1 ] ]

    directions.each do |dx, dy|
      count = 1

      # Check positive direction
      r, c = row + dx, col + dy
      while r.between?(0, 18) && c.between?(0, 18) && board[r][c] == player_color
        count += 1
        r += dx
        c += dy
      end

      # Check negative direction
      r, c = row - dx, col - dy
      while r.between?(0, 18) && c.between?(0, 18) && board[r][c] == player_color
        count += 1
        r -= dx
        c -= dy
      end

      return true if count >= 5
    end

    false
  end

  def board_full?(board)
    board.all? { |row| row.all? { |cell| !cell.nil? } }
  end

  def opponent_for(user)
    return nil unless user == black_player || user == white_player

    user == black_player ? white_player : black_player
  end

  def player_color(user)
    return "black" if user == black_player
    return "white" if user == white_player
    nil
  end

  def current_player_user
    current_player == "black" ? black_player : white_player
  end

  def undo_allowed?
    game_type == GAME_TYPES[:vs_ai]
  end

  def switch_player!
    self.current_player = current_player == "black" ? "white" : "black"
    save!
  end

  def add_move!(row, col, player_color)
    # Update board state
    board = board_array
    board[row][col] = player_color
    self.board_state = (board_state || {}).merge("board" => board)

    # Add move to moves array
    self.moves << {
      "row" => row,
      "col" => col,
      "player" => player_color,
      "move_number" => move_count + 1,
      "timestamp" => Time.current.iso8601
    }
    self.move_count += 1
    save!
  end

  def check_win_condition(row, col, player_color)
    board = board_array
    check_win?(board, row, col, player_color)
  end

  def finish_game!(winning_player)
    self.status = STATUSES[:finished]
    self.winner = winning_player
    self.finished_at = Time.current
    save!
  end

  def game_duration
    return nil unless started_at.present?

    end_time = finished_at || Time.current
    end_time - started_at
  end

  def duration
    return nil unless started_at.present?

    end_time = finished_at || Time.current
    (end_time - started_at).to_i
  end

  def game_result_for(user)
    return "ongoing" unless finished?
    return "draw" if winner.nil?

    winner == user ? "win" : "loss"
  end

  def join_as_white!(user)
    return false unless waiting? && game_type == GAME_TYPES[:vs_human]
    return false if user == black_player

    update!(
      white_player: user,
      status: :playing,
      started_at: Time.current
    )
  end

  def abandon!(user)
    return false unless [ black_player, white_player ].include?(user)
    return false if finished?

    # Determine winner (opponent of abandoning player)
    abandoning_winner = user == black_player ? white_player : black_player

    update!(
      status: :abandoned,
      winner: abandoning_winner,
      finished_at: Time.current
    )
  end

  # AI Integration
  def make_ai_move!
    return false unless game_type == GAME_TYPES[:vs_ai] && playing? && current_player == "white"

    # This would integrate with your AI logic from the frontend
    # For now, we'll make a simple random move
    empty_positions = []
    board = board_array

    (0..18).each do |row|
      (0..18).each do |col|
        empty_positions << [ row, col ] if board[row][col].nil?
      end
    end

    return false if empty_positions.empty?

    row, col = empty_positions.sample
    place_stone(row, col, "white")
  end

  # Serialization
  def as_json(options = {})
    super(options.merge(
      include: {
        black_player: { only: [ :id, :username, :display_name, :avatar_url, :rating ] },
        white_player: { only: [ :id, :username, :display_name, :avatar_url, :rating ] },
        winner: { only: [ :id, :username, :display_name ] }
      },
      methods: [ :duration ]
    ))
  end

  private

  def initialize_board
    self.board_state = { "board" => Array.new(19) { Array.new(19) } }
    self.moves = []

    # Start game immediately for AI games
    if game_type == GAME_TYPES[:vs_ai]
      self.status = STATUSES[:playing]
      self.started_at = Time.current
      # Create a simple AI opponent placeholder
      self.white_player = nil # AI doesn't need a user record
    end
  end

  def valid_board_state
    return if board_state.blank?

    board = board_state["board"]
    return unless board.is_a?(Array)

    unless board.length == 19 && board.all? { |row| row.is_a?(Array) && row.length == 19 }
      errors.add(:board_state, "must be a 19x19 array")
    end
  end

  def valid_moves_array
    return if moves.blank?

    unless moves.is_a?(Array)
      errors.add(:moves, "must be an array")
    end
  end

  def ai_game_has_difficulty
    if ai_difficulty.blank?
      errors.add(:ai_difficulty, "must be specified for AI games")
    end
  end

  def saved_change_to_status_and_finished?
    saved_change_to_status? && finished?
  end

  def validate_white_player_for_human_games
    if game_type == GAME_TYPES[:vs_human] && white_player.blank?
      errors.add(:white_player, "can't be blank for human vs human games")
    end
  end

  def update_player_stats
    return unless winner.present? || (finished? && winner.nil?)

    if winner.present?
      # Winner gets a win
      winner.update_game_stats!("win")

      # Loser gets a loss
      loser = winner == black_player ? white_player : black_player
      loser&.update_game_stats!("loss")
    else
      # Draw - both players get a draw
      black_player.update_game_stats!("draw")
      white_player&.update_game_stats!("draw")
    end
  end
end
