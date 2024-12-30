// src/services/questionApi.js

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// In questionApi.js

// questionApi.js
export const generateAnswer = async ({ message, options = {}, conversation_id = null }) => {
  console.log('🚀 generateAnswer called with:', { message, options, conversation_id });
  
  // Add check for historical questions
  if (options.isHistoricalAnswer) {
    console.log('📜 Using historical answer, skipping API call');
    return {
      conversation_id: options.conversation_id,
      detailed_response: options.response,
      sources: options.source_data || [],
      metadata: options.response_metadata || {},
      isHistoricalAnswer: true
    };
  }

  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('No authentication token found. Please login again.');
  }

  try {
    const requestData = {
      message: typeof message === 'string' ? message : message.message,
      options,
      conversation_id,
      response_type: 'text'
    };

    console.log('📤 Sending request to generate new answer');
    const response = await axios.post(`${API_BASE_URL}/chat`, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      withCredentials: true
    });

    if (response.data) {
      // Only dispatch questionAdded event for new questions
      if (!options.isHistoricalAnswer) {
        window.dispatchEvent(new Event('questionAdded'));
      }
      return response.data;
    }
  } catch (error) {
    console.error('API Error:', error.response || error);
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      throw new Error('Session expired. Please login again.');
    }
    throw new Error(error.response?.data?.message || 'Failed to generate answer');
  }
};

export const getQuestionHistory = async () => {
  console.log('🔴 getQuestionHistory called');
  const token = localStorage.getItem('auth_token');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/questions`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('🔴 Question history response:', response.data);
    return response.data;
  } catch (error) {
    console.error('🔴 Failed to fetch question history:', error);
    throw error;
  }
};

export const getConversationHistory = async (conversation_id) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/conversations/${conversation_id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch conversation history');
  }
};



export const getVersionHistory = async (questionId) => {
  const token = localStorage.getItem('auth_token');
  try {
    const response = await axios.get(`${API_BASE_URL}/questions/${questionId}/versions`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch version history:', error);
    throw error;
  }
};

export const deleteQuestion = async (questionId) => {
  const token = localStorage.getItem('auth_token');
  try {
    const response = await axios.delete(`${API_BASE_URL}/questions/${questionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to delete question:', error);
    throw error;
  }
};


// questionApi.jsgenerateAnswer
export const getQuestionDetails = async (questionId) => {
  console.log('🔍 Fetching details for question:', questionId);
  const token = localStorage.getItem('auth_token');
  try {
    const response = await axios.get(`${API_BASE_URL}/questions/${questionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('📦 Received question details:', response.data);
    return response.data;
  } catch (error) {
    console.error('💥 Failed to fetch question details:', error);
    throw error;
  }
};