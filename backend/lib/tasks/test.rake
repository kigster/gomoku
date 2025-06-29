# backend/lib/tasks/test.rake
namespace :test do
  desc "Run all tests (RSpec + Jest)"
  task all: :environment do
    puts "\n🚀 Running Gomoku Test Suite"
    puts "=" * 50

    # Run RSpec tests
    puts "\n📋 Running RSpec tests..."
    rspec_success = system("cd #{Rails.root} && bundle exec rspec --format documentation")

    unless rspec_success
      puts "\n❌ RSpec tests failed!"
      exit(1)
    end

    puts "\n✅ RSpec tests passed!"

    # Run Jest tests
    puts "\n🎯 Running Jest tests..."
    frontend_path = Rails.root.parent.join("frontend")

    unless Dir.exist?(frontend_path)
      puts "\n⚠️  Frontend directory not found at #{frontend_path}"
      puts "Skipping Jest tests..."
      return
    end

    jest_success = system("cd #{frontend_path} && npm test")

    unless jest_success
      puts "\n❌ Jest tests failed!"
      exit(1)
    end

    puts "\n✅ Jest tests passed!"
    puts "\n🎉 All tests passed successfully!"
    puts "=" * 50
  end

  desc "Run only RSpec tests"
  task rspec: :environment do
    puts "\n📋 Running RSpec tests..."
    system("cd #{Rails.root} && bundle exec rspec --format documentation")
  end

  desc "Run only Jest tests"
  task jest: :environment do
    puts "\n🎯 Running Jest tests..."
    frontend_path = Rails.root.parent.join("frontend")

    if Dir.exist?(frontend_path)
      system("cd #{frontend_path} && npm test")
    else
      puts "Frontend directory not found at #{frontend_path}"
    end
  end

  desc "Setup test databases and install dependencies"
  task setup: :environment do
    puts "\n🔧 Setting up test environment..."

    # Setup Rails test database
    puts "Setting up Rails test database..."
    system("cd #{Rails.root} && rails db:test:prepare")

    # Install frontend dependencies
    frontend_path = Rails.root.parent.join("frontend")
    if Dir.exist?(frontend_path)
      puts "Installing frontend dependencies..."
      system("cd #{frontend_path} && npm install")
    end

    puts "\n✅ Test environment setup complete!"
  end
end

# Make 'rake test:all' the default test task
task test: "test:all"
