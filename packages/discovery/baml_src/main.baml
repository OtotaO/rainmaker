// Main BAML configuration for Rainmaker Discovery
// This defines the core LLM functions for component analysis and dialogue

// Component description generation
function GenerateComponentDescription(
  name: string,
  language: string,
  framework: string?,
  patterns: string[],
  dependencies: string[],
  apis: string[],
  code_snippet: string
) -> ComponentDescription {
  client GPT4
  prompt #"
    You are an expert software engineer analyzing a code component.
    
    Component Details:
    - Name: {{name}}
    - Language: {{language}}
    {% if framework %}- Framework: {{framework}}{% endif %}
    - Patterns: {{patterns}}
    - Dependencies: {{dependencies}}
    - APIs: {{apis}}
    
    Code Snippet:
    ```{{language}}
    {{code_snippet}}
    ```
    
    Generate a clear, concise description of what this component does and its primary purpose.
    Focus on functionality, not implementation details.
  "#
}

// Intelligent pattern recognition
function AnalyzeCodePatterns(
  code: string,
  language: string,
  framework: string?
) -> PatternAnalysis {
  client GPT4
  prompt #"
    You are an expert code analyst. Analyze the following {{language}} code and identify:
    
    1. Design patterns used (e.g., singleton, factory, observer)
    2. Architectural patterns (e.g., MVC, MVP, component-based)
    3. Code quality indicators (error handling, testing, documentation)
    4. Integration patterns (API calls, database access, authentication)
    5. Customization opportunities (configuration points, extension hooks)
    
    {% if framework %}This code uses the {{framework}} framework.{% endif %}
    
    Code to analyze:
    ```{{language}}
    {{code}}
    ```
    
    Provide specific, actionable insights about the code's structure and patterns.
  "#
}

// Component quality assessment
function AssessComponentQuality(
  name: string,
  code: string,
  has_tests: bool,
  has_documentation: bool,
  dependencies: string[],
  github_stars: int?
) -> QualityAssessment {
  client GPT4
  prompt #"
    You are a senior software engineer evaluating component quality.
    
    Component: {{name}}
    Has Tests: {{has_tests}}
    Has Documentation: {{has_documentation}}
    Dependencies: {{dependencies}}
    {% if github_stars %}GitHub Stars: {{github_stars}}{% endif %}
    
    Code:
    ```
    {{code}}
    ```
    
    Assess this component's quality across these dimensions:
    1. Code Quality (readability, maintainability, best practices)
    2. Reliability (error handling, edge cases, robustness)
    3. Reusability (modularity, configurability, adaptability)
    4. Documentation (clarity, completeness, examples)
    5. Testing (coverage, quality, types of tests)
    
    Provide a score (1-10) for each dimension and overall recommendations.
  "#
}

// Adaptive dialogue generation
function GenerateDialogueQuestions(
  user_query: string,
  category: string,
  previous_responses: string[],
  context: string
) -> DialogueQuestions {
  client GPT4
  prompt #"
    You are an expert product manager helping users refine their requirements.
    
    User's Original Query: "{{user_query}}"
    Category: {{category}}
    Context: {{context}}
    
    {% if previous_responses %}
    Previous Responses:
    {% for response in previous_responses %}
    - {{response}}
    {% endfor %}
    {% endif %}
    
    Generate 3-5 intelligent follow-up questions that will help narrow down the user's needs.
    Focus on:
    1. Technical requirements (performance, scalability, security)
    2. Integration needs (existing systems, APIs, databases)
    3. User experience preferences (UI/UX, accessibility, mobile)
    4. Constraints (budget, timeline, team expertise)
    
    Make questions specific and actionable, not generic.
    Each question should have 3-4 multiple choice options.
  "#
}

// Code transformation suggestions
function SuggestCodeTransformations(
  source_code: string,
  target_patterns: string[],
  target_framework: string?,
  constraints: string[]
) -> TransformationSuggestions {
  client GPT4
  prompt #"
    You are an expert in code transformation and adaptation.
    
    Source Code:
    ```
    {{source_code}}
    ```
    
    Target Patterns: {{target_patterns}}
    {% if target_framework %}Target Framework: {{target_framework}}{% endif %}
    Constraints: {{constraints}}
    
    Suggest specific code transformations to adapt this component:
    1. Structural changes needed
    2. Pattern adaptations required
    3. Framework-specific modifications
    4. Configuration updates
    5. Integration points to modify
    
    Provide concrete, implementable suggestions with code examples.
  "#
}

// Enhanced search query refinement
function RefineSearchQuery(
  original_query: string,
  dialogue_responses: string[],
  user_context: string
) -> RefinedQuery {
  client GPT4
  prompt #"
    You are an expert at understanding developer intent and translating requirements into precise search queries.
    
    Original Query: "{{original_query}}"
    User Context: {{user_context}}
    
    Dialogue Responses:
    {% for response in dialogue_responses %}
    - {{response}}
    {% endfor %}
    
    Based on this information, generate:
    1. A refined, specific search query
    2. Key technical terms to emphasize
    3. Filters to apply (language, framework, patterns)
    4. Boost factors for ranking
    5. Alternative query variations
    
    Focus on capturing the user's true intent, not just their literal words.
  "#
}
