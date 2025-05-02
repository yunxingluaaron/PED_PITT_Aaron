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
  const [parentName, setParentName] = useState(''); // Add state for parent name

  const generateAnswerFromQuestion = useCallback(async (question, options = {}) => {
    setLoading(true);
    setError(null);

    // Store parent name in state if provided
    if (options.parent_name !== undefined) {
      setParentName(options.parent_name);
    }

    console.log('📝 Generating answer for question:', question);
    console.log('🔧 With options:', options);
    console.log('👨‍👩‍👧‍👦 Parent name:', options.parent_name || parentName);

    try {
      const requestData = {
        message: question,
        conversation_id: options.conversation_id || conversationId,
        parent_name: options.parent_name || parentName, // Include parent name in request
        options: {
          isHistoricalAnswer: options.isHistoricalAnswer || false,
          conversation_id: options.conversation_id,
          response: options.response,
          source_data: options.source_data,
          response_metadata: options.response_metadata,
          parent_name: options.parent_name || parentName // Include parent name in options
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
        question, // Store original question
        parent_name: options.parent_name || parentName || response.parent_name // Store parent name in metadata
      });
      setQuestionId(response.question_id);

      // If response includes parent name, update state
      if (response.parent_name) {
        setParentName(response.parent_name);
      }

      // Only dispatch event for new questions with metadata
      if (!options.isHistoricalAnswer) {
        window.dispatchEvent(new CustomEvent('questionAnswered', {
          detail: {
            parameters: options.parameters,
            question,
            response: response.detailed_response,
            parent_name: options.parent_name || parentName || response.parent_name // Include parent name in event
          }
        }));
      }

      return {
        ...response,
        isHistoricalAnswer: options.isHistoricalAnswer,
        parameters: options.parameters,
        originalQuestion: question,
        parent_name: options.parent_name || parentName || response.parent_name // Include parent name in return value
      };
    } catch (err) {
      console.error('❌ Error generating answer:', err);
      setError(err.message || 'Failed to generate answer');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [conversationId, parentName]);

  const clearAnswer = useCallback(() => {
    setAnswer(null);
    setSources([]);
    setRelationships([]);
    setMetadata(null);
    setError(null);
    // Note: We don't clear parent name when clearing answer
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Add function to update parent name
  const updateParentName = useCallback((name) => {
    setParentName(name);
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
    parentName, // Expose parent name in return object
    generateAnswerFromQuestion,
    clearAnswer,
    resetError,
    updateParentName // Expose function to update parent name
  };
};

export default useAnswerGeneration;