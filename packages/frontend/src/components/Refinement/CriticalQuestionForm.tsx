// START: [02-CRITQ-FE-2.1, 02-CRITQ-FE-2.2]
import React, { useState, useEffect } from 'react';
import { QuestionDisplay } from './QuestionDisplay';

interface CriticalQuestionFormProps {
  onComplete: (question: CriticalQuestion, answer: string) => void;
  projectContext: ProjectContext;
}

export const CriticalQuestionForm: React.FC<CriticalQuestionFormProps> = ({ onComplete, projectContext }) => {
  const [currentQuestion, setCurrentQuestion] = useState<CriticalQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [previousResponses, setPreviousResponses] = useState<PreviousResponse[]>([]);

  useEffect(() => {
    fetchNextQuestion();
  }, []);

  const fetchNextQuestion = async () => {
    try {
      const response = await fetch('/api/critical-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: projectContext, previousResponses }),
      });
      const data = await response.json();
      setCurrentQuestion(data.question);
    } catch (error) {
      console.error('Failed to fetch critical question:', error);
    }
  };

  const handleAnswer = (answer: string) => {
    setAnswer(answer);
    if (currentQuestion) {
      const newResponse: PreviousResponse = { question: currentQuestion, answer };
      setPreviousResponses([...previousResponses, newResponse]);
      onComplete(currentQuestion, answer);
    }
    setAnswer('');
    fetchNextQuestion();
  };

  return (
    <div>
      {currentQuestion && (
        <QuestionDisplay question={currentQuestion} onAnswer={handleAnswer} />
      )}
    </div>
  );
};

interface QuestionDisplayProps {
  question: CriticalQuestion;
  onAnswer: (answer: string) => void;
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({ question, onAnswer }) => {
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAnswer(answer);
    setAnswer('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>{question.question}</h3>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Your answer"
        required
      />
      <button type="submit">Submit Answer</button>
    </form>
  );
};
// END: [02-CRITQ-FE-2.1, 02-CRITQ-FE-2.2] [double check: The code implements the CriticalQuestionForm component as specified in 02-CRITQ-FE-2.1, including the required props and state. It also implements the QuestionDisplay component as specified in 02-CRITQ-FE-2.2 with the required props. The implementation appears to fully and faithfully adhere to the specifications.]