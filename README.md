# Rainmaker - Product CoPilot

Rainmaker is an internal tool that accelerates feature development
from idea to code in under an hour.

## Features

- Automated product development lifecycle
- Generates PRD, TRD, and detailed task specifications
- Adaptive guidance throughout the process
- Ensures high-quality, well-documented code
- Type-safe configuration management with formal verification

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
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed for local development
- [Docker](https://docs.docker.com/get-docker/) for running Supabase locally

## Setup

1. Clone the repository:
   ```
   gh repo clone f8n-ai rainmaker
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
     GITHUB_OWNER=f8n-ai
     GITHUB_REPO=rainmaker
     DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
     SUPABASE_URL=your_supabase_url
     SUPABASE_ANON_KEY=your_supabase_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
     ```

4. To obtain a GitHub Personal Access Token:
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Click "Generate new token"
   - Give it a descriptive name and select the "repo" scope
   - Copy the generated token and paste it into your `.env` file

5. Set up local Supabase:
   ```
   # Start local Supabase
   cd packages/api
   supabase start
   
   # This will provide your local Supabase URL and keys
   # Add them to your .env file if they're not automatically set
   ```

6. Initialize the database:
   ```
   cd packages/api
   bun prisma migrate dev
   ```

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
│   │   └── supabase/
│   │       ├── config.toml
│   │       └── seed.sql
│   │   └── prisma/
│   │       └── schema.prisma 
│   ├── frontend/
│   │   └── src/
│   │       ├── components/
│   │       └── App.tsx
│   └── shared/
│       └── src/
│           └── types.ts
├── README.md
├── security-checklist.md
└── package.json
```

## Security

Security is a critical aspect of Rainmaker. The project includes a comprehensive security checklist to ensure all best practices are followed:

1. Review the [security-checklist.md](./security-checklist.md) file for detailed security guidelines
2. Implement all required security measures during development
3. Follow the security checklist before deploying to production

Key security considerations include:
- Row-Level Security (RLS) for Supabase
- API rate limiting
- CAPTCHA for authentication forms
- Web Application Firewall (WAF) protection
- Proper handling of API keys and secrets

## Testing

The project uses Vitest for API and frontend testing, and Jest for schema testing. Run the full test suite with:

```bash
bun test
```

You can also run tests for specific packages:

```bash
# Run schema tests
bun test:schema

# Run API tests
bun test:api

# Run frontend tests
bun test:frontend
```

### Test Structure

- **Schema Tests**: Located in `packages/schema/src/__tests__/`
- **API Tests**: Located in `packages/api/src/__tests__/`
- **Frontend Tests**: Located in `packages/frontend/src/__tests__/`

Each package has its own test configuration:
- API: `packages/api/vitest.config.ts` and `packages/api/vitest.setup.ts`
- Frontend: `packages/frontend/vitest.config.ts` and `packages/frontend/vitest.setup.ts`
- Schema: `packages/schema/jest.config.js`

### Mocking

The test setup includes mocks for:
- Anthropic API client
- File system operations
- GitHub API
- Browser environment for frontend tests

### Running Tests in Watch Mode

During development, you can run tests in watch mode:

```bash
# Watch all tests
bun test:watch

# Watch specific package tests
bun test:api:watch
bun test:frontend:watch
```

## Anthropic Integration

Rainmaker uses Anthropic's Claude AI model to power various features:

1. **PRD Generation**: Generates lean PRDs from user suggestions
2. **Acceptance Criteria**: Generates acceptance criteria for features
3. **Epic Task Breakdown**: Breaks down PRDs into epics and tasks
4. **MVP Prioritization**: Prioritizes features for MVP development

The integration uses the Anthropic Claude 3.5 Sonnet model (claude-3-5-sonnet-20240620) for all AI operations.

### Recent Improvements

The application has been enhanced with the following improvements:

1. **Standardized Testing Framework**: Implemented Vitest for API and frontend testing with proper mocking and configuration.
2. **Robust API Key Handling**: The application now reads the API key directly from the .env file, ensuring consistent usage throughout the application.
3. **Fixed PRD Question Flow**: Fixed an issue where the PRD question flow would repeat the third question instead of proceeding to generate the PRD.
4. **Enhanced Error Handling**: Added validation to ensure all required responses are available before attempting to generate the PRD.
5. **Improved Logging**: Added additional logging to help with debugging and troubleshooting.
6. **Flexible Response Handling**: The acceptanceCriteria service now handles both JSON and plain text responses from the AI model.
7. **Formal Verification**: Added Dafny-based formal verification for the ConfigSetting component, ensuring critical properties like uniqueness constraints and validation rules are mathematically proven.
8. **Configuration Management**: Implemented a type-safe configuration system that supports multiple value types (string, number, boolean) with database persistence.

### Testing the Anthropic Integration

You can test the Anthropic integration by running:

```bash
cd packages/api
bun run src/test-anthropic.ts
```

Or by making a request to the test endpoint:

```bash
curl http://localhost:3001/api/test-anthropic
```

## Troubleshooting

If you encounter any issues:

1. Ensure all environment variables are correctly set in `packages/api/.env`.
2. Verify that your Anthropic API key is valid and has sufficient quota.
2. Check that you have the latest version of Bun installed.
3. If you're having issues with Supabase:
   - Run `supabase status` to verify the local instance is running
   - Try restarting with `supabase stop` followed by `supabase start`
4. For database issues:
   - Check connections with `bun prisma studio`
   - Reset the database with `bun prisma migrate reset` if needed
5. Clear your browser cache and restart the development server.

For more help, please open an issue on the GitHub repository.
