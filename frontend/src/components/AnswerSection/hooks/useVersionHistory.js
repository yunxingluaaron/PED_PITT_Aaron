// components/AnswerSection/hooks/useVersionHistory.js
import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const useVersionHistory = (questionId, initialContent = '') => {
  const [versions, setVersions] = useState([]);
  const [currentVersionId, setCurrentVersionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const addVersion = useCallback(async (content, type = 'user') => {
    if (!content) return;
    setError(null);
    console.log('Adding version for question:', questionId);

    try {
      if (!questionId) {
        console.warn('No questionId provided, creating local version');
        const newVersion = {
          id: Date.now(),
          content,
          type,
          timestamp: new Date().toISOString(),
          is_liked: false,
          is_bookmarked: false,
          isLocal: true
        };
        setVersions(prev => [...prev, newVersion]);
        setCurrentVersionId(newVersion.id);
        return newVersion;
      }

      // Simplify the version data structure
      const versionData = {
        content,
        type,
        timestamp: new Date().toISOString(),
        is_liked: false,
        is_bookmarked: false
      };

      console.log('Sending version data:', versionData);

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
        console.log('Version saved successfully:', newVersion);

        setVersions(prev => {
          const updated = [...prev, newVersion].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
          );
          return updated;
        });
        setCurrentVersionId(newVersion.id);

        // Dispatch event to notify question history to refresh
        window.dispatchEvent(new Event('questionUpdated'));

        return newVersion;
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to save version';
      console.error('Failed to save version:', errorMessage);
      setError(errorMessage);
      // Don't throw the error, handle it gracefully
      return null;
    }
  }, [questionId]);

  // Rest of the code remains the same...

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