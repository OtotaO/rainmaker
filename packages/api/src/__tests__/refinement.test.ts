// File: packages/api/src/__tests__/refinement.test.ts

import { expect, test, describe } from 'vitest';
import { refinementProcess } from '../refinement';

const { epicTaskBreakdown, mvpPrioritization, generateAcceptanceCriteria } = refinementProcess;

describe('Refinement Process', () => {
  test('epicTaskBreakdown should return epics and tasks', async () => {
    const prd = 'Create a user authentication system with login and registration features.';
    const result = await epicTaskBreakdown(prd);

    expect(result).toHaveProperty('epics');
    expect(result).toHaveProperty('tasks');
    expect(result.epics.length).toBeGreaterThan(0);
    expect(result.tasks.length).toBeGreaterThan(0);
  });

  test('mvpPrioritization should categorize features', async () => {
    const features = [
      'User Registration',
      'User Login',
      'Password Reset',
      'Social Media Integration',
      'Two-Factor Authentication',
    ];
    const result = await mvpPrioritization(features);

    expect(result).toHaveProperty('mvpFeatures');
    expect(result).toHaveProperty('futureFeatures');
    expect(result.mvpFeatures.length + result.futureFeatures.length).toBe(features.length);
  });

  test('generateAcceptanceCriteria should return criteria for a feature', async () => {
    const feature = 'User Registration';
    const result = await generateAcceptanceCriteria(feature);

    expect(result).toHaveProperty('criteria');
    expect(result.criteria.length).toBeGreaterThan(0);
  });
});
