class Api::V1::GamesController < Api::V1::BaseController
  before_action :set_game, only: [ :show, :update, :destroy ]

  # GET /api/v1/games
  def index
    @games = current_user.games_as_player
                        .includes(:black_player, :white_player, :winner)
                        .order(created_at: :desc)
                        .page(params[:page])
                        .per(params[:per_page] || 20)

    render json: {
      success: true,
      games: @games.map { |game| game_json(game) },
      pagination: {
        current_page: @games.current_page,
        total_pages: @games.total_pages,
        total_count: @games.total_count
      }
    }
  end

  # GET /api/v1/games/:id
  def show
    render json: {
      success: true,
      game: game_json(@game, include_moves: true)
    }
  end

  # POST /api/v1/games
  def create
    @game = current_user.games_as_black.build(game_params)
    @game.white_player = current_user if @game.game_type == Game::GAME_TYPES[:vs_ai]

    if @game.save
      render json: {
        success: true,
        game: game_json(@game),
        message: "Game created successfully"
      }, status: :created
    else
      render json: {
        success: false,
        errors: @game.errors.full_messages
      }, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /api/v1/games/:id
  def update
    if @game.update(game_params)
      # Update player statistics if game finished
      if @game.finished? && @game.status_changed?
        @game.update_player_statistics!
      end

      render json: {
        success: true,
        game: game_json(@game),
        message: "Game updated successfully"
      }
    else
      render json: {
        success: false,
        errors: @game.errors.full_messages
      }, status: :unprocessable_entity
    end
  end

  # DELETE /api/v1/games/:id
  def destroy
    @game.destroy
    render json: {
      success: true,
      message: "Game deleted successfully"
    }
  end

  # POST /api/v1/games/:id/moves
  def add_move
    @game = current_user.games_as_player.find(params[:id])

    move_data = {
      row: params[:row],
      col: params[:col],
      player: params[:player],
      timestamp: Time.current.to_i
    }

    if @game.add_move!(move_data)
      render json: {
        success: true,
        game: game_json(@game),
        message: "Move added successfully"
      }
    else
      render json: {
        success: false,
        errors: @game.errors.full_messages
      }, status: :unprocessable_entity
    end
  end

  # GET /api/v1/games/stats
  def stats
    stats = {
      total_games: current_user.games_played,
      wins: current_user.games_won,
      losses: current_user.games_lost,
      draws: current_user.games_drawn,
      win_rate: current_user.win_rate,
      current_rating: current_user.rating,
      games_by_type: {
        vs_ai: current_user.games_as_player.where(game_type: Game::GAME_TYPES[:vs_ai]).count,
        vs_human: current_user.games_as_player.where(game_type: Game::GAME_TYPES[:vs_human]).count
      },
      recent_games: current_user.games_as_player
                               .includes(:black_player, :white_player, :winner)
                               .order(created_at: :desc)
                               .limit(5)
                               .map { |game| game_json(game) }
    }

    render json: {
      success: true,
      stats: stats
    }
  end

  private

  def set_game
    @game = current_user.games_as_player.find(params[:id])
  end

  def game_params
    params.require(:game).permit(:game_type, :board_size, :ai_difficulty, :time_limit)
  end

  def game_json(game, include_moves: false)
    json = {
      id: game.id,
      status: game.status,
      game_type: game.game_type,
      board_size: game.board_size,
      ai_difficulty: game.ai_difficulty,
      black_player: player_json(game.black_player),
      white_player: player_json(game.white_player),
      winner: game.winner ? player_json(game.winner) : nil,
      started_at: game.started_at,
      finished_at: game.finished_at,
      created_at: game.created_at,
      updated_at: game.updated_at
    }

    if include_moves
      json[:board_state] = game.board_state
      json[:moves] = game.moves
    end

    json
  end

  def player_json(player)
    return nil unless player

    {
      id: player.id,
      username: player.username,
      name: player.name,
      rating: player.rating,
      avatar_url: player.avatar_url
    }
  end
end
