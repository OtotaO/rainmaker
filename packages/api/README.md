# Rainmaker API

This is the backend API for the Rainmaker application, which provides various AI-powered features for product development.

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   cd rainmaker
   bun install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env` in the `packages/api` directory
   - Add your Anthropic API key to the `.env` file:
     ```
     ANTHROPIC_API_KEY=your_anthropic_api_key_here
     ```
   - You can get an API key from [Anthropic Console](https://console.anthropic.com/)
   - Add your database URL:
     ```
     DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
     ```

## Running the API

```bash
cd packages/api
bun run dev
```

The API will be available at http://localhost:3001.

## Testing the Anthropic Integration

You can test the Anthropic integration by running:

```bash
cd packages/api
bun run src/test-anthropic.ts
```

Or by making a request to the test endpoint:

```bash
curl http://localhost:3001/api/test-anthropic
```

## Recent Improvements

The API has been enhanced with the following improvements:

1. **Robust API Key Handling**: The application now reads the API key directly from the .env file, ensuring consistent usage throughout the application.
2. **Fixed PRD Question Flow**: Fixed an issue where the PRD question flow would repeat the third question instead of proceeding to generate the PRD.
3. **Enhanced Error Handling**: Added validation to ensure all required responses are available before attempting to generate the PRD.
4. **Improved Logging**: Added additional logging to help with debugging and troubleshooting.

## API Endpoints

### Anthropic

- `POST /api/anthropic`: Send a message to Anthropic's Claude model
  - Request body:
    ```json
    {
      "messages": [
        {
          "role": "user",
          "content": "Your message here"
        }
      ]
    }
    ```
  - Response:
    ```json
    {
      "message": "Claude's response"
    }
    ```

### PRD Generation

- `POST /api/prd/generateFromSuggestions`: Generate a lean PRD from user suggestions
  - Request body:
    ```json
    {
      "improvedDescription": "Feature description",
      "successMetric": "Success metric",
      "criticalRisk": "Critical risk"
    }
    ```
  - Response: A structured PRD object

## Anthropic Integration

The Anthropic integration is used throughout the application for various AI-powered features:

1. **PRD Generation**: Generates lean PRDs from user suggestions
2. **Acceptance Criteria**: Generates acceptance criteria for features
3. **Epic Task Breakdown**: Breaks down PRDs into epics and tasks
4. **MVP Prioritization**: Prioritizes features for MVP development

The integration uses the Anthropic Claude 3.7 Sonnet model (claude-3-7-sonnet-latest) for all AI operations.

### API Key Handling

The application requires special handling for the Anthropic API key to ensure proper authentication:

- The Anthropic API key is read directly from the .env file in server.ts
- The key undergoes thorough sanitization to remove any whitespace, quotes, or other characters that might affect authentication
- This approach prevents common authentication errors that can occur when API keys are passed through multiple layers of the application

**Note for developers**: If you encounter "invalid x-api-key" authentication errors despite having a valid API key, ensure your key is properly formatted in the .env file (no trailing whitespace, quotes, or invisible characters). The application performs sanitization, but proper formatting in the source file is recommended.
