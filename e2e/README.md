# Gomoku E2E Integration Tests

This directory contains comprehensive end-to-end integration tests for the Gomoku application using **Cypress**. The tests verify the complete user journey from authentication to gameplay across both the React frontend and Rails backend.

## 🚀 Quick Start

### 1. Setup Test Environment
```bash
# Install dependencies and setup test database
npm run test:setup
```

### 2. Run Tests Interactively
```bash
# Start test servers and open Cypress UI
npm run test:e2e:open
```

### 3. Run Tests Headlessly
```bash
# Run all tests in headless mode (CI/CD ready)
npm run test:e2e
```

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run test:setup` | One-time setup: install dependencies, configure test database |
| `npm run test:e2e:open` | Start servers and open Cypress interactive mode |
| `npm run test:e2e` | Run all tests headlessly (perfect for CI/CD) |
| `npm run test:servers:start` | Manually start test servers on ports 3002/3003 |
| `npm run test:servers:stop` | Stop test servers |
| `npm run cypress:open` | Open Cypress (requires servers to be running) |
| `npm run cypress:run` | Run Cypress headlessly (requires servers to be running) |

## 🏗️ Architecture

### Test-Specific Ports
- **Frontend**: `http://localhost:3002` (React app for testing)
- **Backend**: `http://localhost:3003` (Rails API for testing)
- **Development ports remain unchanged** (3000/3001)

### Directory Structure
```
e2e/
├── cypress/
│   ├── e2e/                    # Test specifications
│   │   ├── authentication.cy.js  # User auth flow tests
│   │   └── game-flow.cy.js       # Gameplay tests
│   ├── support/                # Custom commands and utilities
│   │   ├── commands.js          # Reusable test commands
│   │   └── e2e.js              # Global configuration
│   └── fixtures/               # Test data
│       └── users.json          # Sample user accounts
├── scripts/                    # Test automation scripts
│   ├── start-test-servers.js   # Server management
│   └── setup-test-environment.js # Environment setup
└── cypress.config.js           # Cypress configuration
```

## 🧪 Test Coverage

### Authentication Flow (`authentication.cy.js`)
- ✅ User registration with valid data
- ✅ Registration validation errors
- ✅ Duplicate email prevention
- ✅ User login with valid credentials
- ✅ Invalid login error handling
- ✅ User logout functionality
- ✅ Session persistence across page refresh
- ✅ OAuth UI elements (Google/GitHub buttons)

### Game Flow (`game-flow.cy.js`)
- ✅ Game board display and interface
- ✅ Difficulty selection options
- ✅ New game initialization
- ✅ Player move mechanics
- ✅ AI response handling
- ✅ Game state management
- ✅ Game reset functionality
- ✅ Responsive design (mobile/tablet/desktop)

### Custom Commands (`commands.js`)
- `cy.registerUser(userData)` - Complete user registration flow
- `cy.loginUser(email, password)` - User login flow
- `cy.logoutUser()` - User logout
- `cy.apiRequest(method, url, body)` - Authenticated API calls
- `cy.resetDatabase()` - Clean test database state
- `cy.waitForServers()` - Ensure servers are ready
- `cy.makeMove(row, col)` - Game board interactions
- `cy.startNewGame(difficulty)` - Game initialization

## 🔧 Configuration

### Test Environment Variables
- `BACKEND_PORT=3003` - Rails test server port
- `FRONTEND_PORT=3002` - React test server port
- `API_BASE_URL=http://localhost:3003/api/v1` - Backend API endpoint
- `RAILS_ENV=test` - Rails test environment

### CORS Configuration
The test setup automatically configures CORS to allow:
- Frontend (port 3002) → Backend (port 3003)
- Development ports remain isolated from testing

### Database Isolation
- Uses separate test database (`RAILS_ENV=test`)
- Database reset before each test suite
- No interference with development data

## 🎯 Advanced Usage

### Running Individual Tests
```bash
# Start servers manually
npm run test:servers:start

# Run specific test file
npx cypress run --spec "cypress/e2e/authentication.cy.js"

# Run tests in specific browser
npx cypress run --browser chrome
```

### Debugging Tests
```bash
# Interactive mode with browser DevTools
npm run cypress:open

# Run with debug logging
DEBUG=cypress:* npm run cypress:run
```

### CI/CD Integration
```yaml
# Example GitHub Actions workflow
- name: E2E Tests
  run: |
    cd e2e
    npm install
    npm run test:setup
    npm run test:e2e
```

## 📸 Screenshots and Videos

- **Screenshots**: Automatically captured on test failures
- **Videos**: Recorded for all test runs in headless mode
- **Location**: `cypress/screenshots/` and `cypress/videos/`
- **Retention**: Useful for debugging failed tests

## 🛠️ Troubleshooting

### Common Issues

**Port conflicts:**
```bash
# Check what's using the ports
lsof -i :3002
lsof -i :3003

# Kill processes if needed
make stop  # From project root
```

**Database issues:**
```bash
# Reset test database
npm run test:db:reset
```

**CORS errors:**
```bash
# Verify CORS configuration includes test ports
# Check backend/config/application.rb
```

**Server startup failures:**
```bash
# Check dependencies
cd ../backend && bundle install
cd ../frontend && yarn install

# Verify environment
direnv allow  # From project root
```

### Debug Mode
Add `cy.pause()` in tests to pause execution and inspect state interactively.

## 🚀 Future Enhancements

Potential improvements for the test suite:

- **API Testing**: Direct backend API validation
- **Performance Testing**: Load testing with Artillery
- **Visual Regression**: Screenshot comparison testing
- **Cross-browser**: Firefox, Safari, Edge testing
- **Mobile Testing**: Real device testing
- **Accessibility**: a11y compliance testing

## 📝 Contributing

When adding new tests:

1. Follow the existing naming convention
2. Use descriptive test names
3. Add appropriate screenshots with `cy.screenshotWithName()`
4. Update fixtures if new test data is needed
5. Document new custom commands

## 🔗 Related Documentation

- [Cypress Documentation](https://docs.cypress.io/)
- [Rails Testing Guide](https://guides.rubyonrails.org/testing.html)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) 