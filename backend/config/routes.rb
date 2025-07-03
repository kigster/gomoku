Rails.application.routes.draw do
  get "home/index"

  # API routes
  namespace :api do
    namespace :v1 do
      # Authentication routes
      post "auth/login", to: "auth#login"
      post "auth/register", to: "auth#register"
      post "auth/oauth", to: "auth#oauth"
      delete "auth/logout", to: "auth#logout"
      get "auth/me", to: "auth#me"

      # Game routes
      resources :games do
        member do
          post "moves", to: "games#add_move"
        end
        collection do
          get "stats", to: "games#stats"
        end
      end
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
  root "home#index"
end
