FactoryBot.define do
  factory :game do
    association :black_player, factory: :user
    association :white_player, factory: :user
    status { Game::STATUSES[:waiting] }
    game_type { Game::GAME_TYPES[:vs_human] }
    board_size { Game::BOARD_SIZES.first }
    current_player { Game::PLAYERS.first }
    move_count { 0 }

        trait :vs_ai do
      white_player { nil }
      game_type { Game::GAME_TYPES[:vs_ai] }
      ai_difficulty { Game::AI_DIFFICULTIES[1] } # medium
      status { Game::STATUSES[:playing] }
      started_at { Time.current }
    end

    trait :vs_ai_easy do
      white_player { nil }
      game_type { Game::GAME_TYPES[:vs_ai] }
      ai_difficulty { Game::AI_DIFFICULTIES[0] } # easy
      status { Game::STATUSES[:playing] }
      started_at { Time.current }
    end

    trait :vs_ai_hard do
      white_player { nil }
      game_type { Game::GAME_TYPES[:vs_ai] }
      ai_difficulty { Game::AI_DIFFICULTIES[2] } # hard
      status { Game::STATUSES[:playing] }
      started_at { Time.current }
    end

        trait :playing do
      status { Game::STATUSES[:playing] }
      started_at { Time.current }
    end

    trait :finished do
      status { Game::STATUSES[:finished] }
      started_at { 1.hour.ago }
      finished_at { Time.current }
      association :winner, factory: :user
    end

    trait :abandoned do
      status { Game::STATUSES[:abandoned] }
      started_at { 1.hour.ago }
      finished_at { Time.current }
      association :winner, factory: :user
    end

    trait :with_moves do
      move_count { 5 }
      moves {
        [
          { row: 9, col: 9, player: Game::PLAYERS[0], move_number: 1, timestamp: 5.minutes.ago.iso8601 },
          { row: 10, col: 10, player: Game::PLAYERS[1], move_number: 2, timestamp: 4.minutes.ago.iso8601 },
          { row: 8, col: 8, player: Game::PLAYERS[0], move_number: 3, timestamp: 3.minutes.ago.iso8601 },
          { row: 11, col: 11, player: Game::PLAYERS[1], move_number: 4, timestamp: 2.minutes.ago.iso8601 },
          { row: 7, col: 7, player: Game::PLAYERS[0], move_number: 5, timestamp: 1.minute.ago.iso8601 }
        ]
      }
      current_player { Game::PLAYERS[1] }
    end

    trait :with_board_state do
      board_state {
        board = Array.new(19) { Array.new(19) }
        board[9][9] = Game::PLAYERS[0] # black
        board[10][10] = Game::PLAYERS[1] # white
        board[8][8] = Game::PLAYERS[0] # black
        board[11][11] = Game::PLAYERS[1] # white
        board[7][7] = Game::PLAYERS[0] # black
        { 'board' => board }
      }
    end

    trait :tournament do
      game_type { Game::GAME_TYPES[:tournament] }
      time_limit { 1800 } # 30 minutes
    end

    trait :quick_game do
      time_limit { 300 } # 5 minutes
    end

    trait :black_wins do
      finished
      after(:create) do |game|
        game.update!(winner: game.black_player)
      end
    end

    trait :white_wins do
      finished
      after(:create) do |game|
        game.update!(winner: game.white_player)
      end
    end

    trait :draw do
      finished
      winner { nil }
    end

    # Specific game states for testing
    trait :midgame do
      playing
      with_moves
      with_board_state
      move_count { 10 }
    end

    trait :endgame do
      playing
      move_count { 50 }
      current_player { Game::PLAYERS[0] } # black
    end

        trait :near_win_black do
      playing
      move_count { 8 }
      current_player { Game::PLAYERS[0] } # black
      board_state {
        board = Array.new(19) { Array.new(19) }
        # Black has 4 in a row horizontally, needs one more to win
        board[9][5] = Game::PLAYERS[0] # black
        board[9][6] = Game::PLAYERS[0] # black
        board[9][7] = Game::PLAYERS[0] # black
        board[9][8] = Game::PLAYERS[0] # black
        # White stones scattered
        board[10][5] = Game::PLAYERS[1] # white
        board[10][6] = Game::PLAYERS[1] # white
        board[8][7] = Game::PLAYERS[1] # white
        board[8][8] = Game::PLAYERS[1] # white
        { 'board' => board }
      }
    end
  end
end
