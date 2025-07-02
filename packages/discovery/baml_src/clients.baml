// Client configurations for LLM providers

client<llm> GPT4 {
  provider openai
  options {
    model "gpt-4"
    api_key env.OPENAI_API_KEY
    max_tokens 2000
    temperature 0.1
  }
}

client<llm> GPT35 {
  provider openai
  options {
    model "gpt-3.5-turbo"
    api_key env.OPENAI_API_KEY
    max_tokens 1500
    temperature 0.1
  }
}

client<llm> Claude {
  provider anthropic
  options {
    model "claude-3-sonnet-20240229"
    api_key env.ANTHROPIC_API_KEY
    max_tokens 2000
    temperature 0.1
  }
}
