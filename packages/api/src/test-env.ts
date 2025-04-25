import 'dotenv/config';

console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY);
console.log('API Key length:', process.env.ANTHROPIC_API_KEY?.length || 0);
console.log('API Key prefix:', process.env.ANTHROPIC_API_KEY?.substring(0, 15) || 'none');
