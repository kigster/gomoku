# 🎯 Gomoku AI Game

A full-stack Gomoku game featuring intelligent AI with alpha-beta pruning, user authentication, and comprehensive testing.

This was built in collaboration with Claude 4 Max AI. At the time my knowledge of ReactJS was absolute zero. My knowledge of Rails, of course, is over a decade. The idea was to see how well the "complex moving parts" of a client-server application can be understood and implemented by an AI.

The evaluation function used in the alpha beta pruning is based on the [heuristics function written in C](https://github.com/kigster/gomoku-cpp/blob/master/src/game/heuristics/heuristics.c) by [Konstantin Gredeskoul](https://github.com/kigster) in 2012.

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Enable environment variables
direnv allow

# Install dependencies
cd backend && bundle install
cd ../frontend && yarn install
```

### 2. Start Development Servers

```bash
# Option 1: Start both servers (recommended)
make start

# Option 2: Start individually
make start-backend    # Rails API on :3001
make start-frontend   # React app on :3000
```

### 3. Access the Application

- **Game Interface**: <http://localhost:3000>
- **API Backend**: <http://localhost:3001>

## 🧪 Integration Tests

Run comprehensive end-to-end tests with Cypress:

```bash
cd e2e

# Setup test environment (one-time)
npm run test:setup

# Run tests interactively
npm run test:e2e:open

# Run tests headlessly (CI/CD)
npm run test:e2e
```

## 🤖 AI Algorithm

The AI uses **Alpha-Beta Pruning** with turn-aware evaluation:

- **Easy**: 2-depth search (~50ms response)
- **Medium**: 4-depth search (~200ms response)  
- **Hard**: 5-depth search with iterative deepening (~500ms response)

Key features:

- **Threat Detection**: Immediately responds to winning patterns
- **Defensive Play**: Blocks human threats when it's human's turn
- **Aggressive Play**: Pursues winning opportunities when it's AI's turn

## 🔧 Troubleshooting

**Port conflicts:**

```bash
make stop  # Kill existing servers
```

**Database issues:**

```bash
cd backend && rails db:reset
```

**Dependencies:**

```bash
# Backend
cd backend && bundle install

# Frontend  
cd frontend && yarn install
```

## 📚 Detailed Documentation

- **[Backend API](backend/README.md)**: Rails API, authentication, game logic
- **[Frontend App](frontend/README.md)**: React components, AI integration, styling
- **[E2E Tests](e2e/README.md)**: Cypress testing framework and examples

## 🏗️ Architecture

```
gomoku/
├── backend/     # Rails 8.1 API + PostgreSQL
├── frontend/    # React 18 + TypeScript + Tailwind
├── e2e/         # Cypress integration tests
└── Makefile     # Development automation
```
