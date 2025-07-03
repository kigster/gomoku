# 🛢️ Gomoku Backend API

Rails 8.1 API backend with JWT authentication, PostgreSQL database, and comprehensive game state management.

## 🚀 Quick Start

```bash
# Setup
bundle install
rails db:create db:migrate db:seed

# Development server
rails server -p 3001

# API available at http://localhost:3001
```

## 🏗️ Architecture

### Tech Stack
- **Framework**: Rails 8.1.0.alpha
- **Database**: PostgreSQL 15+
- **Authentication**: Devise + JWT
- **Testing**: RSpec + FactoryBot
- **Code Quality**: RuboCop + Brakeman

### Directory Structure
```
app/
├── controllers/
│   ├── api/v1/              # API endpoints
│   │   ├── auth_controller.rb
│   │   ├── games_controller.rb
│   │   └── base_controller.rb
│   └── application_controller.rb
├── models/
│   ├── user.rb              # User authentication
│   └── game.rb              # Game state management
└── serializers/             # JSON API responses
```

## 📋 API Endpoints

### Authentication API

#### Register User
```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "user": {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "password_confirmation": "password123"
  }
}

# Response (201 Created)
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "created_at": "2025-01-01T00:00:00.000Z"
  },
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

#### Login
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}

# Response (200 OK)
{
  "success": true,
  "message": "Logged in successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  },
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

#### Logout
```bash
DELETE /api/v1/auth/logout
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

# Response (200 OK)
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Games API

#### Create Game
```bash
POST /api/v1/games
Authorization: Bearer JWT_TOKEN
Content-Type: application/json

{
  "difficulty": "medium"  # "easy", "medium", "hard"
}

# Response (201 Created)
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "difficulty": "medium",
    "status": "active",
    "board": "000000000000000...",  # 225 characters (15x15)
    "current_player": "human",
    "move_count": 0,
    "winner": null,
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z"
  }
}
```

#### Get Game
```bash
GET /api/v1/games/1
Authorization: Bearer JWT_TOKEN

# Response (200 OK)
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "difficulty": "medium",
    "status": "active",
    "board": "000000000100000...",
    "current_player": "ai",
    "move_count": 2,
    "winner": null,
    "move_history": [
      {"player": "human", "row": 7, "col": 7, "move_number": 1},
      {"player": "ai", "row": 8, "col": 8, "move_number": 2}
    ]
  }
}
```

#### Make Move
```bash
PATCH /api/v1/games/1
Authorization: Bearer JWT_TOKEN
Content-Type: application/json

{
  "move": {
    "row": 7,
    "col": 8
  }
}

# Response (200 OK)
{
  "success": true,
  "data": {
    "id": 1,
    "board": "000000000110000...",
    "current_player": "ai",
    "move_count": 3,
    "status": "active",
    "ai_move": {
      "row": 7,
      "col": 9,
      "reasoning": "Blocking human threat"
    }
  }
}
```

#### List User Games
```bash
GET /api/v1/games
Authorization: Bearer JWT_TOKEN

# Response (200 OK)
{
  "success": true,
  "data": [
    {
      "id": 1,
      "difficulty": "medium",
      "status": "active",
      "move_count": 10,
      "created_at": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "difficulty": "hard",
      "status": "completed",
      "winner": "ai",
      "move_count": 47,
      "created_at": "2025-01-01T01:00:00.000Z"
    }
  ],
  "meta": {
    "total": 2,
    "active_games": 1,
    "completed_games": 1
  }
}
```

## 🗄️ Database Schema

### Users Table
```ruby
create_table "users", force: :cascade do |t|
  t.string "email",                  default: "", null: false
  t.string "encrypted_password",     default: "", null: false
  t.string "name",                   null: false
  t.string "reset_password_token"
  t.datetime "reset_password_sent_at"
  t.datetime "remember_created_at"
  t.datetime "created_at", null: false
  t.datetime "updated_at", null: false
  t.index ["email"], name: "index_users_on_email", unique: true
  t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
end
```

### Games Table
```ruby
create_table "games", force: :cascade do |t|
  t.references "user", null: false, foreign_key: true
  t.integer "difficulty", default: 0, null: false  # enum: easy, medium, hard
  t.integer "status", default: 0, null: false      # enum: active, completed, drawn
  t.text "board", null: false                      # 225 chars (15x15 grid)
  t.string "current_player", default: "human"      # "human" or "ai"
  t.integer "move_count", default: 0
  t.string "winner"                                 # "human", "ai", or null
  t.json "move_history", default: []
  t.datetime "created_at", null: false
  t.datetime "updated_at", null: false
  t.index ["user_id", "status"], name: "index_games_on_user_id_and_status"
end
```

## 🔐 Authentication

### JWT Configuration
```ruby
# config/initializers/devise.rb
Devise.setup do |config|
  config.jwt do |jwt|
    jwt.secret = Rails.application.credentials.jwt_secret_key
    jwt.dispatch_requests = [
      ['POST', %r{^/api/v1/auth/login$}],
      ['POST', %r{^/api/v1/auth/register$}]
    ]
    jwt.revocation_requests = [
      ['DELETE', %r{^/api/v1/auth/logout$}]
    ]
  end
end
```

### Authorization Example
```ruby
class Api::V1::BaseController < ApplicationController
  before_action :authenticate_user!
  before_action :configure_permitted_parameters, if: :devise_controller?

  protected

  def authenticate_user!
    token = request.headers['Authorization']&.split(' ')&.last
    
    if token
      payload = JWT.decode(token, Rails.application.credentials.jwt_secret_key)[0]
      @current_user = User.find(payload['sub'])
    else
      render json: { error: 'Unauthorized' }, status: :unauthorized
    end
  rescue JWT::DecodeError
    render json: { error: 'Invalid token' }, status: :unauthorized
  end
end
```

## 🎮 Game Logic

### Board Representation
```ruby
class Game < ApplicationRecord
  BOARD_SIZE = 15
  EMPTY = '0'
  HUMAN = '1'
  AI = '2'

  # Board stored as 225-character string
  # board[row * 15 + col] = player
  
  def get_cell(row, col)
    return nil if row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE
    board[row * BOARD_SIZE + col]
  end

  def set_cell(row, col, player)
    return false unless valid_position?(row, col)
    self.board[row * BOARD_SIZE + col] = player
    true
  end
end
```

### Move Validation
```ruby
def make_move(row, col, player)
  return { success: false, error: "Invalid position" } unless valid_position?(row, col)
  return { success: false, error: "Cell occupied" } unless get_cell(row, col) == EMPTY
  return { success: false, error: "Wrong player turn" } unless current_player == player

  set_cell(row, col, player)
  add_to_history(row, col, player)
  
  if check_winner(row, col, player)
    update!(status: 'completed', winner: player)
    { success: true, winner: player, game_over: true }
  else
    switch_player
    { success: true, game_over: false }
  end
end
```

### Win Detection
```ruby
def check_winner(row, col, player)
  directions = [
    [0, 1],   # horizontal
    [1, 0],   # vertical
    [1, 1],   # diagonal \
    [1, -1]   # diagonal /
  ]

  directions.any? do |dr, dc|
    count = 1 + count_direction(row, col, dr, dc, player) + 
                count_direction(row, col, -dr, -dc, player)
    count >= 5
  end
end

private

def count_direction(row, col, dr, dc, player)
  count = 0
  r, c = row + dr, col + dc
  
  while valid_position?(r, c) && get_cell(r, c) == player
    count += 1
    r, c = r + dr, c + dc
  end
  
  count
end
```

## 🧪 Testing

### RSpec Configuration
```ruby
# spec/rails_helper.rb
RSpec.configure do |config|
  config.include FactoryBot::Syntax::Methods
  config.use_transactional_fixtures = true
  config.infer_spec_type_from_file_location!
end
```

### Model Tests
```ruby
# spec/models/user_spec.rb
RSpec.describe User, type: :model do
  describe 'validations' do
    it { should validate_presence_of(:name) }
    it { should validate_presence_of(:email) }
    it { should validate_uniqueness_of(:email).case_insensitive }
  end

  describe 'associations' do
    it { should have_many(:games).dependent(:destroy) }
  end

  describe 'JWT authentication' do
    let(:user) { create(:user) }
    
    it 'generates valid JWT token' do
      token = user.generate_jwt
      expect(token).to be_present
      
      payload = JWT.decode(token, Rails.application.credentials.jwt_secret_key)[0]
      expect(payload['sub']).to eq(user.id.to_s)
    end
  end
end
```

### API Tests
```ruby
# spec/requests/api/v1/auth_spec.rb
RSpec.describe 'Auth API', type: :request do
  describe 'POST /api/v1/auth/register' do
    let(:valid_params) do
      {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
          password_confirmation: 'password123'
        }
      }
    end

    context 'with valid parameters' do
      it 'creates user and returns JWT token' do
        post '/api/v1/auth/register', params: valid_params

        expect(response).to have_http_status(:created)
        
        json = JSON.parse(response.body)
        expect(json['success']).to be true
        expect(json['token']).to be_present
        expect(json['data']['email']).to eq('john@example.com')
      end
    end
  end
end
```

### Factory Definitions
```ruby
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    name { Faker::Name.name }
    email { Faker::Internet.email }
    password { 'password123' }
    password_confirmation { 'password123' }
  end
end

# spec/factories/games.rb
FactoryBot.define do
  factory :game do
    user
    difficulty { :medium }
    status { :active }
    board { '0' * 225 }  # Empty 15x15 board
    current_player { 'human' }
    move_count { 0 }
  end

  trait :with_moves do
    board { '0' * 112 + '1' + '0' * 112 }  # Center move
    move_count { 1 }
    current_player { 'ai' }
  end
end
```

## 🚀 Deployment

### Environment Variables
```bash
# .env.production
DATABASE_URL=postgresql://user:password@localhost:5432/gomoku_production
RAILS_ENV=production
JWT_SECRET_KEY=your-256-bit-secret
RAILS_MASTER_KEY=your-master-key
```

### Docker Setup
```dockerfile
# Dockerfile
FROM ruby:3.4.4-alpine

RUN apk add --no-cache \
  build-base \
  postgresql-dev \
  nodejs \
  yarn

WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN bundle install --jobs 4 --retry 3

COPY . .

EXPOSE 3001
CMD ["rails", "server", "-b", "0.0.0.0", "-p", "3001"]
```

### Production Deployment
```bash
# Asset compilation
RAILS_ENV=production rails assets:precompile

# Database migration
RAILS_ENV=production rails db:migrate

# Start server
RAILS_ENV=production rails server -p 3001
```

## 🔧 Development Tools

### Code Quality
```bash
# Linting
bundle exec rubocop

# Security audit
bundle exec brakeman

# Test coverage
bundle exec rspec --format documentation
```

### Database Management
```bash
# Create and migrate
rails db:create db:migrate

# Seed data
rails db:seed

# Reset database
rails db:drop db:create db:migrate db:seed

# Console access
rails console
```

### Performance Monitoring
```ruby
# Gemfile
gem 'rack-mini-profiler'
gem 'memory_profiler'
gem 'stackprof'

# Development monitoring
# Access /?pp=help for profiling options
```

## 📊 Performance

### Response Times
- **Authentication**: < 100ms
- **Game Creation**: < 50ms
- **Move Processing**: < 200ms
- **Game History**: < 150ms

### Database Optimization
```ruby
# Eager loading to prevent N+1 queries
Game.includes(:user).where(status: :active)

# Database indexes for common queries
add_index :games, [:user_id, :status]
add_index :games, :created_at
```

## 🔒 Security

### CORS Configuration
```ruby
# config/application.rb
config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins Rails.env.development? ? 'http://localhost:3000' : 'https://gomoku.com'
    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true
  end
end
```

### Input Validation
```ruby
# Strong parameters
def user_params
  params.require(:user).permit(:name, :email, :password, :password_confirmation)
end

def move_params
  params.require(:move).permit(:row, :col)
end
```

### Rate Limiting
```ruby
# Gemfile
gem 'rack-attack'

# config/application.rb
Rack::Attack.throttle('api_requests', limit: 300, period: 5.minutes) do |req|
  req.ip if req.path.start_with?('/api/')
end
```
