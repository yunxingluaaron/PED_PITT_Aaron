import { useState, useCallback } from 'react';
import { generateAnswer } from '../../../services/questionApi';

export const useAnswerGeneration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [detailedResponse, setDetailedResponse] = useState(null);
  const [simpleResponse, setSimpleResponse] = useState(null);
  const [sources, setSources] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [questionId, setQuestionId] = useState(null);
  const [parentName, setParentName] = useState('');

  const generateAnswerFromQuestion = useCallback(async (question, options = {}) => {
    setLoading(true);
    setError(null);
  
    if (!question?.trim()) {
      console.error('❌ Question is empty or invalid');
      setError('Question cannot be empty');
      setLoading(false);
      return;
    }
  
    if (options.parent_name !== undefined) {
      setParentName(options.parent_name);
    }
  
    console.log('📝 Generating answer for question:', question);
    console.log('🔧 With options:', options);
    console.log('👨‍👩‍👧‍👦 Parent name:', options.parent_name || parentName);
    console.log('🔄 Conversation action:', options.conversation_action || 'continue');
  
    try {
      const requestData = {
        message: question.trim(),
        conversation_id: options.conversation_id || conversationId,
        parent_name: options.parent_name || parentName,
        conversation_action: options.conversation_action || 'continue',
        options: {
          isHistoricalAnswer: options.isHistoricalAnswer || false,
          conversation_id: options.conversation_id,
          response: options.response,
          source_data: options.source_data,
          response_metadata: options.response_metadata,
          parent_name: options.parent_name || parentName
        },
        parameters: options.parameters || {
          tone: 'balanced',
          detailLevel: 'moderate',
          empathy: 'moderate',
          professionalStyle: 'clinicallyBalanced'
        }
      };
  
      const response = await generateAnswer(requestData);
      console.log('🔍 API Response:', JSON.stringify(response, null, 2));

      const normalizedResponse = {
        ...response,
        simple_response: response.simple_response || response.detailed_response || 'Simplified response not available',
        detailed_response: response.detailed_response || 'Detailed response not available',
        sources: response.sources || [],
        relationships: response.relationships || [],
        conversation_id: response.conversation_id || conversationId,
        metadata: response.metadata || {},
        question_id: response.question_id || null,
        parent_name: response.parent_name || options.parent_name || parentName,
        conversation_action: response.conversation_action || options.conversation_action || 'continue'
      };

      setAnswer(normalizedResponse.detailed_response);
      setDetailedResponse(normalizedResponse.detailed_response);
      setSimpleResponse(normalizedResponse.simple_response);
      setSources(normalizedResponse.sources);
      setRelationships(normalizedResponse.relationships);
      setConversationId(normalizedResponse.conversation_id);
      setMetadata({
        ...normalizedResponse.metadata,
        parameters: options.parameters,
        question,
        parent_name: normalizedResponse.parent_name,
        conversation_action: normalizedResponse.conversation_action
      });
      setQuestionId(normalizedResponse.question_id);

      if (normalizedResponse.parent_name) {
        setParentName(normalizedResponse.parent_name);
      }

      if (!options.isHistoricalAnswer) {
        window.dispatchEvent(new CustomEvent('questionAnswered', {
          detail: {
            parameters: options.parameters,
            question,
            response: normalizedResponse.detailed_response,
            parent_name: normalizedResponse.parent_name,
            conversation_action: normalizedResponse.conversation_action
          }
        }));
      }

      return {
        ...normalizedResponse,
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
  }, [conversationId, parentName]);

  const clearAnswer = useCallback(() => {
    setAnswer(null);
    setDetailedResponse(null);
    setSimpleResponse(null);
    setSources([]);
    setRelationships([]);
    setMetadata(null);
    setError(null);
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const updateParentName = useCallback((name) => {
    setParentName(name);
  }, []);

  return {
    loading,
    error,
    answer,
    detailedResponse,
    simpleResponse,
    sources,
    relationships,
    metadata,
    conversationId,
    questionId,
    parentName,
    generateAnswerFromQuestion,
    clearAnswer,
    resetError,
    updateParentName
  };
};

export default useAnswerGeneration;