
import { useState, useCallback } from 'react';

const useVersionHistory = (initialContent) => {
  const [versions, setVersions] = useState([
    {
      id: 1,
      content: initialContent,
      timestamp: new Date().toISOString(),
      type: 'ai',
      isLiked: false,
      isBookmarked: false,
    },
  ]);
  const [currentVersionId, setCurrentVersionId] = useState(1);

  const addVersion = useCallback((content) => {
    setVersions((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        content,
        timestamp: new Date().toISOString(),
        type: 'user',
        isLiked: false,
        isBookmarked: false,
      },
    ]);
    setCurrentVersionId(versions.length + 1);
  }, [versions.length]);

  const getCurrentVersion = useCallback(() => {
    return versions.find((v) => v.id === currentVersionId);
  }, [versions, currentVersionId]);

  const toggleLike = useCallback((versionId) => {
    setVersions((prev) =>
      prev.map((v) =>
        v.id === versionId ? { ...v, isLiked: !v.isLiked } : v
      )
    );
  }, []);

  const toggleBookmark = useCallback((versionId) => {
    setVersions((prev) =>
      prev.map((v) =>
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