class User < ApplicationRecord
  # Constants
  OAUTH_PROVIDERS = %w[google_oauth2 github].freeze
  USERNAME_FORMAT = /\A[a-zA-Z0-9_]+\z/.freeze
  MIN_USERNAME_LENGTH = 3
  MAX_USERNAME_LENGTH = 20
  MAX_NAME_LENGTH = 50
  DEFAULT_RATING = 1200

  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :trackable, :omniauthable, :jwt_authenticatable,
         jwt_revocation_strategy: Devise::JWT::RevocationStrategies::Null,
         omniauth_providers: OAUTH_PROVIDERS

  # Validations
  validates :username, presence: true, uniqueness: { case_sensitive: false },
                      length: { minimum: MIN_USERNAME_LENGTH, maximum: MAX_USERNAME_LENGTH },
                      format: { with: USERNAME_FORMAT, message: "can only contain letters, numbers, and underscores" }

  validates :email, presence: true, uniqueness: { case_sensitive: false }
  validates :first_name, :last_name, length: { maximum: MAX_NAME_LENGTH }
  validates :games_played, :games_won, :games_lost, :games_drawn,
            numericality: { greater_than_or_equal_to: 0 }
  validates :rating, numericality: { greater_than: 0 }

  # Callbacks
  before_validation :set_default_username, if: :new_record?
  before_validation :normalize_username
  after_update :update_rating, if: :saved_change_to_games_won_or_lost?

  # Associations
  has_many :games_as_black, class_name: "Game", foreign_key: "black_player_id", dependent: :destroy
  has_many :games_as_white, class_name: "Game", foreign_key: "white_player_id", dependent: :destroy
  has_many :won_games, class_name: "Game", foreign_key: "winner_id", dependent: :nullify

  def games
    Game.where("black_player_id = ? OR white_player_id = ?", id, id)
  end

  # Allow username for authentication
  def self.find_for_database_authentication(warden_conditions)
    conditions = warden_conditions.dup
    if (login = conditions.delete(:email))
      where(conditions.to_h).where(
        [ "lower(username) = :value OR lower(email) = :value", { value: login.downcase } ]
      ).first
    elsif conditions.has_key?(:username) || conditions.has_key?(:email)
      where(conditions.to_h).first
    end
  end

  # OAuth methods
  def self.from_omniauth(auth)
    where(provider: auth.provider, uid: auth.uid).first_or_create do |user|
      user.email = auth.info.email
      user.provider = auth.provider
      user.uid = auth.uid
      user.first_name = auth.info.first_name || auth.info.name&.split&.first
      user.last_name = auth.info.last_name || auth.info.name&.split&.last
      user.avatar_url = auth.info.image
      user.oauth_data = auth.to_json
      user.password = Devise.friendly_token[0, 20]

      # Generate username from email or provider info
      base_username = auth.info.nickname ||
                     auth.info.email&.split("@")&.first ||
                     "user_#{auth.provider}"
      user.username = generate_unique_username(base_username)
    end
  end

  def full_name
    "#{first_name} #{last_name}".strip
  end

  def display_name
    full_name.present? ? full_name : username
  end

  def oauth_user?
    provider.present?
  end

  def win_rate
    return 0 if games_played.zero?
    (games_won.to_f / games_played * 100).round(1)
  end

  def update_game_stats!(result)
    case result
    when "win"
      increment!(:games_won)
    when "loss"
      increment!(:games_lost)
    when "draw"
      increment!(:games_drawn)
    end
    increment!(:games_played)
  end

  # JWT methods for devise-jwt
  def jwt_identifier
    id
  end

  def on_jwt_dispatch(token, payload)
    # Store token if needed for logout functionality
  end

  private

  def will_generate_username?
    new_record? && username.blank? && email.present?
  end

  def normalize_username
    self.username = username&.downcase&.strip
  end

  def set_default_username
    return if username.present? || email.blank?

    base = email.split("@").first.split(".").first
    self.username = self.class.generate_unique_username(base)
  end

  def self.generate_unique_username(base)
    base = base.gsub(/[^a-zA-Z0-9_]/, "").downcase
    base = "user" if base.blank?

    username = base
    counter = 1

    while exists?(username: username)
      username = "#{base}_#{counter}"
      counter += 1
    end

    username
  end

  def saved_change_to_games_won_or_lost?
    saved_change_to_games_won? || saved_change_to_games_lost?
  end

  def update_rating
    # Simple ELO-like rating system - can be enhanced later
    # For now, just a basic adjustment based on win rate
    new_rating = DEFAULT_RATING + (win_rate - 50) * 10
    update_column(:rating, [ new_rating, 100 ].max) # Minimum rating of 100
  end
end
