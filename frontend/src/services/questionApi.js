// src/services/questionApi.js

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

export const generateAnswer = async ({ message, options = {}, conversation_id = null }) => {
  const token = localStorage.getItem('auth_token');

  if (!token) {
    throw new Error('No authentication token found. Please login again.');
  }

  try {
    // Ensure message is sent in the correct format
    const requestData = {
      message: typeof message === 'string' ? message : message.message,
      options,
      conversation_id,
      response_type: 'text'
    };

    const response = await axios.post(`${API_BASE_URL}/chat`, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      withCredentials: true
    });

    return response.data;
  } catch (error) {
    console.error('API Error:', error.response || error);
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      throw new Error('Session expired. Please login again.');
    }
    throw new Error(error.response?.data?.message || 'Failed to generate answer');
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