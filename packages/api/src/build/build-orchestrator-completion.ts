// Completion for build-orchestrator-service.ts
// This contains the missing end of the generateBuildSummary method

export const buildSummaryCompletion = `
      'Run tests and ensure everything works',
      'Deploy when ready!'
    ];

    return {
      totalFiles: generatedFiles.length,
      totalIssues: createdIssues.length,
      estimatedSetupTime: setupTime,
      nextSteps,
    };
  }
}

// Create and export a singleton instance
export const buildOrchestratorService = new BuildOrchestratorService();
`;
