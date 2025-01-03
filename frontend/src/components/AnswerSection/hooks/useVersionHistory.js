// components/AnswerSection/hooks/useVersionHistory.js
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
            const sortedVersions = response.data.sort((a, b) => 
              new Date(b.timestamp) - new Date(a.timestamp)
            );
            setVersions(sortedVersions);
            setCurrentVersionId(sortedVersions[0]?.id || null);
          }
        } catch (error) {
          console.error('Failed to load versions:', error);
          setError(error.response?.data?.error || 'Failed to load versions');
          // Initialize empty state on error
          setVersions([]);
          setCurrentVersionId(null);
        }
      } else {
        // Initialize with empty state if no questionId
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
      // Prevent duplicate AI versions
      if (type === 'ai' && lastAIVersion?.content === content) {
        console.log('Preventing duplicate AI version');
        return lastAIVersion;
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
        setVersions(prev => [...prev, newVersion]);
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
          const updated = [...prev, newVersion].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
          );
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
    return versions.find(v => v.id === currentVersionId) || versions[0] || null;
  }, [versions, currentVersionId]);

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
  };
};

export default useVersionHistory;