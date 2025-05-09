import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const useVersionHistory = (questionId, initialContent = '') => {
  const [versions, setVersions] = useState([]);
  const [currentVersionId, setCurrentVersionId] = useState(null);
  const [loading, setLoading] = useState(false); // 初始不加载
  const [error, setError] = useState(null);
  const [lastAIVersion, setLastAIVersion] = useState(null);
  const versionCache = useRef(new Map()); // 缓存版本数据

  const loadVersions = useCallback(async (qId) => {
    if (!qId) {
      setVersions([]);
      setCurrentVersionId(null);
      setLoading(false);
      return;
    }

    // 检查缓存
    if (versionCache.current.has(qId)) {
      console.log('🔍 Loading versions from cache for question:', qId);
      const cachedVersions = versionCache.current.get(qId);
      setVersions(cachedVersions);
      const latestAIVersion = cachedVersions.find((v) => v.type === 'ai');
      setCurrentVersionId(latestAIVersion?.id || cachedVersions[0]?.id || null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('🔴 Loading versions for question:', qId);
      const response = await axios.get(
        `${API_BASE_URL}/questions/${qId}/versions`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      );

      if (response.data) {
        const sortedVersions = response.data.sort((a, b) => {
          const timeDiff = new Date(b.timestamp) - new Date(a.timestamp);
          if (timeDiff === 0) {
            return a.type === 'ai' ? -1 : 1;
          }
          return timeDiff;
        });
        setVersions(sortedVersions);
        versionCache.current.set(qId, sortedVersions); // 缓存版本
        const latestAIVersion = sortedVersions.find((v) => v.type === 'ai');
        setCurrentVersionId(latestAIVersion?.id || sortedVersions[0]?.id || null);
      }
    } catch (error) {
      console.error('Failed to load versions:', error);
      setError(error.response?.data?.error || 'Failed to load versions');
      setVersions([]);
      setCurrentVersionId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVersions(questionId);
  }, [questionId, loadVersions]);

  const addVersion = useCallback(
    async (content, type = 'user', metadata = {}) => {
      if (!content) return;
      setError(null);

      try {
        if (type === 'ai' && lastAIVersion?.content === content) {
          console.log('Preventing duplicate AI version');
          return lastAIVersion;
        }

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
            ...metadata,
          };
          setVersions((prev) =>
            [...prev, newVersion].sort((a, b) => {
              const timeDiff = new Date(b.timestamp) - new Date(a.timestamp);
              if (timeDiff === 0) {
                return a.type === 'ai' ? -1 : 1;
              }
              return timeDiff;
            })
          );
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
          ...metadata,
        };

        const response = await axios.post(
          `${API_BASE_URL}/questions/${questionId}/versions`,
          versionData,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            },
          }
        );

        if (response.data) {
          const newVersion = response.data;
          setVersions((prev) => {
            const updated = [...prev, newVersion].sort((a, b) => {
              const timeDiff = new Date(b.timestamp) - new Date(a.timestamp);
              if (timeDiff === 0) {
                return a.type === 'ai' ? -1 : 1;
              }
              return timeDiff;
            });
            versionCache.current.set(questionId, updated); // 更新缓存
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
    },
    [questionId, lastAIVersion]
  );

  const toggleLike = useCallback(
    async (versionId) => {
      if (!questionId || !versionId) return;

      try {
        const version = versions.find((v) => v.id === versionId);
        if (!version) return;

        const response = await axios.put(
          `${API_BASE_URL}/questions/${questionId}/versions/${versionId}`,
          { is_liked: !version.is_liked },
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            },
          }
        );

        const updatedVersion = response.data;
        setVersions((prev) =>
          prev.map((v) => (v.id === versionId ? updatedVersion : v))
        );
        versionCache.current.set(questionId, versions); // 更新缓存
      } catch (error) {
        console.error('Failed to toggle like:', error);
      }
    },
    [questionId, versions]
  );

  const toggleBookmark = useCallback(
    async (versionId) => {
      if (!questionId || !versionId) return;

      try {
        const version = versions.find((v) => v.id === versionId);
        if (!version) return;

        const response = await axios.put(
          `${API_BASE_URL}/questions/${questionId}/versions/${versionId}`,
          { is_bookmarked: !version.is_bookmarked },
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            },
          }
        );

        const updatedVersion = response.data;
        setVersions((prev) =>
          prev.map((v) => (v.id === versionId ? updatedVersion : v))
        );
        versionCache.current.set(questionId, versions); // 更新缓存
      } catch (error) {
        console.error('Failed to toggle bookmark:', error);
      }
    },
    [questionId, versions]
  );

  const getCurrentVersion = useCallback(() => {
    const version = versions.find((v) => v.id === currentVersionId);
    if (version) return version;
    return versions.find((v) => v.type === 'ai') || versions[0] || null;
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
    reset,
  };
};

export default useVersionHistory;