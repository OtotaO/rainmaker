import { vi } from 'vitest';

// Mock environment variables
process.env.ANTHROPIC_API_KEY = 'test-api-key';
process.env.GITHUB_OWNER = 'test-owner';
process.env.GITHUB_REPO = 'test-repo';
process.env.GITHUB_BRANCH = 'main';
process.env.DATABASE_URL = 'postgres://localhost:5432/test';

// Mock Anthropic client
vi.mock('@anthropic-ai/sdk', () => {
  const AnthropicMock = vi.fn().mockImplementation(() => {
    return {
      messages: {
        create: vi.fn().mockResolvedValue({
          id: 'msg_test',
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'This is a test response from the mocked Anthropic API.'
            }
          ],
          model: 'claude-3-5-sonnet-20240620',
          stopReason: 'end_turn',
          usage: {
            inputTokens: 10,
            outputTokens: 20
          }
        })
      }
    };
  });
  
  return {
    default: AnthropicMock,
    Anthropic: AnthropicMock
  };
});

// Mock fs module
vi.mock('fs', () => {
  const mockReadFileSync = vi.fn().mockReturnValue('ANTHROPIC_API_KEY=test-api-key');
  return {
    readFileSync: mockReadFileSync,
    default: {
      readFileSync: mockReadFileSync
    }
  };
});

// Mock path module
vi.mock('path', () => {
  const mockResolve = vi.fn().mockReturnValue('/fake/path/.env');
  return {
    resolve: mockResolve,
    default: {
      resolve: mockResolve
    }
  };
});

// Mock llm-polyglot
vi.mock('llm-polyglot', () => {
  return {
    createLLMClient: vi.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              id: 'msg_test',
              content: [{ type: 'text', text: 'Test response' }]
            })
          }
        }
      };
    })
  };
});

// Mock instructor
vi.mock('@instructor-ai/instructor', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(({ response_model }) => {
              // Return mock data based on the response model
              if (response_model.name === 'EpicTaskBreakdownSchema') {
                return {
                  epics: [
                    {
                      id: 'epic-1',
                      title: 'User Authentication',
                      description: 'Implement user authentication features'
                    }
                  ],
                  tasks: [
                    {
                      id: 'task-1',
                      epicId: 'epic-1',
                      title: 'Implement login form',
                      description: 'Create a login form with email and password fields'
                    },
                    {
                      id: 'task-2',
                      epicId: 'epic-1',
                      title: 'Implement registration form',
                      description: 'Create a registration form with validation'
                    }
                  ]
                };
              } else if (response_model.name === 'MVPPrioritization') {
                return {
                  mvpFeatures: [
                    { id: 'feature-1', title: 'User Registration' },
                    { id: 'feature-2', title: 'User Login' }
                  ],
                  futureFeatures: [
                    { id: 'feature-3', title: 'Password Reset' },
                    { id: 'feature-4', title: 'Social Media Integration' },
                    { id: 'feature-5', title: 'Two-Factor Authentication' }
                  ]
                };
              } else if (response_model.name === 'AcceptanceCriteriaSchema') {
                return {
                  criteria: [
                    'User can enter email and password',
                    'System validates email format',
                    'System checks password strength',
                    'User receives confirmation email after registration'
                  ]
                };
              }
              
              return {};
            })
          }
        }
      };
    })
  };
});
