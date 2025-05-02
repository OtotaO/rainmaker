import 'dotenv/config';
import { Anthropic } from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

// Read the API key directly from the .env file
const envFilePath = path.resolve(__dirname, '../.env');
const envFileContent = fs.readFileSync(envFilePath, 'utf8');
// Use a more specific regex to extract just the API key value and trim whitespace
const apiKeyMatch = envFileContent.match(/ANTHROPIC_API_KEY=([^#\n\r]+)/);
let apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : process.env.ANTHROPIC_API_KEY;

// Remove any quotes that might be around the key
if (apiKey) {
  apiKey = apiKey.replace(/^['"]|['"]$/g, '').trim();
}

console.log('API Key length:', apiKey?.length);
console.log('API Key prefix:', apiKey?.substring(0, 15));

const anthropic = new Anthropic({
  apiKey: apiKey,
});

async function testAnthropicAPI() {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-latest',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Say hello!' }]
    });
    console.log('Success:', message);
  } catch (error) {
    console.error('Error:', error);
  }
}

testAnthropicAPI();
