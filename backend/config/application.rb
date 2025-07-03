require_relative "boot"

require "rails"
# Pick the frameworks you want:
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
require "active_storage/engine"
require "action_controller/railtie"
require "action_mailer/railtie"
require "action_mailbox/engine"
require "action_text/engine"
require "action_view/railtie"
require "action_cable/engine"
require "rails_semantic_logger"
#
# require "rails/test_unit/railtie"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module Gomoku
  class Application < Rails::Application
    # TCP/IP port to listen on
    PORT = ENV.fetch("PORT_RAILS", 3001).to_i
    HOST = ENV.fetch("HOST_RAILS", "localhost")

    # Port for React frontend (what needs CORS access)
    FRONTEND_PORT = ENV.fetch("PORT_REACT", 3000).to_i

    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.1

    # API-only application configuration
    config.api_only = true

    # CORS configuration - Allow React frontend to access Rails backend
    config.middleware.insert_before 0, Rack::Cors do
      allow do
        origins "http://#{HOST}:#{FRONTEND_PORT}", "http://#{HOST}:3002"
        resource "*",
          headers: :any,
          methods: [ :get, :post, :put, :patch, :delete, :options, :head ],
          credentials: true
      end
    end

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks])

    config.semantic_logger.backtrace_level = :info

    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    # config.time_zone = "Central Time (US & Canada)"
    # config.eager_load_paths << Rails.root.join("extras")

    # Don't generate system test files.
    config.generators.system_tests = nil
  end
end
