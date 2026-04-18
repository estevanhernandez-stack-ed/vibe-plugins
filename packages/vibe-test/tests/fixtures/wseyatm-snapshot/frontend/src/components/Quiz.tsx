import React, { useState } from 'react';

export interface QuizProps {
  questionId: string;
}

const QUESTIONS: Record<string, { prompt: string; answers: string[] }> = {
  q1: { prompt: 'Which film won Best Picture 2024?', answers: ['Oppenheimer', 'Barbie', 'Poor Things'] },
};

export function Quiz({ questionId }: QuizProps): JSX.Element {
  const [selected, setSelected] = useState<string | null>(null);
  const data = QUESTIONS[questionId];
  if (!data) return <div>Unknown question</div>;
  return (
    <div className="quiz">
      <p>{data.prompt}</p>
      <ul>
        {data.answers.map((a) => (
          <li key={a}>
            <button onClick={() => setSelected(a)}>{a}</button>
          </li>
        ))}
      </ul>
      {selected && <p>Selected: {selected}</p>}
    </div>
  );
}

export default Quiz;
