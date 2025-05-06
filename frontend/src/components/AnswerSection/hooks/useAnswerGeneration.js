//src\components\AnswerSection\hooks\useAnswerGeneration.js
import { useState, useCallback } from 'react';
import { generateAnswer } from '../../../services/questionApi';

export const useAnswerGeneration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [detailedResponse, setDetailedResponse] = useState(null); // 新增：存储详细回答
  const [simpleResponse, setSimpleResponse] = useState(null);    // 新增：存储简洁回答
  const [sources, setSources] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [questionId, setQuestionId] = useState(null);
  const [parentName, setParentName] = useState('');

  // useAnswerGeneration.js
  const generateAnswerFromQuestion = useCallback(async (question, options = {}) => {
    setLoading(true);
    setError(null);

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
        parent_name: options.parent_name || parentName,
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

      // 确保 simple_response 和 detailed_response 有默认值
      const normalizedResponse = {
        ...response,
        simple_response: response.simple_response || response.detailed_response || 'Simplified response not available',
        detailed_response: response.detailed_response || 'Detailed response not available',
        sources: response.sources || [],
        relationships: response.relationships || [],
        conversation_id: response.conversation_id || conversationId,
        metadata: response.metadata || {},
        question_id: response.question_id || null,
        parent_name: response.parent_name || options.parent_name || parentName
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
        parent_name: normalizedResponse.parent_name
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
            parent_name: normalizedResponse.parent_name
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
    setDetailedResponse(null); // 新增：清除详细回答
    setSimpleResponse(null);   // 新增：清除简洁回答
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
    detailedResponse, // 新增：暴露 detailedResponse
    simpleResponse,  // 新增：暴露 simpleResponse
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