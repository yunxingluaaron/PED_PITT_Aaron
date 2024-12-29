// src/components/AnswerSection/hooks/useVersionHistory.js
import { useState, useCallback } from 'react';

const useVersionHistory = (initialContent = '') => {
  const [versions, setVersions] = useState(() => initialContent ? [{
    id: 1,
    content: initialContent,
    timestamp: new Date().toISOString(),
    type: 'ai',
    isLiked: false,
    isBookmarked: false,
  }] : []);
  
  const [currentVersionId, setCurrentVersionId] = useState(versions[0]?.id || null);

  const addVersion = useCallback((content, type = 'user') => {
    if (!content) return;
    
    setVersions(prev => {
      const newId = prev.length > 0 ? Math.max(...prev.map(v => v.id)) + 1 : 1;
      const newVersion = {
        id: newId,
        content,
        timestamp: new Date().toISOString(),
        type,
        isLiked: false,
        isBookmarked: false,
      };
      return [...prev, newVersion];
    });
    
    setCurrentVersionId(prev => {
      const newId = versions.length > 0 ? Math.max(...versions.map(v => v.id)) + 1 : 1;
      return newId;
    });
  }, [versions]);

  const getCurrentVersion = useCallback(() => {
    return versions.find(v => v.id === currentVersionId) || versions[versions.length - 1] || null;
  }, [versions, currentVersionId]);

  const toggleLike = useCallback((versionId) => {
    setVersions(prev =>
      prev.map(v =>
        v.id === versionId ? { ...v, isLiked: !v.isLiked } : v
      )
    );
  }, []);

  const toggleBookmark = useCallback((versionId) => {
    setVersions(prev =>
      prev.map(v =>
        v.id === versionId ? { ...v, isBookmarked: !v.isBookmarked } : v
      )
    );
  }, []);

  return {
    versions,
    currentVersionId,
    setCurrentVersionId,
    addVersion,
    getCurrentVersion,
    toggleLike,
    toggleBookmark,
  };
};

export default useVersionHistory;