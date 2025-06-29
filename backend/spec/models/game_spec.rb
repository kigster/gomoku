require 'rails_helper'

RSpec.describe Game, type: :model do
  # Factories
  let(:game) { build(:game) }
  let(:saved_game) { create(:game) }

  describe 'associations' do
    it { is_expected.to belong_to(:black_player).class_name('User') }
    it { is_expected.to belong_to(:white_player).class_name('User').optional }
    it { is_expected.to belong_to(:winner).class_name('User').optional }
  end

  describe 'validations' do
    subject { build(:game) }

    it { is_expected.to validate_presence_of(:status) }
    it { is_expected.to validate_presence_of(:game_type) }
    it { is_expected.to validate_presence_of(:board_size) }
    it { is_expected.to validate_inclusion_of(:board_size).in_array(Game::BOARD_SIZES) }
    it { is_expected.to validate_inclusion_of(:current_player).in_array(Game::PLAYERS) }
    it { is_expected.to validate_numericality_of(:move_count).is_greater_than_or_equal_to(0) }
  end

  describe 'enums and state machine' do
    # AASM provides state machine functionality, so we test state transitions instead of enum
    it 'has correct AASM states' do
      expect(subject.aasm.states.map(&:name)).to contain_exactly(:waiting, :playing, :finished, :abandoned)
    end

    it { is_expected.to define_enum_for(:game_type).with_values(Game::GAME_TYPES).backed_by_column_of_type(:string) }
  end

  describe 'factories' do
    it 'has a valid factory' do
      expect(build(:game)).to be_valid
    end

    it 'has valid trait factories' do
      expect(build(:game, :vs_ai)).to be_valid
      expect(build(:game, :vs_ai_easy)).to be_valid
      expect(build(:game, :vs_ai_hard)).to be_valid
      expect(build(:game, :playing)).to be_valid
      expect(build(:game, :finished)).to be_valid
      expect(build(:game, :abandoned)).to be_valid
      expect(build(:game, :with_moves)).to be_valid
      expect(build(:game, :with_board_state)).to be_valid
      expect(build(:game, :tournament)).to be_valid
      expect(build(:game, :quick_game)).to be_valid
      expect(build(:game, :black_wins)).to be_valid
      expect(build(:game, :white_wins)).to be_valid
      expect(build(:game, :draw)).to be_valid
      expect(build(:game, :midgame)).to be_valid
      expect(build(:game, :endgame)).to be_valid
      expect(build(:game, :near_win_black)).to be_valid
    end
  end

  describe 'AI game validations' do
    it 'allows AI games without white player' do
      game = build(:game, :vs_ai, white_player: nil)
      expect(game).to be_valid
    end

    it 'requires white player for human vs human games' do
      game = build(:game, game_type: Game::GAME_TYPES[:vs_human], white_player: nil)
      expect(game).to be_invalid
      expect(game.errors[:white_player]).to include("can't be blank for human vs human games")
    end
  end

  describe '#undo_allowed?' do
    it 'returns true for AI games' do
      game = create(:game, :vs_ai)
      expect(game.undo_allowed?).to be true
    end

    it 'returns false for human vs human games' do
      game = create(:game, :vs_human)
      expect(game.undo_allowed?).to be false
    end

    it 'returns false for tournament games' do
      game = create(:game, :tournament)
      expect(game.undo_allowed?).to be false
    end
  end

  describe '#current_player_user' do
    let(:black_player) { create(:user) }
    let(:white_player) { create(:user) }
    let(:game) { create(:game, black_player: black_player, white_player: white_player) }

    it 'returns black player when current_player is black' do
      game.update!(current_player: Game::PLAYERS[0])
      expect(game.current_player_user).to eq(black_player)
    end

    it 'returns white player when current_player is white' do
      game.update!(current_player: Game::PLAYERS[1])
      expect(game.current_player_user).to eq(white_player)
    end

    it 'returns nil when current_player is white but no white_player set (AI game)' do
      ai_game = create(:game, :vs_ai, current_player: Game::PLAYERS[1])
      expect(ai_game.current_player_user).to be_nil
    end
  end

  describe '#switch_player!' do
    let(:game) { create(:game, current_player: Game::PLAYERS[0]) }

    it 'switches from black to white' do
      expect { game.switch_player! }
        .to change(game, :current_player).from(Game::PLAYERS[0]).to(Game::PLAYERS[1])
    end

    it 'switches from white to black' do
      game.update!(current_player: Game::PLAYERS[1])
      expect { game.switch_player! }
        .to change(game, :current_player).from(Game::PLAYERS[1]).to(Game::PLAYERS[0])
    end
  end

  describe '#add_move!' do
    let(:game) { create(:game, :playing) }

    it 'adds a move to the game' do
      expect {
        game.add_move!(9, 9, Game::PLAYERS[0])
      }.to change { game.moves.count }.by(1)
       .and change(game, :move_count).by(1)
    end

    it 'creates move with correct attributes' do
      game.add_move!(9, 9, Game::PLAYERS[0])
      move = game.moves.last

      expect(move["row"]).to eq(9)
      expect(move["col"]).to eq(9)
      expect(move["player"]).to eq(Game::PLAYERS[0])
      expect(move["move_number"]).to eq(1)
      expect(move["timestamp"]).to be_present
    end

    it 'increments move number correctly' do
      game.add_move!(9, 9, Game::PLAYERS[0])
      game.add_move!(10, 10, Game::PLAYERS[1])

      expect(game.moves.last["move_number"]).to eq(2)
    end
  end

  describe '#check_win_condition' do
    let(:game) { create(:game, :playing) }

    it 'detects horizontal win' do
      # Create a horizontal line of 5 stones
      (0..4).each { |i| game.add_move!(9, i, Game::PLAYERS[0]) }

      expect(game.check_win_condition(9, 4, Game::PLAYERS[0])).to be true
    end

    it 'detects vertical win' do
      # Create a vertical line of 5 stones
      (0..4).each { |i| game.add_move!(i, 9, Game::PLAYERS[0]) }

      expect(game.check_win_condition(4, 9, Game::PLAYERS[0])).to be true
    end

    it 'detects diagonal win (top-left to bottom-right)' do
      # Create a diagonal line of 5 stones
      (0..4).each { |i| game.add_move!(i, i, Game::PLAYERS[0]) }

      expect(game.check_win_condition(4, 4, Game::PLAYERS[0])).to be true
    end

    it 'detects diagonal win (top-right to bottom-left)' do
      # Create a diagonal line of 5 stones
      (0..4).each { |i| game.add_move!(i, 4-i, Game::PLAYERS[0]) }

      expect(game.check_win_condition(4, 0, Game::PLAYERS[0])).to be true
    end

    it 'returns false when no win condition is met' do
      game.add_move!(9, 9, Game::PLAYERS[0])
      expect(game.check_win_condition(9, 9, Game::PLAYERS[0])).to be false
    end
  end

  describe '#finish_game!' do
    let(:game) { create(:game, :playing) }
    let(:winner) { game.black_player }

    it 'finishes the game with a winner' do
      expect {
        game.finish_game!(winner)
      }.to change(game, :status).from('playing').to('finished')
       .and change(game, :winner).from(nil).to(winner)
       .and change(game, :finished_at).from(nil)
    end

    it 'updates player statistics' do
      expect(winner).to receive(:update_game_stats!).with('win')
      expect(game.white_player).to receive(:update_game_stats!).with('loss')

      game.finish_game!(winner)
    end

    it 'handles draw games' do
      expect {
        game.finish_game!(nil)
      }.to change(game, :status).from('playing').to('finished')
       .and change(game, :finished_at).from(nil)

      expect(game.winner).to be_nil
    end
  end

  describe 'game flow' do
    let(:black_player) { create(:user) }
    let(:white_player) { create(:user) }
    let(:game) { create(:game, black_player: black_player, white_player: white_player) }

    it 'can transition from waiting to playing' do
      expect {
        game.update!(status: Game::STATUSES[:playing], started_at: Time.current)
      }.to change(game, :status).from(Game::STATUSES[:waiting]).to(Game::STATUSES[:playing])
    end

    it 'tracks game duration' do
      game.update!(status: 'playing', started_at: 1.hour.ago)
      game.finish_game!(black_player)

      expect(game.game_duration).to be_within(5.seconds).of(1.hour)
    end
  end
end
