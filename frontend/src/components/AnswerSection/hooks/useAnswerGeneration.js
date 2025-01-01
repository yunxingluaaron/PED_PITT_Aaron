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

    console.log('📝 Generating answer for question:', question);
    console.log('🔧 With options:', options);

    try {
      const requestData = {
        message: question,
        conversation_id: options.conversation_id || conversationId,
        options: {
          isHistoricalAnswer: options.isHistoricalAnswer || false,
          conversation_id: options.conversation_id,
          response: options.response,
          source_data: options.source_data,
          response_metadata: options.response_metadata
        },
        parameters: options.parameters || {
          tone: 'balanced',
          detailLevel: 'moderate',
          empathy: 'moderate',
          professionalStyle: 'clinicallyBalanced'
        }
      };
      
      const response = await generateAnswer(requestData);

      // Update states
      setAnswer(response.detailed_response);
      setSources(response.sources || []);
      setRelationships(response.relationships || []);
      setConversationId(response.conversation_id);
      setMetadata({
        ...response.metadata,
        parameters: options.parameters,
        question // Store original question
      });
      setQuestionId(response.question_id);

      // Only dispatch event for new questions with metadata
      if (!options.isHistoricalAnswer) {
        window.dispatchEvent(new CustomEvent('questionAnswered', {
          detail: {
            parameters: options.parameters,
            question,
            response: response.detailed_response
          }
        }));
      }

      return {
        ...response,
        isHistoricalAnswer: options.isHistoricalAnswer,
        parameters: options.parameters,
        originalQuestion: question
      };
    } catch (err) {
      console.error('❌ Error generating answer:', err);
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