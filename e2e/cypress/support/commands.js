// ***********************************************
// This file contains custom Cypress commands
// for Gomoku application testing
// ***********************************************

// Authentication Commands
// =======================

/**
 * Custom command to register a new user via UI
 */
Cypress.Commands.add('registerUser', (userData = {}) => {
  const defaultData = {
    name: 'Test User',
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    password_confirmation: 'password123'
  }
  
  const user = { ...defaultData, ...userData }
  
  cy.visit('/')
  
  // Click sign in/up button to open auth modal
  cy.get('[data-testid="auth-button"], button').contains(/sign|login|auth/i).first().click()
  
  // Switch to register mode if not already there
  cy.get('body').then($body => {
    if ($body.find('button:contains("Sign up"), button:contains("Create Account")').length > 0) {
      cy.get('button').contains(/sign up|create account/i).click()
    }
  })
  
  // Wait for register form
  cy.get('form').should('be.visible')
  
  // Fill out registration form
  cy.get('input[type="text"]').first().clear().type(user.name)
  cy.get('input[type="text"]').last().clear().type(user.username)
  cy.get('input[type="email"]').clear().type(user.email)
  cy.get('input[type="password"]').first().clear().type(user.password)
  cy.get('input[type="password"]').last().clear().type(user.password_confirmation)
  
  // Submit form
  cy.get('button[type="submit"]').contains(/create|register|sign up/i).click()
  
  // Wait for successful registration
  cy.url().should('not.contain', 'auth')
  
  return cy.wrap(user)
})

/**
 * Custom command to login a user via UI
 */
Cypress.Commands.add('loginUser', (email = 'test@example.com', password = 'password123') => {
  cy.visit('/')
  
  // Click sign in button to open auth modal
  cy.get('[data-testid="auth-button"], button').contains(/sign|login|auth/i).first().click()
  
  // Ensure we're in login mode
  cy.get('body').then($body => {
    if ($body.find('button:contains("Sign in"), button:contains("Login")').length > 0) {
      cy.get('button').contains(/sign in|login/i).click()
    }
  })
  
  // Wait for login form
  cy.get('form').should('be.visible')
  
  // Fill out login form
  cy.get('input[type="email"]').clear().type(email)
  cy.get('input[type="password"]').clear().type(password)
  
  // Submit form
  cy.get('button[type="submit"]').contains(/sign in|login/i).click()
  
  // Wait for successful login
  cy.url().should('not.contain', 'auth')
})

/**
 * Custom command to logout user
 */
Cypress.Commands.add('logoutUser', () => {
  // Look for logout/profile button and click it
  cy.get('body').then($body => {
    if ($body.find('[data-testid="user-menu"], [data-testid="logout-button"]').length > 0) {
      cy.get('[data-testid="user-menu"], [data-testid="logout-button"]').first().click()
    } else {
      // Fallback: look for button with logout text
      cy.get('button').contains(/logout|sign out/i).click()
    }
  })
})

// API Commands
// ============

/**
 * Custom command to make authenticated API requests
 */
Cypress.Commands.add('apiRequest', (method, url, body = null, headers = {}) => {
  const token = window.localStorage.getItem('gomoku_token')
  
  const requestOptions = {
    method,
    url: `${Cypress.env('API_BASE_URL')}${url}`,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...headers
    },
    failOnStatusCode: false
  }
  
  if (body) {
    requestOptions.body = body
  }
  
  return cy.request(requestOptions)
})

/**
 * Custom command to reset test database
 */
Cypress.Commands.add('resetDatabase', () => {
  return cy.task('resetDatabase')
})

/**
 * Custom command to seed test data
 */
Cypress.Commands.add('seedTestData', () => {
  // Create a test user via API
  return cy.apiRequest('POST', '/auth/register', {
    user: {
      name: 'Test User',
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      password_confirmation: 'password123'
    }
  })
})

// UI Interaction Commands
// =======================

/**
 * Custom command to wait for page to be fully loaded
 */
Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('body').should('be.visible')
  cy.document().should('have.property', 'readyState', 'complete')
})

/**
 * Custom command to start a new game
 */
Cypress.Commands.add('startNewGame', (difficulty = 'medium') => {
  cy.get('[data-testid="new-game-button"], button').contains(/new game|start/i).click()
  
  // Select difficulty if options are available
  cy.get('body').then($body => {
    if ($body.find(`[data-testid="difficulty-${difficulty}"]`).length > 0) {
      cy.get(`[data-testid="difficulty-${difficulty}"]`).click()
    }
  })
  
  // Confirm game start if needed
  cy.get('body').then($body => {
    if ($body.find('button:contains("Start"), button:contains("Begin")').length > 0) {
      cy.get('button').contains(/start|begin/i).click()
    }
  })
})

/**
 * Custom command to make a move on the game board
 */
Cypress.Commands.add('makeMove', (row, col) => {
  cy.get(`[data-testid="cell-${row}-${col}"], [data-row="${row}"][data-col="${col}"]`)
    .should('be.visible')
    .click()
})

// Visual Testing Commands
// =======================

/**
 * Custom command to take a screenshot with a descriptive name
 */
Cypress.Commands.add('screenshotWithName', (name) => {
  cy.screenshot(name, { capture: 'viewport' })
})

/**
 * Custom command to check if element is in viewport
 */
Cypress.Commands.add('isInViewport', { prevSubject: true }, (subject) => {
  cy.window().then(window => {
    const rect = subject[0].getBoundingClientRect()
    
    expect(rect.top).to.be.at.least(0)
    expect(rect.left).to.be.at.least(0)
    expect(rect.bottom).to.be.at.most(window.innerHeight)
    expect(rect.right).to.be.at.most(window.innerWidth)
  })
  
  return cy.wrap(subject)
})

// Development Helpers
// ===================

/**
 * Custom command to wait for servers to be ready
 */
Cypress.Commands.add('waitForServers', () => {
  // Wait for backend to be ready
  cy.request({
    url: Cypress.env('BACKEND_URL'),
    timeout: 30000,
    retryOnStatusCodeFailure: true
  }).then(response => {
    expect(response.status).to.be.oneOf([200, 204])
  })
  
  // Wait for frontend to be ready
  cy.visit('/')
  cy.waitForPageLoad()
}) 