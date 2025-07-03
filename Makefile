# Gomoku Game - Development Makefile
# ===================================

.PHONY: help install start start-backend start-frontend stop test clean setup dev logs

PORT_RAILS  := "$(shell bash -c "source .envrc; echo ${PORT_RAILS}")"
PORT_REACT  := "$(shell bash -c "source .envrc; echo ${PORT_REACT}")"

# Default target
help: ## Show this help message
	@echo "Gomoku Game Development Commands"
	@echo "================================"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""

# Setup and Installation
setup: ## Initial project setup (install all dependencies)
	@echo "🚀 Setting up Gomoku development environment..."
	@echo "📦 Installing backend dependencies..."
	cd backend && bundle install
	@echo "📦 Installing frontend dependencies..."
	cd frontend && yarn install
	@echo "🗄️  Setting up database..."
	cd backend && bundle exec rails db:create db:migrate db:seed
	@echo "✅ Setup complete!"

install: ## Install dependencies for both backend and frontend
	@echo "📦 Installing backend dependencies..."
	cd backend && bundle install
	@echo "📦 Installing frontend dependencies..."
	cd frontend && yarn install

install-backend: ## Install backend dependencies only
	@echo "📦 Installing backend dependencies..."
	cd backend && bundle install

install-frontend: ## Install frontend dependencies only
	@echo "📦 Installing frontend dependencies..."
	cd frontend && yarn install

# Development Servers
start: ## Start both backend and frontend development servers
	@echo "🚀 Starting Gomoku development servers..."
	@echo "🔧 Backend Rails API will be available at: http://localhost:$(PORT_RAILS)"
	@echo "🎨 Frontend ReactJS  will be available at: http://localhost:$(PORT_REACT)"
	@echo ""
	@echo "Press Ctrl+C to stop all servers"
	@make -j2 start-backend start-frontend

dev: start ## Alias for start

start-backend: ## Start Rails API server only (port 3001)
	@echo "🔧 Starting Rails API server on port 3001..."
	cd backend && bundle exec rails server -p 3001

start-frontend: ## Start React development server only (port 3000)
	@echo "🎨 Starting React development server on port 3000..."
	cd frontend && yarn start

# Database Operations
db-setup: ## Setup database (create, migrate, seed)
	@echo "🗄️  Setting up database..."
	cd backend && bundle exec rails db:create db:migrate db:seed

db-migrate: ## Run database migrations
	@echo "🗄️  Running database migrations..."
	cd backend && bundle exec rails db:migrate

db-seed: ## Seed database with sample data
	@echo "🌱 Seeding database..."
	cd backend && bundle exec rails db:seed

db-reset: ## Reset database (drop, create, migrate, seed)
	@echo "🗄️  Resetting database..."
	cd backend && bundle exec rails db:drop db:create db:migrate db:seed

# Testing
test: ## Run all tests
	@echo "🧪 Running all tests..."
	@make test-backend
	@echo ""
	@make test-frontend

test-backend: ## Run backend tests (RSpec)
	@echo "🧪 Running backend tests..."
	cd backend && bundle exec rspec

test-frontend: ## Run frontend tests (Jest)
	@echo "🧪 Running frontend tests..."
	cd frontend && yarn test --watchAll=false

test-watch-backend: ## Run backend tests in watch mode
	@echo "🧪 Running backend tests in watch mode..."
	cd backend && bundle exec rspec --format documentation

test-watch-frontend: ## Run frontend tests in watch mode
	@echo "🧪 Running frontend tests in watch mode..."
	cd frontend && yarn test

# Code Quality
lint: ## Run linters for both backend and frontend
	@echo "🔍 Running linters..."
	@make lint-backend
	@make lint-frontend

lint-backend: ## Run backend linter (RuboCop)
	@echo "🔍 Running RuboCop..."
	cd backend && bundle exec rubocop

lint-frontend: ## Run frontend linter (ESLint)
	@echo "🔍 Running ESLint..."
	cd frontend && yarn lint 2>/dev/null || echo "Note: ESLint not configured yet"

format: ## Format code for both backend and frontend
	@echo "✨ Formatting code..."
	@make format-backend
	@make format-frontend

format-backend: ## Format backend code (RuboCop auto-correct)
	@echo "✨ Formatting backend code..."
	cd backend && bundle exec rubocop -A

format-frontend: ## Format frontend code (Prettier)
	@echo "✨ Formatting frontend code..."
	cd frontend && yarn prettier --write src/ 2>/dev/null || echo "Note: Prettier not configured yet"

# Build and Deployment
build: ## Build frontend for production
	@echo "🏗️  Building frontend for production..."
	cd frontend && yarn build

build-backend: ## Precompile backend assets
	@echo "🏗️  Precompiling backend assets..."
	cd backend && bundle exec rails assets:precompile

# Utility Commands
clean: ## Clean temporary files and dependencies
	@echo "🧹 Cleaning temporary files..."
	cd backend && bundle exec rails tmp:clear log:clear
	cd frontend && rm -rf node_modules/.cache 2>/dev/null || true
	@echo "✅ Cleanup complete!"

clean-deep: ## Deep clean (remove node_modules and reinstall)
	@echo "🧹 Deep cleaning..."
	cd frontend && rm -rf node_modules yarn.lock
	cd backend && rm -rf tmp/cache log/*.log
	@make install
	@echo "✅ Deep cleanup complete!"

logs: ## Show recent logs from both servers
	@echo "📋 Recent backend logs:"
	@tail -20 backend/log/development.log 2>/dev/null || echo "No backend logs found"
	@echo ""
	@echo "📋 Frontend development server logs would appear in the terminal when running"

stop: ## Stop all development servers
	@echo "🛑 Stopping development servers..."
	@pkill -f "bundle exec rails server" 2>/dev/null || true
	@pkill -f "react-scripts start" 2>/dev/null || true
	@pkill -f "yarn start" 2>/dev/null || true
	@echo "✅ All servers stopped!"

status: ## Show status of development servers
	@echo "📊 Development Server Status:"
	@echo "=============================="
	@echo ""
	@echo "🔧 Backend (Rails):"
	@pgrep -f "bundle exec rails server" >/dev/null && echo "  ✅ Running" || echo "  ❌ Not running"
	@echo ""
	@echo "🎨 Frontend (React):"
	@pgrep -f "react-scripts start" >/dev/null && echo "  ✅ Running" || echo "  ❌ Not running"
	@echo ""
	@echo "🌐 Ports:"
	@lsof -i :3000 >/dev/null 2>&1 && echo "  ✅ Port 3000 (Frontend) - In use" || echo "  ⚪ Port 3000 (Frontend) - Available"
	@lsof -i :3001 >/dev/null 2>&1 && echo "  ✅ Port 3001 (Backend) - In use" || echo "  ⚪ Port 3001 (Backend) - Available"

# Development Workflow Shortcuts
restart: stop start ## Restart both development servers

restart-backend: ## Restart backend server only
	@echo "🔄 Restarting backend server..."
	@pkill -f "bundle exec rails server" 2>/dev/null || true
	@sleep 2
	@make start-backend

restart-frontend: ## Restart frontend server only
	@echo "🔄 Restarting frontend server..."
	@pkill -f "react-scripts start" 2>/dev/null || true
	@pkill -f "yarn start" 2>/dev/null || true
	@sleep 2
	@make start-frontend

console: ## Open Rails console
	@echo "🔧 Opening Rails console..."
	cd backend && bundle exec rails console

routes: ## Show Rails routes
	@echo "🛤️  Rails Routes:"
	cd backend && bundle exec rails routes

# Git helpers
git-status: ## Show git status for the project
	@echo "📋 Git Status:"
	@git status --short

git-branches: ## Show git branches
	@echo "🌿 Git Branches:"
	@git branch -a

# Docker support (if needed later)
docker-build: ## Build Docker containers (when implemented)
	@echo "🐳 Docker build not implemented yet"

docker-up: ## Start Docker containers (when implemented)
	@echo "🐳 Docker not implemented yet"

# Default development workflow
init: setup start ## Initialize project and start development servers

.DEFAULT_GOAL := help 
