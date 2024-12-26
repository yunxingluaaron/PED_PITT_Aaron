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

  const generateAnswerFromQuestion = useCallback(async (question) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await generateAnswer({
        message: question,
        conversation_id: conversationId
      });
      
      setAnswer(response.detailed_response);
      setSources(response.sources);
      setRelationships(response.relationships);
      setConversationId(response.conversation_id);
      setMetadata(response.metadata);
      
      return response;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  return {
    loading,
    error,
    answer,
    sources,
    relationships,
    metadata,
    conversationId,
    generateAnswerFromQuestion
  };
};

export default useAnswerGeneration;