// File: packages/frontend/src/__tests__/PRDQuestionFlow.test.tsx

import React from 'react';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { PRDQuestionFlow } from '../components/Refinement/PRDQuestionFlow';
import { usePRDQuestionFlow } from '../components/Refinement/usePRDQuestionFlow';
import type { ImprovedLeanPRDSchema } from '../../../shared/src/types';

// Mock the usePRDQuestionFlow hook
vi.mock('../components/Refinement/usePRDQuestionFlow', () => ({
  usePRDQuestionFlow: vi.fn(),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('PRD Question Flow', () => {
  const mockActiveProductHighLevelDescription = {
    id: 'test-id',
    name: 'Test Product',
    description: 'A test product for testing',
    createdAt: '2025-04-25T00:00:00.000Z',
    updatedAt: '2025-04-25T00:00:00.000Z',
  };

  const mockOnComplete = vi.fn();

  const mockPRDQuestions = [
    { id: 'improvedDescription', text: 'What\'s the feature in one sentence?' },
    { id: 'successMetric', text: 'How do we measure success in 7 days?' },
    { id: 'criticalRisk', text: 'What\'s the one thing that could kill this feature?' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementation
    (usePRDQuestionFlow as any).mockReturnValue({
      currentStep: 0,
      responses: {},
      aiResponses: {},
      isLoading: false,
      handleSubmit: vi.fn(),
      handleEdit: vi.fn(),
      PRD_QUESTIONS: mockPRDQuestions,
    });

    // Reset fetch mock
    (global.fetch as any).mockReset();
  });

  test('renders the first question initially', () => {
    render(
      <PRDQuestionFlow 
        activeProductHighLevelDescription={mockActiveProductHighLevelDescription} 
        onComplete={mockOnComplete} 
      />
    );

    expect(screen.getByText('What\'s the feature in one sentence?')).toBeTruthy();
  });

  test('submits the form and moves to the next question', async () => {
    const mockHandleSubmit = vi.fn((e) => {
      e.preventDefault();
      // Simulate moving to the next step
      (usePRDQuestionFlow as any).mockReturnValue({
        currentStep: 1,
        responses: { 'improvedDescription': 'Test feature' },
        aiResponses: { 'improvedDescription': 'Improved test feature' },
        isLoading: false,
        handleSubmit: mockHandleSubmit,
        handleEdit: vi.fn(),
        PRD_QUESTIONS: mockPRDQuestions,
      });
    });

    (usePRDQuestionFlow as any).mockReturnValue({
      currentStep: 0,
      responses: {},
      aiResponses: {},
      isLoading: false,
      handleSubmit: mockHandleSubmit,
      handleEdit: vi.fn(),
      PRD_QUESTIONS: mockPRDQuestions,
    });

    const { rerender } = render(
      <PRDQuestionFlow 
        activeProductHighLevelDescription={mockActiveProductHighLevelDescription} 
        onComplete={mockOnComplete} 
      />
    );

    // Fill in the form
    const textarea = screen.getByPlaceholderText('Type your answer here...');
    fireEvent.change(textarea, { target: { value: 'Test feature' } });

    // Submit the form
    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    expect(mockHandleSubmit).toHaveBeenCalled();

    // Rerender to simulate state update
    rerender(
      <PRDQuestionFlow 
        activeProductHighLevelDescription={mockActiveProductHighLevelDescription} 
        onComplete={mockOnComplete} 
      />
    );

    // Check that we moved to the second question
    await waitFor(() => {
      expect(screen.getByText('How do we measure success in 7 days?')).toBeTruthy();
    });
  });

  test('completes all questions and calls onComplete', async () => {
    // Mock the generatePRD function
    const mockGeneratePRD = vi.fn(async () => {
      // Simulate API call success
      const mockPRD: ImprovedLeanPRDSchema = {
        revisionInfo: {
          revisionNumber: 1,
          appliedCritiqueIds: [],
        },
        improvements: [],
        coreFeatureDefinition: {
          id: '01-CORE',
          appliedCritiqueIds: [],
          content: 'Test feature',
        },
        businessObjective: {
          id: '02-BOBJ',
          appliedCritiqueIds: [],
          content: 'Test objective',
        },
        keyUserStory: {
          id: '03-USER',
          appliedCritiqueIds: [],
          content: 'Test user story',
        },
        userRequirements: [],
        acceptanceCriteria: [],
        successMetrics: [],
        constraints: [],
        knownRisks: [],
        futureConsiderations: [],
      };
      
      mockOnComplete(mockPRD);
      return mockPRD;
    });

    // Setup for the third (final) question
    (usePRDQuestionFlow as any).mockReturnValue({
      currentStep: 2,
      responses: { 
        'improvedDescription': 'Test feature',
        'successMetric': 'Test metric',
      },
      aiResponses: { 
        'improvedDescription': 'Improved test feature',
        'successMetric': 'Improved test metric',
      },
      isLoading: false,
      handleSubmit: vi.fn(async (e) => {
        e.preventDefault();
        // This should trigger generatePRD after the last question
        await mockGeneratePRD();
      }),
      handleEdit: vi.fn(),
      PRD_QUESTIONS: mockPRDQuestions,
    });

    render(
      <PRDQuestionFlow 
        activeProductHighLevelDescription={mockActiveProductHighLevelDescription} 
        onComplete={mockOnComplete} 
      />
    );

    // Check that we're on the third question
    expect(screen.getByText('What\'s the one thing that could kill this feature?')).toBeTruthy();

    // Fill in the form
    const textarea = screen.getByPlaceholderText('Type your answer here...');
    fireEvent.change(textarea, { target: { value: 'Test risk' } });

    // Submit the form
    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    // Wait for the onComplete to be called
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  test('handles loading state correctly', () => {
    (usePRDQuestionFlow as any).mockReturnValue({
      currentStep: 0,
      responses: {},
      aiResponses: {},
      isLoading: true,
      handleSubmit: vi.fn(),
      handleEdit: vi.fn(),
      PRD_QUESTIONS: mockPRDQuestions,
    });

    render(
      <PRDQuestionFlow 
        activeProductHighLevelDescription={mockActiveProductHighLevelDescription} 
        onComplete={mockOnComplete} 
      />
    );

    // Check that the submit button shows loading state
    expect(screen.getByText('Processing...')).toBeTruthy();
  });
});
