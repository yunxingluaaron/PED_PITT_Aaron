// src/services/versionHistoryApi.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

export const versionHistoryApi = {
  async saveVersion(questionId, versionData) {
    const response = await axios.post(
      `${API_BASE_URL}/questions/${questionId}/versions`,
      {
        ...versionData,
        persist: true  // Add flag to indicate this should be stored permanently
      },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      }
    );
    return response.data;
  },

  async getVersions(questionId) {
    const response = await axios.get(
      `${API_BASE_URL}/questions/${questionId}/versions`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      }
    );
    return response.data;
  },

  async updateVersion(questionId, versionId, updates) {
    const response = await axios.put(
      `${API_BASE_URL}/questions/${questionId}/versions/${versionId}`,
      updates,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      }
    );
    return response.data;
  },

  async deleteVersion(questionId, versionId) {
    await axios.delete(
      `${API_BASE_URL}/questions/${questionId}/versions/${versionId}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      }
    );
  }
};