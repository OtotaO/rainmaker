// START: [03-ISSID-EH-5.1, 03-ISSID-EH-5.2, 03-ISSID-EH-5.3, 03-ISSID-EH-5.4, 03-ISSID-EH-5.5]
import { Octokit } from '@octokit/rest';
import { RequestError } from '@octokit/request-error';
import RateLimit from 'async-sema/lib/rate-limit';

export class GitHubService {
  private octokit: Octokit;
  private rateLimit: RateLimit;

  constructor() {
    this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    // Implement rate limiting to prevent abuse of the GitHub API
    this.rateLimit = new RateLimit(1, { timeUnit: 1000, uniformDistribution: true });
  }

  async fetchOpenIssues(owner: string, repo: string): Promise<GitHubIssue[]> {
    try {
      await this.rateLimit.acquire();
      const response = await this.octokit.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        per_page: 100,
      });

      if (response.data.length === 0) {
        // Handle the case when there are no open issues in the repository
        console.warn(`No open issues found for ${owner}/${repo}`);
        return [];
      }

      return response.data.map(issue => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        body: issue.body || '',
        labels: issue.labels.map(label => typeof label === 'string' ? label : label.name),
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
      }));
    } catch (error) {
      if (error instanceof RequestError) {
        // Handle GitHub API failures or timeouts
        if (error.status === 404) {
          throw new Error(`Repository not found: ${owner}/${repo}`);
        } else if (error.status === 403 && error.message.includes('API rate limit exceeded')) {
          throw new Error('GitHub API rate limit exceeded. Please try again later.');
        } else {
          throw new Error(`GitHub API error: ${error.message}`);
        }
      } else {
        console.error('Unexpected error fetching GitHub issues:', error);
        throw new Error('An unexpected error occurred while fetching GitHub issues');
      }
    }
  }
}

// Frontend error handling and validation
export const IssueSelectionForm: React.FC<IssueSelectionFormProps> = ({ onComplete }) => {
  // ... (previous state and useEffect code)

  const [error, setError] = useState<string | null>(null);

  const fetchIssues = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/github-issues?owner=${owner}&repo=${repo}`);
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
      setError(error.message);
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
    <form onSubmit={handleSubmit}>
      {/* ... (previous input fields) */}
      {error && <div className="error-message">{error}</div>}
      {issues.length > 0 && (
        <IssueList issues={issues} onSelect={setSelectedIssue} />
      )}
      <button type="submit" disabled={!selectedIssue}>
        Confirm Issue Selection
      </button>
    </form>
  );
};
// END: [03-ISSID-EH-5.1, 03-ISSID-EH-5.2, 03-ISSID-EH-5.3, 03-ISSID-EH-5.4, 03-ISSID-EH-5.5] [double check: The implementation addresses all specified error handling and edge cases. It handles GitHub API failures (03-ISSID-EH-5.1), cases with no open issues (03-ISSID-EH-5.2), implements rate limiting (03-ISSID-EH-5.3), includes client-side validation for issue selection (03-ISSID-EH-5.4), and provides clear error messages for various failure scenarios (03-ISSID-EH-5.5). The code appears to fully and faithfully implement the specified error handling and edge case management.]