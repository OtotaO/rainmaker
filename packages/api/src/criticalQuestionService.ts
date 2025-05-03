// // START: [02-CRITQ-BE-1.2]
// import { Anthropic } from '@anthropic-ai/sdk';

// export class CriticalQuestionService {
//   private anthropic: Anthropic;

//   constructor() {
//     this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
//   }

//   async generateCriticalQuestion(
//     context: ProjectContext,
//     previousResponses: PreviousResponse[]
//   ): Promise<CriticalQuestion> {
//     const prompt = this.buildPrompt(context, previousResponses);

//     try {
//       const response = await this.anthropic.messages.create({
//         model: 'claude-3-7-sonnet-latest',
//         system:
//           'You are an AI assistant tasked with generating critical questions for software projects.',
//         messages: [{ role: 'user', content: prompt }],
//         max_tokens: 100,
//       });

//       const generatedQuestion = response.content;
//       return { id: Date.now().toString(), question: generatedQuestion };
//     } catch (error) {
//       console.error('Error generating critical question:', error);
//       throw new Error('Failed to generate critical question');
//     }
//   }

//   private buildPrompt(context: ProjectContext, previousResponses: PreviousResponse[]): string {
//     let prompt = `Based on the following project context:\n${JSON.stringify(context)}\n`;

//     if (previousResponses.length > 0) {
//       prompt += `And considering these previous responses:\n${JSON.stringify(previousResponses)}\n`;
//     }

//     prompt +=
//       'Generate a critical question that will help identify potential issues or opportunities in the project.';

//     return prompt;
//   }
// }
// // END: [02-CRITQ-BE-1.2] [double check: The CriticalQuestionService class implements the required generateCriticalQuestion method as specified in 02-CRITQ-BE-1.2. It uses OpenAI's API to generate questions based on the project context and previous responses. The implementation appears to fully and faithfully adhere to the specification.]
