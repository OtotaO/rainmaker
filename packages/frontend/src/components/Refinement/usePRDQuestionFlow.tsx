// ./packages/frontend/src/components/Refinement/usePRDQuestionFlow.ts
import { useState } from 'react';
import type { ImprovedLeanPRDSchema } from '../../../../shared/src/types';

const PRD_QUESTIONS = [
  { id: "1_SPEC", text: "What's the feature in one sentence?" },
  { id: "2_SUCCESS_METRIC", text: "How do we measure success in 7 days?" },
  { id: "3_GOTCHAS", text: "What's the one thing that could kill this feature?" },
] as const;

type QuestionId = typeof PRD_QUESTIONS[number]['id'];

const productName = 'プロワン'

// const discordProductDescription = `
// .
// Core Product Suite:

// Communication:

// Text Chat: Real-time text conversations (Channels, Threads, Direct Messaging). Built with React Native/React, Elixir, and likely Cassandra/Redis for persistence and speed.
// Voice Chat: Real-time voice channels, stages, and streaming. Likely leverages Elixir, Rust (for performance), and WebRTC.
// Video Chat: Real-time video and screen sharing. Likely uses WebRTC, potentially with Rust optimizations and Elixir signaling.

// Community Features:

// Server Management: Tools for community moderation and organization. Built using React Native/React, Elixir, and databases for persistence.
// Integrations: Bots and webhooks for connecting external services. Likely uses Python and Elixir.
// Events: Scheduled events and stage discovery. Likely built with React Native/React and Elixir, potentially leveraging Redis for real-time updates.

// Platform Features:

// User Profiles: Customizable profiles. React Native/React frontend, backend likely Elixir and database driven.
// Nitro: Premium subscription features. Likely managed through Elixir and databases.
// Developer Platform: API and SDKs. Likely utilizes Elixir, Python, and potentially other languages for specific SDKs.
// Games: Activities, game detection, rich presence. Likely leverages native platform APIs (Kotlin/Swift) for detection and Elixir for backend management.
// `

const productDescription = `
## プロワンバーティカルSaaSプロダクト： ドキュメント管理自動化 & 機能リスト

このドキュメントでは、プロワンバーティカルSaaSプロダクトのドキュメント管理自動化と一般的な機能リストをMarkdown形式で詳しく説明します。

### 1. ドキュメント管理自動化

**自動化の対象となるドキュメント管理業務:**

* **ドキュメント作成:**
    * 契約書、提案書、請求書などのテンプレートからの自動生成
    * 顧客データやシステムデータに基づいたドキュメントの自動入力
    * 複数ドキュメントの自動結合
* **ドキュメントレビュー・承認:**
    * ワークフローに基づいた自動ルーティング
    * 承認状況のリアルタイム追跡
    * 電子署名による承認プロセスの迅速化
* **ドキュメント保管・検索:**
    * クラウドストレージへの自動保存
    * メタデータに基づいた高度な検索機能
    * バージョン管理による変更履歴の追跡
* **ドキュメント分析:**
    * AIを活用したドキュメント内容の自動抽出・分析
    * データに基づいた意思決定の支援
* **セキュリティ管理:**
    * アクセス権限の設定による情報漏洩防止
    * 監査証跡の記録によるコンプライアンス強化

**自動化によるメリット:**

* **業務効率化:**
    * 手作業によるミスを削減
    * 処理時間の短縮
    * 従業員のリソースをより重要な業務に集中
* **コスト削減:**
    * 印刷、郵送、保管にかかるコストを削減
    * 人件費の削減
* **顧客満足度向上:**
    * 迅速な対応
    * 正確な情報提供
    * シームレスな顧客体験
* **コンプライアンス強化:**
    * 法令遵守の徹底
    * 内部統制の強化
    * リスク管理の向上

**自動化ツールの選定:**

* **必要な機能:**
    * 上記の自動化対象業務に対応しているか
    * 既存システムとの連携が可能か
    * セキュリティ対策は万全か
* **使いやすさ:**
    * 直感的な操作が可能か
    * 導入・運用が容易か
    * 従業員のトレーニングコスト
* **コスト:**
    * 初期費用、月額費用、運用コスト
    * 投資対効果 (ROI)
* **ベンダーの信頼性:**
    * 導入実績
    * サポート体制
    * 将来的な展望

**導入プロセス:**

* **現状分析:**
    * 現在のドキュメント管理プロセスにおける課題を明確化
    * 自動化による効果を予測
* **要件定義:**
    * 必要な機能、性能、セキュリティ要件を定義
* **ツール選定:**
    * 複数のツールを比較検討
    * デモやトライアルを実施
* **導入・設定:**
    * ツールの導入、設定、カスタマイズ
    * 従業員へのトレーニング
* **運用・改善:**
    * 定期的なモニタリング
    * 必要に応じて設定変更や機能追加


### 2. プロワンバーティカルSaaSプロダクトの機能リスト

**一般的な機能:**

* **ユーザー管理:**
    * ユーザー登録・認証
    * アクセス権限管理
    * シングルサインオン (SSO)
* **データ管理:**
    * データ入力・編集・削除
    * データ検索・フィルタリング
    * データエクスポート・インポート
* **レポート・分析:**
    * ダッシュボードによるデータ可視化
    * カスタムレポート作成
    * データ分析機能
* **コミュニケーション:**
    * 通知機能 (メール、プッシュ通知など)
    * メッセージング機能
    * コラボレーションツールとの連携
* **セキュリティ:**
    * データ暗号化
    * アクセス制御
    * 脆弱性対策
* **API連携:**
    * 他システムとの連携
    * データの自動連携
* **カスタマイズ:**
    * ユーザーインターフェースのカスタマイズ
    * ワークフローのカスタマイズ
* **サポート:**
    * オンラインヘルプ
    * FAQ
    * メール・電話サポート

**特定の分野で想定される機能 (例: 不動産業界向け):**

* **物件管理:**
    * 物件情報登録・管理
    * 入居者管理
    * 契約管理
* **賃貸管理:**
    * 賃料管理
    * 請求書発行
    * 入金管理
* **顧客管理:**
    * 顧客情報管理
    * 顧客対応履歴管理
* **マーケティング:**
    * メールマーケティング
    * 広告管理
* **分析:**
    * 市場動向分析
    * 競合分析

**不明な機能:**

具体的なプロダクトが不明なため、以下の機能については「不明」とさせていただきます。

* **業界特有の専門機能:**
    * プロダクトの対象分野によって大きく異なるため、特定できません。
* **高度な分析機能:**
    * AIや機械学習を活用した分析機能の有無は不明です。
* **特定の外部サービスとの連携:**
    * どのような外部サービスと連携しているかは不明です。
`


// const techStack = `
// Technologies:

// Frontend: React Native (primary), React (web), Kotlin (Android), Swift (iOS - minimal)
// Backend: Elixir, Rust, Python
// Database: Cassandra, Redis
// Infrastructure: AWS
// `

const PRD_QUESTION_TO_PROMPT: Record<
  QuestionId,
  (...args: string[]) => string // Change here: Accepts variable number of string arguments
> = {
  '1_SPEC': (userInput: string) => `
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
  '2_SUCCESS_METRIC': (improvedDescription: string, userInput: string) =>
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
  '3_GOTCHAS': (improvedDescription: string, improvedSuccessMetric: string, userInput: string) =>
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
const callAnthropicAPI = async (currentStep: string, inputHistory: string[]): Promise<string> => {
  try {
    console.log("callAnthropicAPI called with currentStep:", currentStep, "and inputHistory:", inputHistory);
    let prompt = ''

    switch (currentStep) {
      case '1_SPEC':
        prompt = PRD_QUESTION_TO_PROMPT[currentStep](inputHistory[0])
        break;
      case '2_SUCCESS_METRIC':
        prompt = PRD_QUESTION_TO_PROMPT[currentStep](inputHistory[0], inputHistory[1])
        break;
      case '3_GOTCHAS':
        prompt = PRD_QUESTION_TO_PROMPT[currentStep](inputHistory[0], inputHistory[1], inputHistory[2])
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

export const usePRDQuestionFlow = (onComplete: (prd: ImprovedLeanPRDSchema) => void) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [aiResponses, setAiResponses] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [inputHistory, setInputHistory] = useState<[string, string, string]>(['', '', '']);

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
    const currentInputHistory: [string, string, string] = [...inputHistory];

    // Provide correct arguments based on currentStep:
    if (currentStep === 0) { // '1_SPEC'
      currentInputHistory[currentStep] = promptFunction(userInput);
    } else if (currentStep === 1) { // '2_SUCCESS_METRIC'
      currentInputHistory[currentStep] = promptFunction(inputHistory[0], userInput); // Use previous responses
    } else if (currentStep === 2) { // '3_GOTCHAS'
      currentInputHistory[currentStep] = promptFunction(inputHistory[0], inputHistory[1], userInput); // Use previous responses
    }

    console.log('current input history:', currentInputHistory);
    setInputHistory(currentInputHistory);

    try {
      const aiResponse = await callAnthropicAPI(PRD_QUESTIONS[currentStep].id, currentInputHistory);
      setAiResponses({ ...aiResponses, [currentStep]: aiResponse });
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setAiResponses({
        ...aiResponses,
        [currentStep]: "An error occurred while generating the AI response. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }

    if (currentStep < PRD_QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await generatePRD();
    }
  };

  const generatePRD = async () => {
    setIsLoading(true);
    try {
      console.log("AI response:", aiResponses)
      const response = await fetch('http://localhost:3001/api/prd-suggestions-to-lean-prd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(aiResponses)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ImprovedLeanPRDSchema = await response.json();
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