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

      // 修改：分别存储 detailed_response 和 simple_response
      setAnswer(response.detailed_response); // 保持原有逻辑兼容性
      setDetailedResponse(response.detailed_response);
      setSimpleResponse(response.simple_response || response.detailed_response); // 回退到 detailed_response
      setSources(response.sources || []);
      setRelationships(response.relationships || []);
      setConversationId(response.conversation_id);
      setMetadata({
        ...response.metadata,
        parameters: options.parameters,
        question,
        parent_name: options.parent_name || parentName || response.parent_name
      });
      setQuestionId(response.question_id);

      if (response.parent_name) {
        setParentName(response.parent_name);
      }

      if (!options.isHistoricalAnswer) {
        window.dispatchEvent(new CustomEvent('questionAnswered', {
          detail: {
            parameters: options.parameters,
            question,
            response: response.detailed_response,
            parent_name: options.parent_name || parentName || response.parent_name
          }
        }));
      }

      return {
        ...response,
        isHistoricalAnswer: options.isHistoricalAnswer,
        parameters: options.parameters,
        originalQuestion: question,
        parent_name: options.parent_name || parentName || response.parent_name
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