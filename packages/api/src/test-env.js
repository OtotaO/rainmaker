// This is a mock version of test-env.js for testing purposes
require('dotenv/config');

// Export the API key for tests
const apiKey = process.env.ANTHROPIC_API_KEY || 'test-api-key';

// Log the API key for debugging
console.log('ANTHROPIC_API_KEY:', apiKey);
console.log('API Key length:', apiKey?.length || 0);
console.log('API Key prefix:', apiKey?.substring(0, 15) || 'none');

module.exports = { apiKey };
