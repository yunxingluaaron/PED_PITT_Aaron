// frontend/src/components/AnswerSection/hooks/useAnswerGeneration.js
import { useState, useCallback } from 'react';
import { generateAnswer } from '../../../services/questionApi';

export const useAnswerGeneration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [sources, setSources] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [questionId, setQuestionId] = useState(null);

  const generateAnswerFromQuestion = useCallback(async (question, options = {}) => {
    setLoading(true);
    setError(null);
    
    console.log('Generating answer for question:', question);
    console.log('With options:', options);

    try {
      const response = await generateAnswer({
        message: question,
        conversation_id: options.conversation_id || conversationId,
        historical_data: options.isHistoricalAnswer ? {
          response: options.response,
          source_data: options.source_data,
          response_metadata: options.response_metadata
        } : null
      });

      console.log('Answer generation response:', response);

      // Update states with response data
      setAnswer(response.detailed_response);
      setSources(response.sources || []);
      setRelationships(response.relationships || []);
      setConversationId(response.conversation_id);
      setMetadata(response.metadata);
      setQuestionId(response.question_id); // Store the question ID

      // If it's a historical answer, don't modify the states
      if (!options.isHistoricalAnswer) {
        window.dispatchEvent(new Event('questionAnswered'));
      }

      return {
        ...response,
        isHistoricalAnswer: options.isHistoricalAnswer
      };
    } catch (err) {
      console.error('Error generating answer:', err);
      setError(err.message || 'Failed to generate answer');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const clearAnswer = useCallback(() => {
    setAnswer(null);
    setSources([]);
    setRelationships([]);
    setMetadata(null);
    setError(null);
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    answer,
    sources,
    relationships,
    metadata,
    conversationId,
    questionId,
    generateAnswerFromQuestion,
    clearAnswer,
    resetError
  };
};

export default useAnswerGeneration;