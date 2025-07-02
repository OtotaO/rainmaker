// Type definitions for BAML functions

class ComponentDescription {
  description string
  primary_purpose string
  key_features string[]
  use_cases string[]
}

class PatternAnalysis {
  design_patterns string[]
  architectural_patterns string[]
  quality_indicators string[]
  integration_patterns string[]
  customization_opportunities string[]
  recommendations string[]
}

class QualityAssessment {
  code_quality_score int
  reliability_score int
  reusability_score int
  documentation_score int
  testing_score int
  overall_score int
  strengths string[]
  weaknesses string[]
  recommendations string[]
}

class DialogueQuestion {
  question string
  type string // "single-choice" | "multi-choice" | "text"
  options string[]
  follow_up string?
}

class DialogueQuestions {
  questions DialogueQuestion[]
  reasoning string
}

class TransformationSuggestion {
  type string
  description string
  code_example string?
  priority string // "high" | "medium" | "low"
}

class TransformationSuggestions {
  structural_changes TransformationSuggestion[]
  pattern_adaptations TransformationSuggestion[]
  framework_modifications TransformationSuggestion[]
  configuration_updates TransformationSuggestion[]
  integration_points TransformationSuggestion[]
  summary string
}

class RefinedQuery {
  refined_query string
  key_terms string[]
  filters map<string, string>
  boost_factors map<string, float>
  alternative_queries string[]
  confidence_score float
}
