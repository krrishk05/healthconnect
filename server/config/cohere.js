const { CohereClient } = require('cohere-ai');

if (!process.env.COHERE_API_KEY) {
  console.error('COHERE_API_KEY is not defined in environment variables');
  throw new Error('COHERE_API_KEY is required');
}

// Initialize the Cohere client with your API key
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

// Test the connection
cohere.chat({
  message: 'test',
  model: 'command-light',
}).catch(error => {
  console.error('Error initializing Cohere client:', error);
});

module.exports = cohere; 