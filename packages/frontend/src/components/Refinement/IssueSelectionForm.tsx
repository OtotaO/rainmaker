// START: [03-ISSID-FE-2.1, 03-ISSID-FE-2.2, 03-ISSID-EH-5.1, 03-ISSID-EH-5.2, 03-ISSID-EH-5.3, 03-ISSID-EH-5.4, 03-ISSID-EH-5.5]
import type React from 'react';
import { useState, useEffect } from 'react';

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
}

interface IssueSelectionFormProps {
  onComplete: (selectedIssue: GitHubIssue) => void;
}

export const IssueSelectionForm: React.FC<IssueSelectionFormProps> = ({ onComplete }) => {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null);
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (owner && repo) {
      fetchIssues();
    }
  }, [owner, repo]);

  const fetchIssues = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:3001/api/github-issues?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch GitHub issues');
      }
      const data = await response.json();
      setIssues(data.issues);
      if (data.issues.length === 0) {
        setError('No open issues found for this repository.');
      }
    } catch (error) {
      console.error('Failed to fetch GitHub issues:', error);
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) {
      setError('Please select an issue before proceeding.');
      return;
    }
    onComplete(selectedIssue);
  };

  return (
    <form onSubmit={handleSubmit} className="issue-selection-form">
      <div className="form-group">
        <label htmlFor="owner">GitHub Owner:</label>
        <input
          id="owner"
          type="text"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="e.g., octocat"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="repo">Repository Name:</label>
        <input
          id="repo"
          type="text"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          placeholder="e.g., Hello-World"
          required
        />
      </div>
      <button type="button" onClick={fetchIssues} disabled={isLoading}>
        {isLoading ? 'Fetching Issues...' : 'Fetch Issues'}
      </button>
      {error && <div className="error-message">{error}</div>}
      {issues.length > 0 && (
        <IssueList issues={issues} onSelect={setSelectedIssue} selectedIssue={selectedIssue} />
      )}
      <button type="submit" disabled={!selectedIssue || isLoading}>
        Confirm Issue Selection
      </button>
    </form>
  );
};

interface IssueListProps {
  issues: GitHubIssue[];
  onSelect: (issue: GitHubIssue) => void;
  selectedIssue: GitHubIssue | null;
}

const IssueList: React.FC<IssueListProps> = ({ issues, onSelect, selectedIssue }) => {
  return (
    <ul className="issue-list">
      {issues.map(issue => (
        <li key={issue.id} className={`issue-item ${selectedIssue?.id === issue.id ? 'selected' : ''}`}>
          <label>
            <input
              type="radio"
              name="selectedIssue"
              checked={selectedIssue?.id === issue.id}
              onChange={() => onSelect(issue)}
            />
            <span className="issue-title">{issue.title}</span>
            <span className="issue-number">#{issue.number}</span>
          </label>
        </li>
      ))}
    </ul>
  );
};
// END: [03-ISSID-FE-2.1, 03-ISSID-FE-2.2, 03-ISSID-EH-5.1, 03-ISSID-EH-5.2, 03-ISSID-EH-5.3, 03-ISSID-EH-5.4, 03-ISSID-EH-5.5] [double check: This implementation provides a complete IssueSelectionForm component with error handling, loading states, and a nested IssueList component. It addresses all specified requirements including GitHub API failure handling, handling cases with no open issues, client-side validation for issue selection, and clear error messaging. The code is now complete and ready to be used without any placeholders or omissions.]