const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    // Test-specific ports (different from development)
    baseUrl: "http://localhost:3002", // React frontend test port

    // Backend API for tests
    env: {
      API_BASE_URL: "http://localhost:3003/api/v1", // Rails backend test port
      BACKEND_URL: "http://localhost:3003",
      FRONTEND_URL: "http://localhost:3002",
    },

    // Viewport settings
    viewportWidth: 1280,
    viewportHeight: 720,

    // Test settings
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,

    // Video and screenshot settings
    video: true,
    screenshotOnRunFailure: true,
    screenshotsFolder: "cypress/screenshots",
    videosFolder: "cypress/videos",

    // Spec patterns
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.js",
    fixturesFolder: "cypress/fixtures",

    // Browser settings
    chromeWebSecurity: false,

    setupNodeEvents(on, config) {
      // implement node event listeners here
      on("task", {
        log(message) {
          console.log(message);
          return null;
        },

        // Task to reset test database
        resetDatabase() {
          return new Promise((resolve, reject) => {
            const { exec } = require("child_process");
            exec(
              "cd ../backend && RAILS_ENV=test bundle exec rails db:drop db:create db:migrate db:seed",
              (error, stdout, stderr) => {
                if (error) {
                  console.error("Database reset failed:", error);
                  reject(error);
                } else {
                  console.log("Database reset successful");
                  resolve(stdout);
                }
              }
            );
          });
        },
      });
    },
  },

  component: {
    devServer: {
      framework: "react",
      bundler: "webpack",
    },
  },
});
