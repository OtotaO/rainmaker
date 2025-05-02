# Rainmaker Frontend

This is the frontend for the Rainmaker application, which provides a user interface for various AI-powered product development features.

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   cd rainmaker
   bun install
   ```

## Running the Frontend

```bash
cd packages/frontend
bun run dev
```

The frontend will be available at http://localhost:3000.

## Features

### PRD Generation

The frontend provides a step-by-step flow for generating Product Requirements Documents (PRDs):

1. **Feature Description**: Define the feature in one sentence
2. **Success Metric**: Define how to measure success in 7 days
3. **Critical Risk**: Identify the one thing that could kill the feature

The frontend communicates with the backend API to generate AI-powered improvements and suggestions for each step.

## Anthropic Integration

The frontend uses the Anthropic API through the backend to power various AI features:

1. **PRD Generation**: Generates lean PRDs from user suggestions
2. **Acceptance Criteria**: Generates acceptance criteria for features
3. **Epic Task Breakdown**: Breaks down PRDs into epics and tasks
4. **MVP Prioritization**: Prioritizes features for MVP development

### Recent Improvements

The Anthropic integration has been enhanced with the following improvements:

1. **Robust API Key Handling**: The application now reads the API key directly from the .env file, ensuring consistent usage throughout the application.
2. **Fixed PRD Question Flow**: Fixed an issue where the PRD question flow would repeat the third question instead of proceeding to generate the PRD. Added a direct "Create PRD Now" button after the third question for a more reliable user experience.
3. **Enhanced Error Handling**: Added robust error handling and fallback mechanisms to ensure users can proceed with PRD generation even when AI responses are incomplete or unavailable.
4. **Improved Logging**: Added additional logging to help with debugging and troubleshooting.


## Development

### API Endpoints

The frontend communicates with the backend API at http://localhost:3001. Make sure the backend is running before using the frontend.

### Testing

```bash
cd packages/frontend
bun run test:themes
```

### E2E Testing

```bash
cd packages/frontend
bun run test:themes:e2e
```
