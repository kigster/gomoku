require 'rails_helper'

RSpec.describe User, type: :model do
  # Factories
  let(:user) { build(:user) }
  let(:saved_user) { create(:user) }

  describe 'associations' do
    it { is_expected.to have_many(:games_as_black).class_name('Game').with_foreign_key('black_player_id') }
    it { is_expected.to have_many(:games_as_white).class_name('Game').with_foreign_key('white_player_id') }
    it { is_expected.to have_many(:won_games).class_name('Game').with_foreign_key('winner_id') }
  end

  describe 'validations' do
    subject { build(:user) }

    # Username validations
    it 'validates username presence when not auto-generated' do
      user = build(:user, username: '', email: '')
      expect(user).to be_invalid
      expect(user.errors[:username]).to include("can't be blank")
    end

    it { is_expected.to validate_uniqueness_of(:username).case_insensitive }
    it { is_expected.to validate_length_of(:username).is_at_least(User::MIN_USERNAME_LENGTH).is_at_most(User::MAX_USERNAME_LENGTH) }

    it 'validates username format' do
      valid_usernames = %w[user123 test_user user_123 myuser]
      invalid_usernames = [ 'user-123', 'user@123', 'user 123', 'user.123', 'user!123' ]

      valid_usernames.each do |username|
        expect(build(:user, username: username)).to be_valid
      end

      invalid_usernames.each do |username|
        user = build(:user, username: username)
        expect(user).to be_invalid
        expect(user.errors[:username]).to include('can only contain letters, numbers, and underscores')
      end
    end

    # Email validations
    it { is_expected.to validate_presence_of(:email) }
    it { is_expected.to validate_uniqueness_of(:email).case_insensitive }

    # Name validations
    it { is_expected.to validate_length_of(:first_name).is_at_most(User::MAX_NAME_LENGTH) }
    it { is_expected.to validate_length_of(:last_name).is_at_most(User::MAX_NAME_LENGTH) }

    # Game stats validations
    it { is_expected.to validate_numericality_of(:games_played).is_greater_than_or_equal_to(0) }
    it { is_expected.to validate_numericality_of(:games_won).is_greater_than_or_equal_to(0) }
    it { is_expected.to validate_numericality_of(:games_lost).is_greater_than_or_equal_to(0) }
    it { is_expected.to validate_numericality_of(:games_drawn).is_greater_than_or_equal_to(0) }
    it { is_expected.to validate_numericality_of(:rating).is_greater_than(0) }
  end

  describe 'callbacks' do
    context 'username normalization' do
      it 'normalizes username to lowercase' do
        user = create(:user, username: 'TestUser123')
        expect(user.username).to eq('testuser123')
      end

      it 'strips whitespace from username' do
        user = create(:user, username: '  testuser  ')
        expect(user.username).to eq('testuser')
      end
    end

    context 'default username generation' do
      it 'generates username from email when not provided' do
        user = build(:user, username: nil, email: 'john.doe@example.com')
        user.valid?
        expect(user.username).to eq('john')
      end

      it 'generates unique username when email base is taken' do
        create(:user, username: 'john')
        user = build(:user, username: nil, email: 'john@example.com')
        user.valid?
        expect(user.username).to eq('john_1')
      end
    end
  end

  describe 'authentication' do
    describe '.find_for_database_authentication' do
      let!(:user) { create(:user, email: 'test@example.com', username: 'testuser') }

      it 'finds user by email' do
        found_user = described_class.find_for_database_authentication(email: 'test@example.com')
        expect(found_user).to eq(user)
      end

      it 'finds user by username' do
        found_user = described_class.find_for_database_authentication(email: 'testuser')
        expect(found_user).to eq(user)
      end

      it 'is case insensitive for email' do
        found_user = described_class.find_for_database_authentication(email: 'TEST@EXAMPLE.COM')
        expect(found_user).to eq(user)
      end

      it 'is case insensitive for username' do
        found_user = described_class.find_for_database_authentication(email: 'TESTUSER')
        expect(found_user).to eq(user)
      end

      it 'returns nil when user not found' do
        found_user = described_class.find_for_database_authentication(email: 'nonexistent@example.com')
        expect(found_user).to be_nil
      end
    end
  end

  describe 'OAuth methods' do
    describe '.from_omniauth' do
      let(:auth) do
        OmniAuth::AuthHash.new({
          provider: User::OAUTH_PROVIDERS[0], # google_oauth2
          uid: '123456789',
          info: {
            email: 'oauth@example.com',
            first_name: 'OAuth',
            last_name: 'User',
            image: 'https://example.com/avatar.jpg',
            name: 'OAuth User'
          }
        })
      end

      context 'when user does not exist' do
        it 'creates a new user' do
          expect {
            described_class.from_omniauth(auth)
          }.to change(described_class, :count).by(1)
        end

        it 'sets OAuth attributes correctly' do
          user = described_class.from_omniauth(auth)
          expect(user.email).to eq('oauth@example.com')
          expect(user.provider).to eq(User::OAUTH_PROVIDERS[0])
          expect(user.uid).to eq('123456789')
          expect(user.first_name).to eq('OAuth')
          expect(user.last_name).to eq('User')
          expect(user.avatar_url).to eq('https://example.com/avatar.jpg')
        end

        it 'generates a unique username' do
          user = described_class.from_omniauth(auth)
          expect(user.username).to be_present
          expect(user.username).to match(/\A[a-zA-Z0-9_]+\z/)
        end
      end

      context 'when user already exists' do
        let!(:existing_user) { create(:user, :oauth_google, provider: User::OAUTH_PROVIDERS[0], uid: '123456789') }

        it 'does not create a new user' do
          expect {
            described_class.from_omniauth(auth)
          }.not_to change(described_class, :count)
        end

        it 'returns the existing user' do
          user = described_class.from_omniauth(auth)
          expect(user).to eq(existing_user)
        end
      end
    end
  end

  describe 'instance methods' do
    let(:user) { create(:user, first_name: 'John', last_name: 'Doe', username: 'johndoe') }

    describe '#full_name' do
      it 'returns full name when both first and last name are present' do
        expect(user.full_name).to eq('John Doe')
      end

      it 'returns only first name when last name is blank' do
        user.last_name = ''
        expect(user.full_name).to eq('John')
      end

      it 'returns only last name when first name is blank' do
        user.first_name = ''
        expect(user.full_name).to eq('Doe')
      end

      it 'returns empty string when both names are blank' do
        user.first_name = ''
        user.last_name = ''
        expect(user.full_name).to eq('')
      end
    end

    describe '#display_name' do
      it 'returns full name when present' do
        expect(user.display_name).to eq('John Doe')
      end

      it 'returns username when full name is blank' do
        user.first_name = ''
        user.last_name = ''
        expect(user.display_name).to eq('johndoe')
      end
    end

    describe '#oauth_user?' do
      it 'returns true when provider is present' do
        user.provider = User::OAUTH_PROVIDERS[0]
        expect(user.oauth_user?).to be true
      end

      it 'returns false when provider is blank' do
        expect(user.oauth_user?).to be false
      end
    end

    describe '#win_rate' do
      it 'returns 0 when no games played' do
        expect(user.win_rate).to eq(0)
      end

      it 'calculates win rate correctly' do
        user.update!(games_played: 10, games_won: 7)
        expect(user.win_rate).to eq(70.0)
      end

      it 'rounds to one decimal place' do
        user.update!(games_played: 3, games_won: 1)
        expect(user.win_rate).to eq(33.3)
      end
    end

    describe '#update_game_stats!' do
      it 'updates stats for a win' do
        expect {
          user.update_game_stats!('win')
        }.to change(user, :games_won).by(1)
         .and change(user, :games_played).by(1)
      end

      it 'updates stats for a loss' do
        expect {
          user.update_game_stats!('loss')
        }.to change(user, :games_lost).by(1)
         .and change(user, :games_played).by(1)
      end

      it 'updates stats for a draw' do
        expect {
          user.update_game_stats!('draw')
        }.to change(user, :games_drawn).by(1)
         .and change(user, :games_played).by(1)
      end
    end

    describe '#games' do
      let(:user1) { create(:user) }
      let(:user2) { create(:user) }
      let!(:game_as_black) { create(:game, black_player: user1, white_player: user2) }
      let!(:game_as_white) { create(:game, black_player: user2, white_player: user1) }
      let!(:other_game) { create(:game, black_player: user2) }

      it 'returns games where user is either black or white player' do
        games = user1.games
        expect(games).to include(game_as_black, game_as_white)
        expect(games).not_to include(other_game)
      end
    end
  end

  describe 'factories' do
    it 'has a valid factory' do
      expect(build(:user)).to be_valid
    end

    it 'has valid trait factories' do
      expect(build(:user, :with_full_profile)).to be_valid
      expect(build(:user, :oauth_google)).to be_valid
      expect(build(:user, :oauth_github)).to be_valid
      expect(build(:user, :experienced_player)).to be_valid
      expect(build(:user, :beginner_player)).to be_valid
      expect(build(:user, :master_player)).to be_valid
    end
  end
end
