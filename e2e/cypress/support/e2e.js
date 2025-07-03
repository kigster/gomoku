// ***********************************************************
// This file is processed and loaded automatically before test files.
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR warnings in command log
const app = window.top;
if (!app.document.head.querySelector('[data-hide-command-log-request]')) {
  const style = app.document.createElement('style');
  style.innerHTML =
    '.command-name-request, .command-name-xhr { display: none }';
  style.setAttribute('data-hide-command-log-request', '');
  app.document.head.appendChild(style);
}

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing the test on certain known errors
  // that don't affect test functionality
  
  // React Hot Reload warnings
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false
  }
  
  // Network/CORS errors that might be transient
  if (err.message.includes('NetworkError') || err.message.includes('fetch')) {
    return false
  }
  
  // Don't fail on console warnings
  if (err.message.includes('Warning:')) {
    return false
  }
  
  // Return false to prevent the error from failing this test
  return true
})

// Custom assertions
chai.use((chai, utils) => {
  chai.Assertion.addMethod('beVisible', function () {
    const obj = this._obj
    const isVisible = obj.is(':visible') && obj.css('opacity') !== '0'
    
    this.assert(
      isVisible,
      'expected #{this} to be visible',
      'expected #{this} to not be visible',
      true,
      isVisible
    )
  })
}) 