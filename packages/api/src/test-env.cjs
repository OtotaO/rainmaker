// This is a mock version of test-env.js for testing purposes
const fs = require('fs');
const path = require('path');

// Try to load .env file
let apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  try {
    // Always call readFileSync to ensure the mock is triggered
    const envPath = path.resolve(process.cwd(), '.env');
    const envFile = fs.readFileSync(envPath, 'utf8');
    const match = envFile.match(/ANTHROPIC_API_KEY=([^\n]+)/);
    if (match && match[1]) {
      apiKey = match[1];
      process.env.ANTHROPIC_API_KEY = apiKey;
    }
  } catch (error) {
    console.error('Error loading .env file:', error.message);
  }
}

// Default to test-api-key if not found
if (!apiKey) {
  apiKey = 'test-api-key';
  process.env.ANTHROPIC_API_KEY = apiKey;
}

// Log the API key for debugging
console.log('ANTHROPIC_API_KEY:', apiKey);
console.log('API Key length:', apiKey?.length || 0);
console.log('API Key prefix:', apiKey?.substring(0, 15) || 'none');

module.exports = { apiKey };
