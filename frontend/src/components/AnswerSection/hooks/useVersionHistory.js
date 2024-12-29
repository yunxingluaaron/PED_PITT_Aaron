// components/AnswerSection/hooks/useVersionHistory.js
import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const useVersionHistory = (questionId, initialContent = '') => {
  const [versions, setVersions] = useState([]);
  const [currentVersionId, setCurrentVersionId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load versions when questionId changes
  useEffect(() => {
    const loadVersions = async () => {
      if (questionId) {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/questions/${questionId}/versions`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              }
            }
          );
          setVersions(response.data);
          setCurrentVersionId(response.data[response.data.length - 1]?.id || null);
        } catch (error) {
          console.error('Failed to load versions:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadVersions();
  }, [questionId]);

  const addVersion = useCallback(async (content, type = 'user') => {
    if (!content || !questionId) return;
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/questions/${questionId}/versions`,
        {
          content,
          type,
          timestamp: new Date().toISOString(),
          is_liked: false,
          is_bookmarked: false
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );
      
      const newVersion = response.data;
      setVersions(prev => [...prev, newVersion]);
      setCurrentVersionId(newVersion.id);
      
      // Dispatch event to notify question history to refresh
      window.dispatchEvent(new Event('questionUpdated'));
      
      return newVersion;
    } catch (error) {
      console.error('Failed to save version:', error);
      throw error;
    }
  }, [questionId]);

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
    loading,
    getCurrentVersion,
    toggleLike,
    toggleBookmark,
  };
};

export default useVersionHistory;