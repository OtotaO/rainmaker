# Rainmaker - AI Product Team

Rainmaker is an internal tool that accelerates feature development
from idea to code in under an hour.

## Features

- Automated product development lifecycle
- Generates PRD, TRD, and detailed task specifications
- Adaptive guidance throughout the process
- Ensures high-quality, well-documented code

## How It Works

1. Input your feature idea
2. Follow Rainmaker's prompts and guidance
3. Review and approve generated documents
4. Implement code based on detailed specifications

## Benefits

- Rapid feature development
- Consistent product documentation
- Improved code quality and documentation
- Reduced time-to-market

## Prerequisites

- [Bun](https://bun.sh/) installed on your system

## Setup

1. Clone the repository:
   ```
   gh repo clone unscene-inc rainmaker
   cd rainmaker
   ```

2. Install dependencies:
   ```
   bun install
   ```

3. Set up environment variables:
   - Copy `packages/api/.env.example` to `packages/api/.env`
   - Fill in the required values in the `.env` file:

     ```
     ANTHROPIC_API_KEY=your_anthropic_api_key_here
     GITHUB_TOKEN=your_github_personal_access_token_here
     GITHUB_OWNER=unscene-inc
     GITHUB_REPO=rainmaker
     ```

4. To obtain a GitHub Personal Access Token:
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Click "Generate new token"
   - Give it a descriptive name and select the "repo" scope
   - Copy the generated token and paste it into your `.env` file

## Running the Application

1. Start the development server:
   ```
   bun run dev
   ```

2. Open your browser and navigate to `http://localhost:3000` to use the application.

## Usage

1. Answer the initial PRD questions provided by the AI.
2. Review and edit the AI-generated responses as needed.
3. Proceed through the refinement process:
   - Epic and Task Breakdown
   - MVP Feature Prioritization
   - Acceptance Criteria Definition
   - Team Review
4. Finalize the MVP plan.
5. Create a GitHub issue with the finalized PRD by clicking the "Create GitHub Issue" button.

## Project Structure

```
.
├── packages/
│   ├── api/
│   │   └── src/
│   │       ├── refinement/
│   │       ├── github/
│   │       └── server.ts
│   ├── frontend/
│   │   └── src/
│   │       ├── components/
│   │       └── App.tsx
│   └── shared/
│       └── src/
│           └── types.ts
├── README.md
└── package.json
```

## Testing

Run the test suite with:

```
bun test
```

## Troubleshooting

If you encounter any issues:

1. Ensure all environment variables are correctly set in `packages/api/.env`.
2. Check that you have the latest version of Bun installed.
3. Clear your browser cache and restart the development server.

For more help, please open an issue on the GitHub repository.