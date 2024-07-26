// START: [03-ISSID-FE-2.1, 03-ISSID-FE-2.2]
import type React from 'react';
import { IssueSelectionForm } from './IssueSelectionForm';
import type { IssueSelectionWrapperProps } from '../types';

export const IssueSelectionWrapper: React.FC<IssueSelectionWrapperProps> = ({ onIssueSelected }) => (
  <IssueSelectionForm onComplete={onIssueSelected} />
);
// END: [03-ISSID-FE-2.1, 03-ISSID-FE-2.2]