import React, { useState, useEffect } from 'react';
import { fetchAnswer } from '../../services/answerApi';

const AnswerSection = () => {
  const [answer, setAnswer] = useState(null);

  useEffect(() => {
    // Fetch answer when needed
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">Answers Generated section</h2>
      {answer && <div className="mt-4">{answer}</div>}
    </div>
  );
};

export default AnswerSection;