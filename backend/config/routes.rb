Rails.application.routes.draw do
  devise_for :users,
    path: "auth",
    path_names: {
      registration: "register",
      sign_in: "login",
      sign_out: "logout",
      password: "secret",
      confirmation: "confirm",
      unlock: "unblock"
    }

  get "up" => "rails/health#show", as: :rails_health_check
  root "home#index"
end
