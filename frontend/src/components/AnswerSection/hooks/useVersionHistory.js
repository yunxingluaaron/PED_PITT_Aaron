import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const useVersionHistory = (questionId, initialContent = '') => {
  const [versions, setVersions] = useState([]);
  const [currentVersionId, setCurrentVersionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastAIVersion, setLastAIVersion] = useState(null);

  // Load versions when questionId changes
  useEffect(() => {
    const loadVersions = async () => {
      setLoading(true);
      setError(null);
      if (questionId) {
        try {
          console.log('Loading versions for question:', questionId);
          const response = await axios.get(
            `${API_BASE_URL}/questions/${questionId}/versions`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              }
            }
          );

          if (response.data) {
            const sortedVersions = response.data.sort((a, b) => {
              const timeDiff = new Date(b.timestamp) - new Date(a.timestamp);
              if (timeDiff === 0) {
                // Prioritize 'ai' versions when timestamps are equal
                return a.type === 'ai' ? -1 : 1;
              }
              return timeDiff;
            });
            setVersions(sortedVersions);
            // Prefer the latest 'ai' version if available
            const latestAIVersion = sortedVersions.find(v => v.type === 'ai');
            setCurrentVersionId(latestAIVersion?.id || sortedVersions[0]?.id || null);
          }
        } catch (error) {
          console.error('Failed to load versions:', error);
          setError(error.response?.data?.error || 'Failed to load versions');
          setVersions([]);
          setCurrentVersionId(null);
        }
      } else {
        setVersions([]);
        setCurrentVersionId(null);
      }
      setLoading(false);
    };

    loadVersions();
  }, [questionId]);

  const addVersion = useCallback(async (content, type = 'user', metadata = {}) => {
    if (!content) return;
    setError(null);

    try {
      if (type === 'ai' && lastAIVersion?.content === content) {
        console.log('Preventing duplicate AI version');
        return lastAIVersion;
      }

      // Prevent saving question content as a user version
      if (type === 'user' && metadata.questionContent && content === metadata.questionContent) {
        console.warn('Preventing user version for question content');
        return null;
      }

      if (!questionId) {
        const newVersion = {
          id: Date.now(),
          content,
          type,
          timestamp: new Date().toISOString(),
          is_liked: false,
          is_bookmarked: false,
          isLocal: true,
          ...metadata
        };
        setVersions(prev => [...prev, newVersion].sort((a, b) => {
          const timeDiff = new Date(b.timestamp) - new Date(a.timestamp);
          if (timeDiff === 0) {
            return a.type === 'ai' ? -1 : 1;
          }
          return timeDiff;
        }));
        setCurrentVersionId(newVersion.id);
        if (type === 'ai') setLastAIVersion(newVersion);
        return newVersion;
      }

      const versionData = {
        content,
        type,
        timestamp: new Date().toISOString(),
        is_liked: false,
        is_bookmarked: false,
        ...metadata
      };

      const response = await axios.post(
        `${API_BASE_URL}/questions/${questionId}/versions`,
        versionData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );

      if (response.data) {
        const newVersion = response.data;
        setVersions(prev => {
          const updated = [...prev, newVersion].sort((a, b) => {
            const timeDiff = new Date(b.timestamp) - new Date(a.timestamp);
            if (timeDiff === 0) {
              return a.type === 'ai' ? -1 : 1;
            }
            return timeDiff;
          });
          return updated;
        });
        setCurrentVersionId(newVersion.id);
        if (type === 'ai') setLastAIVersion(newVersion);

        window.dispatchEvent(new Event('questionUpdated'));
        return newVersion;
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to save version';
      console.error('Failed to save version:', errorMessage);
      setError(errorMessage);
      return null;
    }
  }, [questionId, lastAIVersion]);

  const toggleLike = useCallback(async (versionId) => {
    if (!questionId || !versionId) return;

    try {
      const version = versions.find(v => v.id === versionId);
      if (!version) return;

      const response = await axios.put(
        `${API_BASE_URL}/questions/${questionId}/versions/${versionId}`,
        { is_liked: !version.is_liked },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );

      const updatedVersion = response.data;
      setVersions(prev =>
        prev.map(v => v.id === versionId ? updatedVersion : v)
      );
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  }, [questionId, versions]);

  const toggleBookmark = useCallback(async (versionId) => {
    if (!questionId || !versionId) return;

    try {
      const version = versions.find(v => v.id === versionId);
      if (!version) return;

      const response = await axios.put(
        `${API_BASE_URL}/questions/${questionId}/versions/${versionId}`,
        { is_bookmarked: !version.is_bookmarked },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );

      const updatedVersion = response.data;
      setVersions(prev =>
        prev.map(v => v.id === versionId ? updatedVersion : v)
      );
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  }, [questionId, versions]);

  const getCurrentVersion = useCallback(() => {
    const version = versions.find(v => v.id === currentVersionId);
    if (version) return version;
    // Prefer the latest 'ai' version if available
    return versions.find(v => v.type === 'ai') || versions[0] || null;
  }, [versions, currentVersionId]);

  const reset = useCallback(() => {
    setVersions([]);
    setCurrentVersionId(null);
    setLastAIVersion(null);
    setError(null);
  }, []);

  return {
    versions,
    currentVersionId,
    setCurrentVersionId,
    addVersion,
    loading,
    error,
    getCurrentVersion,
    toggleLike,
    toggleBookmark,
    reset
  };
};

export default useVersionHistory;