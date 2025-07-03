#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Cypress integration test environment...');

// Function to run command and wait for completion
const runCommand = (command, args, cwd, description) => {
  return new Promise((resolve, reject) => {
    console.log(`📦 ${description}...`);
    
    const process = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} completed successfully`);
        resolve();
      } else {
        console.error(`❌ ${description} failed with exit code ${code}`);
        reject(new Error(`${description} failed`));
      }
    });
    
    process.on('error', (error) => {
      console.error(`❌ ${description} failed:`, error);
      reject(error);
    });
  });
};

// Check if directory exists
const checkDirectory = (dir, name) => {
  if (!fs.existsSync(dir)) {
    throw new Error(`❌ ${name} directory not found: ${dir}`);
  }
  console.log(`✅ ${name} directory found`);
};

const setup = async () => {
  try {
    const rootDir = path.join(__dirname, '../..');
    const backendDir = path.join(rootDir, 'backend');
    const frontendDir = path.join(rootDir, 'frontend');
    const e2eDir = path.join(rootDir, 'e2e');
    
    console.log('🏗️  Checking project structure...');
    checkDirectory(backendDir, 'Backend');
    checkDirectory(frontendDir, 'Frontend');
    checkDirectory(e2eDir, 'E2E');
    
    // Install E2E test dependencies
    console.log('\n📦 Installing E2E test dependencies...');
    await runCommand('npm', ['install'], e2eDir, 'E2E dependencies installation');
    
    // Verify backend dependencies
    console.log('\n📦 Checking backend dependencies...');
    const bundlerInstalled = await new Promise((resolve) => {
      const check = spawn('bundle', ['check'], { cwd: backendDir, stdio: 'pipe' });
      check.on('close', (code) => resolve(code === 0));
    });
    
    if (!bundlerInstalled) {
      await runCommand('bundle', ['install'], backendDir, 'Backend dependencies installation');
    } else {
      console.log('✅ Backend dependencies already installed');
    }
    
    // Verify frontend dependencies
    console.log('\n📦 Checking frontend dependencies...');
    const nodeModulesExists = fs.existsSync(path.join(frontendDir, 'node_modules'));
    
    if (!nodeModulesExists) {
      await runCommand('yarn', ['install'], frontendDir, 'Frontend dependencies installation');
    } else {
      console.log('✅ Frontend dependencies already installed');
    }
    
    // Setup test database
    console.log('\n🗄️  Setting up test database...');
    await runCommand('bundle', ['exec', 'rails', 'db:test:prepare'], backendDir, 'Test database setup');
    
    // Update CORS configuration for test environment
    console.log('\n🔧 Updating CORS configuration for test environment...');
    const applicationConfigPath = path.join(backendDir, 'config', 'application.rb');
    
    if (fs.existsSync(applicationConfigPath)) {
      let configContent = fs.readFileSync(applicationConfigPath, 'utf8');
      
      // Check if test port is already in CORS config
      if (!configContent.includes('3002')) {
        console.log('📝 Adding test ports to CORS configuration...');
        
        // Add test ports to CORS origins
        configContent = configContent.replace(
          /origins "http:\/\/\#\{HOST\}:\#\{FRONTEND_PORT\}"/,
          'origins "http://#{HOST}:#{FRONTEND_PORT}", "http://#{HOST}:3002"'
        );
        
        fs.writeFileSync(applicationConfigPath, configContent);
        console.log('✅ CORS configuration updated for test ports');
      } else {
        console.log('✅ CORS configuration already includes test ports');
      }
    }
    
    // Create test environment configuration
    console.log('\n⚙️  Setting up test environment configuration...');
    const testEnvPath = path.join(e2eDir, '.env.test');
    const testEnvContent = `# Cypress Test Environment Configuration
BACKEND_PORT=3003
FRONTEND_PORT=3002
API_BASE_URL=http://localhost:3003/api/v1
CYPRESS_baseUrl=http://localhost:3002
RAILS_ENV=test
NODE_ENV=test
`;
    
    fs.writeFileSync(testEnvPath, testEnvContent);
    console.log('✅ Test environment configuration created');
    
    // Create .gitignore for e2e directory
    console.log('\n📁 Setting up .gitignore for e2e directory...');
    const gitignorePath = path.join(e2eDir, '.gitignore');
    const gitignoreContent = `# Cypress
cypress/videos/
cypress/screenshots/
cypress/downloads/

# Dependencies
node_modules/

# Environment
.env.test.local
.env.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS
.DS_Store
Thumbs.db
`;
    
    fs.writeFileSync(gitignorePath, gitignoreContent);
    console.log('✅ .gitignore created for e2e directory');
    
    console.log('\n🎉 Test environment setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start test servers: npm run test:servers:start');
    console.log('2. Run tests interactively: npm run test:e2e:open');
    console.log('3. Run tests headlessly: npm run test:e2e');
    console.log('\n💡 Tip: You can also run individual commands:');
    console.log('   - npm run cypress:open (after servers are running)');
    console.log('   - npm run cypress:run (after servers are running)');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
};

// Run setup
setup(); 