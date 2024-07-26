// START: [CONST-01]
export const PRD_QUESTIONS = [
  { id: "1_SPEC", text: "What's the feature in one sentence?" },
  { id: "2_SUCCESS_METRIC", text: "How do we measure success in 7 days?" },
  { id: "3_GOTCHAS", text: "What's the one thing that could kill this feature?" },
];

export const PRD_QUESTION_TO_PROMPT: Record<
  (typeof PRD_QUESTIONS)[number]['id'],
  (userInput: string) => string
> = {
  '1_SPEC': (userInput: string) =>
    `Improve this feature description: "${userInput}". Respond in this format:
    Original: [CEO's answer]
    Improved: [Single sentence an engineer can code from]
    Why better: [One sentence explanation]
    <response-text-formatting>Nicely formatted markdown - just return the markdown</response-text-formatting>
    `,
  '2_SUCCESS_METRIC': (userInput: string) =>
    `Refine this success metric: "${userInput}". Respond in this format:
    Original: [CEO's answer]
    Refined metric: [One concrete, measurable metric for the next week]
    Why better: [One sentence on why this metric is superior for quick validation]
    <response-text-formatting>Nicely formatted markdown</response-text-formatting>
    `,
  '3_GOTCHAS': (userInput: string) =>
    `Analyze this potential issue: "${userInput}". Respond in this format:
    Original concern: [CEO's answer]
    Critical risk: [Most likely point of failure (technical, adoption, or business model)]
    Why critical: [One sentence on why addressing this risk is crucial]
    <response-text-formatting>Nicely formatted markdown</response-text-formatting>
  `,
};
// END: [CONST-01]