class Api::V1::BaseController < ApplicationController
  class << self
    def inherited(subclass)
      subclass.instance_eval do
        no_login_required = []
        %i[index show].each do |action|
          no_login_required << action if subclass.new.respond_to?(action)
        end
        before_action :authenticate_user!, except: no_login_required
        skip_before_action :verify_authenticity_token
      end
    end
  end

  # Skip CSRF for API endpoints

  # Handle CORS
  before_action :set_cors_headers

  before_action :configure_permitted_parameters, if: :devise_controller?

  # JSON responses
  respond_to :json

  # Error handling
  rescue_from ActiveRecord::RecordNotFound, with: :record_not_found
  rescue_from ActiveRecord::RecordInvalid, with: :record_invalid
  # rescue_from Pundit::NotAuthorizedError, with: :user_not_authorized

  protected

  def authenticate_user!
    token = request.headers["Authorization"]&.split(" ")&.last

    if token.present?
      begin
        decoded_token = JWT.decode(token, Rails.application.secrets.secret_key_base, true, algorithm: "HS256")
        user_id = decoded_token[0]["user_id"]
        @current_user = User.find(user_id)
      rescue JWT::DecodeError, JWT::ExpiredSignature, ActiveRecord::RecordNotFound
        render json: { error: "Invalid token" }, status: :unauthorized
      end
    else
      render json: { error: "Token required" }, status: :unauthorized
    end
  end

  def current_user
    @current_user
  end

  private

  def set_cors_headers
    response.set_header("Access-Control-Allow-Origin", "http://localhost:3000")
    response.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
    response.set_header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization")
    response.set_header("Access-Control-Allow-Credentials", "true")

    if request.method == "OPTIONS"
      render json: {}, status: :ok
    end
  end

  def record_not_found(exception)
    render json: {
      error: "Record not found",
      message: exception.message
    }, status: :not_found
  end

  def record_invalid(exception)
    render json: {
      error: "Validation failed",
      messages: exception.record.errors.full_messages
    }, status: :unprocessable_entity
  end

  # def user_not_authorized
  #   render json: {
  #     error: 'Access denied',
  #     message: 'You are not authorized to perform this action'
  #   }, status: :forbidden
  # end

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up, keys: [ :username, :name ])
    devise_parameter_sanitizer.permit(:account_update, keys: [ :username, :name ])
  end
end
