// ./packages/frontend/src/components/Refinement/usePRDQuestionFlow.ts
import { useState } from 'react';
import * as z from 'zod';
import type { infer as zInfer } from 'zod';
import type { ImprovedLeanPRDSchema, ProductHighLevelDescriptionSchema } from '../../../../shared/src/types';

const prdQuestionFlowInput = z.object({
  improvedDescription: z.string(),
  successMetric: z.string(),
  criticalRisk: z.string(),
}).partial();

type prdQuestionFlowInputType = zInfer<typeof prdQuestionFlowInput>

const PRD_QUESTIONS = [
  { id: "improvedDescription", text: "What's the feature in one sentence?" },
  { id: "successMetric", text: "How do we measure success in 7 days?" },
  { id: "criticalRisk", text: "What's the one thing that could kill this feature?" },
] as const;

type QuestionId = typeof PRD_QUESTIONS[number]['id'];

// const techStack = `
// Technologies:

// Frontend: React Native (primary), React (web), Kotlin (Android), Swift (iOS - minimal)
// Backend: Elixir, Rust, Python
// Database: Cassandra, Redis
// Infrastructure: AWS
// `

const PRD_QUESTION_TO_PROMPT: Record<
  QuestionId,
  (userInput: string, productName: string, productDescription: string, ...args: string[]) => string
> = {
  'improvedDescription': (userInput: string, productName: string, productDescription: string) => `
This is a new feature proposal for ${productName}.

Here's a brief outline of ${productName}'s current product line - up as well as their tech stack:

${productDescription}

Overall guideline for the rest of your response:

This is for a PRD, the product. For the sake of brevity and engineer autonomy, avoid any recommendations about tech stack unless it's absolutely crucial to the product feature.

This is Step 1/3:

The question the user was asked is: ${PRD_QUESTIONS[0].text}

Based on this context, improve this feature description taking into account the existing product line - up and tech stack: "${userInput}".

Respond in this format:

Original: ${userInput}

Observation, reflection, conclusions about original user input within the context of a short rapid iteration focused PRD where this should be the 'main user story'.:

[Short no - nonsense max info density explanation]

<internal-reasoning-1>Based on the above what are different ways we can improve it(start with why and explanation before concluding with a proposal)</internal-reasoning-1>

Improved: [One - two sentences that answer the why for an engineer, making them react with: "ohh, I get it"]

Why this is better: [Now share the output of <internal-reasoning-1> as a prioritized sorted list - less than 6 items please.]

<response-text-formatting>
1. Nicely formatted markdown.
2. Make sure to put double spaces between sections.
3. Bold the headings like "Original" etc.
4. For lists, decide on whether to use bullet points or numbered list and use them.
5. Just return the markdown - make sure to line wrap at 80 characters
</response-text-formatting>
`,
  'successMetric': (improvedDescription: string, userInput: string, productName: string, productDescription: string) =>
    `
This is a new feature proposal for ${productName}.

Here's a brief outline of ${productName}'s current product line - up as well as their tech stack:

${productDescription}

Overall guideline for the rest of your response:

This is for a PRD, the product. For the sake of brevity and engineer autonomy, avoid any recommendations about tech stack unless it's absolutely crucial to the product feature.

Step 1 is done. The question was: ${PRD_QUESTIONS[0].text}

Here was the improved description we came up with for this feature:
${improvedDescription}

We're now at Step 2/3:

Analyze this user response for the question: ${PRD_QUESTIONS[1].text}

Analyze this success metric: "${userInput}".

Observation, reflection, conclusions about original user input within the context of a short rapid iteration focused PRD where this should be the 'main KPI'.

[Short no - nonsense max info density explanation]

<internal-reasoning-1>Based on the above what are different ways we can improve it(start with why and explanation before concluding with a proposal)</internal-reasoning-1>

Improved: [One-two sentences that makes it instantly clear to the engineer *why* this specific metric was chosen]

Why this is better: [Now share the output of <internal-reasoning-1> as a prioritized sorted list - less than 6 items please.]

<response-text-formatting>
1. Nicely formatted markdown.
2. Make sure to put double spaces between sections.
3. Bold the headings like "Original" etc.
4. For lists, decide on whether to use bullet points or numbered list and use them.
5. Just return the markdown - make sure to line wrap at 80 characters
</response-text-formatting>
`,
  'criticalRisk': (improvedDescription: string, improvedSuccessMetric: string, userInput: string, productName: string, productDescription: string) =>
    `
This is a new feature proposal for ${productName}.

Here's a brief outline of ${productName}'s current product line - up as well as their tech stack:

${productDescription}

Overall guideline for the rest of your response:

This is for a PRD, the product. For the sake of brevity and engineer autonomy, avoid any recommendations about tech stack unless it's absolutely crucial to the product feature.

Steps 1 and 2 are done.

Step 1 question was: ${PRD_QUESTIONS[0].text}

Here was the improved description we came up with for this feature:
${improvedDescription}

Step 2 question was: ${PRD_QUESTIONS[1].text}

Here was the improved success metric we came up with for this feature:
${improvedSuccessMetric}

We're now at Step 3/3:

Analyze this user response for the question: ${PRD_QUESTIONS[2].text}

User response: "${userInput}"

Observation, reflection, conclusions about original user input within the context of a short rapid iteration focused PRD where this should be the 'main risk/mini-premortem'.

[Short no - nonsense max info density explanation]

<internal-reasoning-1>Based on the above what are different ways we can improve it(start with why and explanation before concluding with a proposal)</internal-reasoning-1>

Improved: [One-two sentences that makes it instantly clear to the engineer *why* this specific metric was chosen]

Why this is better: [Now share the output of <internal-reasoning-1> as a prioritized sorted list - less than 6 items please.]

<response-text-formatting>
1. Nicely formatted markdown.
2. Make sure to put double spaces between sections.
3. Bold the headings like "Original" etc.
4. For lists, decide on whether to use bullet points or numbered list and use them.
5. Just return the markdown - make sure to line wrap at 80 characters
</response-text-formatting>
  `,
}

// Anthropic API call function
const callAnthropicAPI = async (
  currentStep: string, 
  inputHistory: string[],
  activeProductHighLevelDescription?: ProductHighLevelDescriptionSchema
): Promise<string> => {
  try {
    console.log("callAnthropicAPI called with currentStep:", currentStep, "and inputHistory:", inputHistory);
    let prompt = ''

    switch (currentStep) {
      case 'improvedDescription':
        prompt = PRD_QUESTION_TO_PROMPT[currentStep](
          inputHistory[0], 
          inputHistory[1], 
          activeProductHighLevelDescription?.name || '', 
          activeProductHighLevelDescription?.description || ''
        )
        break;
      case 'successMetric':
        prompt = PRD_QUESTION_TO_PROMPT[currentStep](
          inputHistory[0], 
          inputHistory[1], 
          activeProductHighLevelDescription?.name || '', 
          activeProductHighLevelDescription?.description || ''
        )
        break;
      case 'criticalRisk':
        prompt = PRD_QUESTION_TO_PROMPT[currentStep](
          inputHistory[0], 
          inputHistory[1], 
          inputHistory[2], 
          activeProductHighLevelDescription?.name || '', 
          activeProductHighLevelDescription?.description || ''
        )
        break;
    }

    // 1. Make initial POST request to send data
    const response = await fetch('http://localhost:3001/api/anthropic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: prompt,
          }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { message } = await response.json();

    console.log('response from anthropic:', message)

    return message;
  } catch (error) {
    console.error('Error in callAnthropicAPI:', error);
    throw error;
  }
};

export const usePRDQuestionFlow = (activeProductHighLevelDescription: ProductHighLevelDescriptionSchema, onComplete: (prd: ImprovedLeanPRDSchema) => void) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [aiResponses, setAiResponses] = useState<prdQuestionFlowInputType>({
    improvedDescription: undefined,
    successMetric: undefined,
    criticalRisk: undefined
  });
  const [isLoading, setIsLoading] = useState(false);
  const [inputHistory, setInputHistory] = useState<prdQuestionFlowInputType>({
    improvedDescription: undefined,
    successMetric: undefined,
    criticalRisk: undefined
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userInput = formData.get('userInput') as string;
    console.log("userInput after casting:", userInput); // Log after casting

    console.log('user input:', userInput)

    setResponses({ ...responses, [PRD_QUESTIONS[currentStep].id]: userInput });
    setIsLoading(true);

    const currentQuestion = PRD_QUESTIONS[currentStep];
    console.log('current question:', currentQuestion);
    const promptFunction = PRD_QUESTION_TO_PROMPT[currentQuestion.id];
    console.log('prompt function:', promptFunction);
    console.log("userInput before promptFunction:", userInput);
    const currentInputHistory: prdQuestionFlowInputType = {
      ...inputHistory,
      [PRD_QUESTIONS[currentStep].id]: userInput
    };

    // Provide correct arguments based on currentStep:
    if (currentStep === 0) { // '1_SPEC'
      currentInputHistory[PRD_QUESTIONS[currentStep].id] = promptFunction(userInput, activeProductHighLevelDescription.name, activeProductHighLevelDescription.description);
    } else if (currentStep === 1) { // '2_SUCCESS_METRIC'
      currentInputHistory[PRD_QUESTIONS[currentStep].id] = promptFunction(inputHistory[PRD_QUESTIONS[0].id]!, userInput, activeProductHighLevelDescription.name, activeProductHighLevelDescription.description); // Use previous responses
    } else if (currentStep === 2) { // '3_GOTCHAS'
      currentInputHistory[PRD_QUESTIONS[currentStep].id] = promptFunction(inputHistory[PRD_QUESTIONS[0].id]!, inputHistory[PRD_QUESTIONS[1].id]!, userInput, activeProductHighLevelDescription.name, activeProductHighLevelDescription.description); // Use previous responses
    }

    console.log('current input history:', currentInputHistory);
    setInputHistory(currentInputHistory);

    try {
      const aiResponse = await callAnthropicAPI(
        PRD_QUESTIONS[currentStep].id, 
        Object.values(currentInputHistory),
        activeProductHighLevelDescription
      );
      setAiResponses({ ...aiResponses, [PRD_QUESTIONS[currentStep].id]: aiResponse });
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setAiResponses({
        ...aiResponses,
        [PRD_QUESTIONS[currentStep].id]: "An error occurred while generating the AI response. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }

    if (currentStep < PRD_QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Ensure generatePRD is called after the third step
      console.log("Final step completed, generating PRD...");
      await generatePRD();
    }
  };

  const generatePRD = async () => {
    setIsLoading(true);
    try {
      console.log("AI response:", aiResponses);
      
      // Make sure we have all the required responses
      if (!aiResponses.improvedDescription || !aiResponses.successMetric || !aiResponses.criticalRisk) {
        console.error("Missing required responses for PRD generation", aiResponses);
        throw new Error("Missing required responses for PRD generation");
      }
      
      const response = await fetch('http://localhost:3001/api/prd/generateFromSuggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          improvedDescription: aiResponses.improvedDescription,
          successMetric: aiResponses.successMetric,
          criticalRisk: aiResponses.criticalRisk
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ImprovedLeanPRDSchema = await response.json();
      console.log("PRD generated successfully:", data);
      onComplete(data);
    } catch (error) {
      console.error('Error generating PRD:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (step: number) => {
    setCurrentStep(step);
  };

  return {
    currentStep,
    responses,
    aiResponses,
    isLoading,
    handleSubmit,
    handleEdit,
    PRD_QUESTIONS,
  };
};
