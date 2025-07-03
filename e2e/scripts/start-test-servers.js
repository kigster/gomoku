#!/usr/bin/env node

const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

// Test-specific ports (different from development)
const BACKEND_PORT = 3003;
const FRONTEND_PORT = 3002;

// Server health check URLs
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

let backendProcess = null;
let frontendProcess = null;

console.log('🚀 Starting test servers for Cypress integration tests...');
console.log(`🔧 Backend will run on port ${BACKEND_PORT}`);
console.log(`🎨 Frontend will run on port ${FRONTEND_PORT}`);

// Graceful shutdown handler
const shutdown = async (signal) => {
  console.log(`\n📡 Received ${signal}, shutting down test servers...`);
  
  if (frontendProcess) {
    console.log('🛑 Stopping React frontend...');
    frontendProcess.kill('SIGTERM');
  }
  
  if (backendProcess) {
    console.log('🛑 Stopping Rails backend...');
    backendProcess.kill('SIGTERM');
  }
  
  // Wait a bit for graceful shutdown
  setTimeout(() => {
    process.exit(0);
  }, 2000);
};

// Handle shutdown signals
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGHUP', () => shutdown('SIGHUP'));

// Function to wait for server to be ready
const waitForServer = async (url, name, maxRetries = 30) => {
  console.log(`⏳ Waiting for ${name} to be ready at ${url}...`);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url, { timeout: 5000 });
      if (response.status === 200 || response.status === 204) {
        console.log(`✅ ${name} is ready!`);
        return true;
      }
    } catch (error) {
      // Server not ready yet, wait and retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error(`❌ ${name} failed to start after ${maxRetries} retries`);
};

// Start Rails backend server
const startBackend = () => {
  return new Promise((resolve, reject) => {
    console.log('🔧 Starting Rails backend server...');
    
    const backendDir = path.join(__dirname, '../../backend');
    
    backendProcess = spawn('bundle', ['exec', 'rails', 'server', '-p', BACKEND_PORT], {
      cwd: backendDir,
      stdio: ['inherit', 'pipe', 'pipe'],
      env: {
        ...process.env,
        RAILS_ENV: 'test',
        PORT_RAILS: BACKEND_PORT,
        HOST_RAILS: 'localhost',
        PORT_REACT: FRONTEND_PORT  // For CORS configuration
      }
    });
    
    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Puma starting') || output.includes('Use Ctrl-C')) {
        console.log('🔧 Rails backend starting...');
      }
      // Uncomment to see all backend output:
      // process.stdout.write(`[Backend] ${output}`);
    });
    
    backendProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error(`[Backend Error] ${error}`);
    });
    
    backendProcess.on('close', (code) => {
      console.log(`🔧 Rails backend process exited with code ${code}`);
      if (code !== 0 && code !== null) {
        reject(new Error(`Rails backend failed with exit code ${code}`));
      }
    });
    
    backendProcess.on('error', (error) => {
      console.error('❌ Failed to start Rails backend:', error);
      reject(error);
    });
    
    // Wait for backend to be ready
    waitForServer(BACKEND_URL, 'Rails Backend')
      .then(() => resolve())
      .catch(reject);
  });
};

// Start React frontend server
const startFrontend = () => {
  return new Promise((resolve, reject) => {
    console.log('🎨 Starting React frontend server...');
    
    const frontendDir = path.join(__dirname, '../../frontend');
    
    frontendProcess = spawn('yarn', ['start'], {
      cwd: frontendDir,
      stdio: ['inherit', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PORT: FRONTEND_PORT,
        BROWSER: 'none',  // Don't auto-open browser
        REACT_APP_API_BASE_URL: `http://localhost:${BACKEND_PORT}/api/v1`
      }
    });
    
    frontendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('webpack compiled') || output.includes('compiled successfully')) {
        console.log('🎨 React frontend compiled successfully');
      }
      // Uncomment to see all frontend output:
      // process.stdout.write(`[Frontend] ${output}`);
    });
    
    frontendProcess.stderr.on('data', (data) => {
      const error = data.toString();
      // Filter out common webpack warnings that don't affect functionality
      if (!error.includes('Warning:') && !error.includes('DeprecationWarning')) {
        console.error(`[Frontend Error] ${error}`);
      }
    });
    
    frontendProcess.on('close', (code) => {
      console.log(`🎨 React frontend process exited with code ${code}`);
      if (code !== 0 && code !== null) {
        reject(new Error(`React frontend failed with exit code ${code}`));
      }
    });
    
    frontendProcess.on('error', (error) => {
      console.error('❌ Failed to start React frontend:', error);
      reject(error);
    });
    
    // Wait for frontend to be ready
    waitForServer(FRONTEND_URL, 'React Frontend')
      .then(() => resolve())
      .catch(reject);
  });
};

// Main startup sequence
const startServers = async () => {
  try {
    // Setup test database first
    console.log('🗄️  Setting up test database...');
    const { spawn: syncSpawn } = require('child_process');
    const dbSetup = syncSpawn('bundle', ['exec', 'rails', 'db:test:prepare'], {
      cwd: path.join(__dirname, '../../backend'),
      stdio: 'inherit',
      env: { ...process.env, RAILS_ENV: 'test' }
    });
    
    await new Promise((resolve, reject) => {
      dbSetup.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Test database ready');
          resolve();
        } else {
          reject(new Error(`Database setup failed with code ${code}`));
        }
      });
    });
    
    // Start backend first
    await startBackend();
    
    // Then start frontend
    await startFrontend();
    
    console.log('\n🎉 Both test servers are ready!');
    console.log(`🔧 Backend: ${BACKEND_URL}`);
    console.log(`🎨 Frontend: ${FRONTEND_URL}`);
    console.log('\n🧪 You can now run Cypress tests:');
    console.log('   npm run cypress:open  (interactive)');
    console.log('   npm run cypress:run   (headless)');
    console.log('\nPress Ctrl+C to stop all servers\n');
    
    // Keep the process alive
    process.stdin.resume();
    
  } catch (error) {
    console.error('❌ Failed to start test servers:', error.message);
    await shutdown('ERROR');
    process.exit(1);
  }
};

// Start the servers
startServers(); 