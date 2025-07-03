describe('Authentication Flow', () => {
  let testUsers

  before(() => {
    // Load test fixtures
    cy.fixture('users').then((users) => {
      testUsers = users
    })
  })

  beforeEach(() => {
    // Reset database and wait for servers to be ready
    cy.resetDatabase()
    cy.waitForServers()
  })

  describe('User Registration', () => {
    it('should successfully register a new user with valid data', () => {
      const user = testUsers.validUser
      
      cy.visit('/')
      cy.screenshotWithName('homepage-initial')
      
      // Open authentication modal
      cy.get('button').contains(/sign|login|auth/i).first().click()
      cy.screenshotWithName('auth-modal-opened')
      
      // Switch to registration mode
      cy.get('button').contains(/sign up|create account/i).click()
      cy.get('form').should('be.visible')
      cy.screenshotWithName('registration-form')
      
      // Fill out registration form
      cy.get('input[type="text"]').first().clear().type(user.name)
      cy.get('input[type="text"]').last().clear().type(user.username)
      cy.get('input[type="email"]').clear().type(user.email)
      cy.get('input[type="password"]').first().clear().type(user.password)
      cy.get('input[type="password"]').last().clear().type(user.password_confirmation)
      
      cy.screenshotWithName('registration-form-filled')
      
      // Submit registration
      cy.get('button[type="submit"]').contains(/create|register|sign up/i).click()
      
      // Verify successful registration
      cy.url().should('not.contain', 'auth')
      cy.get('body').should('not.contain', 'error')
      
      // Check that user is logged in (look for user indicators)
      cy.get('body').then($body => {
        const hasUserIndicator = $body.find('[data-testid="user-menu"], button:contains("logout"), .user-avatar').length > 0
        expect(hasUserIndicator).to.be.true
      })
      
      cy.screenshotWithName('registration-success')
    })

    it('should show validation errors for invalid registration data', () => {
      const user = testUsers.invalidUser
      
      cy.visit('/')
      
      // Open registration form
      cy.get('button').contains(/sign|login|auth/i).first().click()
      cy.get('button').contains(/sign up|create account/i).click()
      
      // Fill out form with invalid data
      cy.get('input[type="text"]').first().clear().type(user.name)
      cy.get('input[type="text"]').last().clear().type(user.username)
      cy.get('input[type="email"]').clear().type(user.email)
      cy.get('input[type="password"]').first().clear().type(user.password)
      cy.get('input[type="password"]').last().clear().type(user.password_confirmation)
      
      // Submit form
      cy.get('button[type="submit"]').contains(/create|register|sign up/i).click()
      
      // Should show validation errors and stay on form
      cy.get('form').should('be.visible')
      cy.get('body').should('contain.text', /error|invalid|required/i)
      
      cy.screenshotWithName('registration-validation-errors')
    })

    it('should prevent registration with duplicate email', () => {
      const user = testUsers.existingUser
      
      // First, register a user via API to create duplicate
      cy.apiRequest('POST', '/auth/register', {
        user: {
          name: user.name,
          username: user.username,
          email: user.email,
          password: user.password,
          password_confirmation: user.password_confirmation
        }
      })
      
      // Now try to register with same email via UI
      cy.visit('/')
      cy.get('button').contains(/sign|login|auth/i).first().click()
      cy.get('button').contains(/sign up|create account/i).click()
      
      // Fill form with duplicate email
      cy.get('input[type="text"]').first().clear().type('Different Name')
      cy.get('input[type="text"]').last().clear().type('differentusername')
      cy.get('input[type="email"]').clear().type(user.email) // Same email
      cy.get('input[type="password"]').first().clear().type(user.password)
      cy.get('input[type="password"]').last().clear().type(user.password_confirmation)
      
      cy.get('button[type="submit"]').contains(/create|register|sign up/i).click()
      
      // Should show error about duplicate email
      cy.get('body').should('contain.text', /already taken|exists|duplicate/i)
      
      cy.screenshotWithName('registration-duplicate-email-error')
    })
  })

  describe('User Login', () => {
    beforeEach(() => {
      // Create a user to login with
      const user = testUsers.validUser
      cy.apiRequest('POST', '/auth/register', {
        user: {
          name: user.name,
          username: user.username,
          email: user.email,
          password: user.password,
          password_confirmation: user.password_confirmation
        }
      })
    })

    it('should successfully login with valid credentials', () => {
      const user = testUsers.validUser
      
      cy.visit('/')
      
      // Open login form
      cy.get('button').contains(/sign|login|auth/i).first().click()
      // Should default to login, but ensure we're in login mode
      cy.get('body').then($body => {
        if ($body.find('button:contains("Sign in"), button:contains("Login")').length > 0) {
          cy.get('button').contains(/sign in|login/i).click()
        }
      })
      
      cy.get('form').should('be.visible')
      cy.screenshotWithName('login-form')
      
      // Fill login form
      cy.get('input[type="email"]').clear().type(user.email)
      cy.get('input[type="password"]').clear().type(user.password)
      
      cy.screenshotWithName('login-form-filled')
      
      // Submit login
      cy.get('button[type="submit"]').contains(/sign in|login/i).click()
      
      // Verify successful login
      cy.url().should('not.contain', 'auth')
      
      // Check for user indicators
      cy.get('body').then($body => {
        const hasUserIndicator = $body.find('[data-testid="user-menu"], button:contains("logout"), .user-avatar').length > 0
        expect(hasUserIndicator).to.be.true
      })
      
      cy.screenshotWithName('login-success')
    })

    it('should show error for invalid credentials', () => {
      cy.visit('/')
      
      // Open login form
      cy.get('button').contains(/sign|login|auth/i).first().click()
      
      // Fill with wrong credentials
      cy.get('input[type="email"]').clear().type('wrong@example.com')
      cy.get('input[type="password"]').clear().type('wrongpassword')
      
      // Submit login
      cy.get('button[type="submit"]').contains(/sign in|login/i).click()
      
      // Should show error and stay on form
      cy.get('form').should('be.visible')
      cy.get('body').should('contain.text', /invalid|error|wrong|incorrect/i)
      
      cy.screenshotWithName('login-invalid-credentials')
    })
  })

  describe('User Logout', () => {
    beforeEach(() => {
      // Register and login a user
      const user = testUsers.validUser
      cy.registerUser(user)
    })

    it('should successfully logout user', () => {
      cy.screenshotWithName('before-logout')
      
      // Find and click logout button
      cy.get('body').then($body => {
        if ($body.find('[data-testid="user-menu"]').length > 0) {
          cy.get('[data-testid="user-menu"]').click()
          cy.get('button').contains(/logout|sign out/i).click()
        } else {
          cy.get('button').contains(/logout|sign out/i).click()
        }
      })
      
      // Verify logout - should show login options again
      cy.get('button').contains(/sign|login|auth/i).should('be.visible')
      
      // Verify no user indicators
      cy.get('body').then($body => {
        const hasUserIndicator = $body.find('[data-testid="user-menu"], .user-avatar').length > 0
        expect(hasUserIndicator).to.be.false
      })
      
      cy.screenshotWithName('after-logout')
    })
  })

  describe('Authentication Persistence', () => {
    it('should maintain login state after page refresh', () => {
      // Register and login user
      const user = testUsers.validUser
      cy.registerUser(user)
      
      // Refresh page
      cy.reload()
      cy.waitForPageLoad()
      
      // Should still be logged in
      cy.get('body').then($body => {
        const hasUserIndicator = $body.find('[data-testid="user-menu"], button:contains("logout"), .user-avatar').length > 0
        expect(hasUserIndicator).to.be.true
      })
      
      cy.screenshotWithName('login-persistence-after-refresh')
    })
  })

  describe('OAuth Authentication', () => {
    it('should display OAuth login options', () => {
      cy.visit('/')
      
      // Open auth modal
      cy.get('button').contains(/sign|login|auth/i).first().click()
      
      // Check for OAuth buttons
      cy.get('button').contains(/google/i).should('be.visible')
      cy.get('button').contains(/github/i).should('be.visible')
      
      cy.screenshotWithName('oauth-options-visible')
    })

    // Note: Actual OAuth testing would require special setup
    // This test just verifies the UI elements are present
  })
}) 