class Api::V1::AuthController < Api::V1::BaseController
  skip_before_action :authenticate_user!, only: [ :login, :oauth, :register ]

  # POST /api/v1/auth/login
  def login
    user = User.find_for_database_authentication(email: params[:email])

    if user&.valid_password?(params[:password])
      token = generate_jwt_token(user)
      render json: {
        success: true,
        token: token,
        user: user_json(user),
        message: "Login successful"
      }, status: :ok
    else
      render json: {
        success: false,
        error: "Invalid email or password"
      }, status: :unauthorized
    end
  end

  # POST /api/v1/auth/register
  def register
    user = User.new(user_params)

    if user.save
      token = generate_jwt_token(user)
      render json: {
        success: true,
        token: token,
        user: user_json(user),
        message: "Registration successful"
      }, status: :created
    else
      render json: {
        success: false,
        errors: user.errors.full_messages
      }, status: :unprocessable_entity
    end
  end

  # POST /api/v1/auth/oauth
  def oauth
    provider = params[:provider]
    auth_data = params[:auth_data]

    unless %w[google github].include?(provider)
      return render json: {
        success: false,
        error: "Invalid OAuth provider"
      }, status: :bad_request
    end

    # Simulate OAuth data structure
    omniauth_data = build_omniauth_data(provider, auth_data)
    user = User.from_omniauth(omniauth_data)

    if user.persisted?
      token = generate_jwt_token(user)
      render json: {
        success: true,
        token: token,
        user: user_json(user),
        message: "OAuth login successful"
      }, status: :ok
    else
      render json: {
        success: false,
        errors: user.errors.full_messages
      }, status: :unprocessable_entity
    end
  end

  # DELETE /api/v1/auth/logout
  def logout
    # Since we're using JWT tokens, logout is handled client-side
    # In a production app, you might want to blacklist the token
    render json: {
      success: true,
      message: "Logged out successfully"
    }, status: :ok
  end

  # GET /api/v1/auth/me
  def me
    render json: {
      success: true,
      user: user_json(current_user)
    }, status: :ok
  end

  private

  def user_params
    params.require(:user).permit(:email, :password, :password_confirmation, :username, :name)
  end

  def generate_jwt_token(user)
    payload = {
      user_id: user.id,
      username: user.username,
      exp: 24.hours.from_now.to_i
    }
    JWT.encode(payload, Rails.application.secrets.secret_key_base)
  end

  def user_json(user)
    {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      provider: user.provider,
      avatar_url: user.avatar_url,
      games_played: user.games_played,
      games_won: user.games_won,
      games_lost: user.games_lost,
      games_drawn: user.games_drawn,
      rating: user.rating,
      created_at: user.created_at
    }
  end

  def build_omniauth_data(provider, auth_data)
    {
      "provider" => provider,
      "uid" => auth_data["id"] || auth_data["sub"],
      "info" => {
        "email" => auth_data["email"],
        "name" => auth_data["name"],
        "image" => auth_data["picture"] || auth_data["avatar_url"]
      }
    }
  end
end
