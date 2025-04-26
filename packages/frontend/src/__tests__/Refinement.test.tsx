// File: packages/frontend/src/__tests__/Refinement.test.tsx

import React from 'react';
import { expect, test, describe } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react';
import Refinement from '../components/Refinement';

// Mock document object for testing
global.document = {
  body: {},
  createElement: () => ({}),
  documentElement: {},
} as any;

describe('Refinement Component', () => {
  test('renders initial review step', () => {
    const { getByText, getByRole } = render(<Refinement initialPRD="Test PRD" onComplete={() => { }} />);

    expect(getByText('Initial PRD Review')).toBeTruthy();
    expect(getByRole('button', { name: 'Proceed to Epic/Task Breakdown' })).toBeTruthy();
  });

  test('proceeds through refinement steps', async () => {
    const mockOnComplete = jest.fn()
    const { getByText, getByRole } = render(<Refinement initialPRD="Test PRD" onComplete={mockOnComplete} />);

    // Initial Review
    fireEvent.click(getByRole('button', { name: 'Proceed to Epic/Task Breakdown' }));

    // Epic and Task Breakdown
    await waitFor(() => expect(getByText('Epic and Task Breakdown')).toBeTruthy());
    fireEvent.click(getByRole('button', { name: 'Proceed to MVP Prioritization' }));

    // MVP Prioritization
    await waitFor(() => expect(getByText('MVP Feature Prioritization')).toBeTruthy());
    fireEvent.click(getByRole('button', { name: 'Proceed to Acceptance Criteria' }));

    // Acceptance Criteria
    await waitFor(() => expect(getByText('Acceptance Criteria')).toBeTruthy());
    fireEvent.click(getByRole('button', { name: 'Proceed to Team Review' }));

    // Team Review
    await waitFor(() => expect(getByText('Team Review')).toBeTruthy());
    fireEvent.click(getByRole('button', { name: 'Finalize MVP' }));

    // Finalize MVP
    await waitFor(() => expect(getByText('Finalize MVP')).toBeTruthy());
    fireEvent.click(getByRole('button', { name: 'Create GitHub Issue' }));

    // Check if onComplete was called
    expect(mockOnComplete).toHaveBeenCalled();
  });
});
